# Bulk task tracking + task file attachments — design

Date: 2026-05-17
Status: Approved (pending spec review)

## Problem

Two related gaps in the workbook tasks feature:

1. **Bulk task tracking & delete.** Admins can broadcast a task to many ventures via `/admin/tasks` (src/app/admin/tasks/page.tsx). Today each broadcast inserts independent `workbook_entries` rows — there is no link between them. As a result, admins cannot (a) see what they have already broadcast, or (b) retract a broadcast from all ventures in one action.
2. **File attachments on tasks.** Tasks are text-only. Both per-venture editors and the admin bulk creator need to attach files to a task.

## Goals

- Admins can see a list of every bulk task they have broadcast, with metadata and a current "still in N ventures" count.
- Admins can delete a bulk task, which removes it from every venture that still has it.
- Anyone editing a task (per-venture or via the admin bulk creator) can attach files to that task.
- Files broadcast by the admin are stored once (deduplicated across ventures) but visible to each venture under its own task row.

## Non-goals (YAGNI)

- Editing a bulk task after broadcast (text/metadata/files).
- Per-venture cherry-pick when deleting a bulk task (delete is all-or-nothing per broadcast).
- Backfilling `bulk_task_id` for tasks that pre-date this feature — they will not appear in the bulk-tasks registry.
- Inline previews of images/PDFs; file reordering, renaming, or versioning.

## Schema changes (one migration)

### New table: `admin_bulk_tasks`

| column | type | notes |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `task_text` | `text not null` | |
| `category` | `text` | |
| `assignee` | `text` | nullable |
| `due_date` | `date` | nullable |
| `target_count` | `int not null` | how many ventures the broadcast was originally sent to |
| `created_by` | `uuid not null references profiles(id)` | |
| `created_at` | `timestamptz not null default now()` | |

RLS: admin-only read/write (use existing `get_user_role() = 'admin'` helper).

### New column on `workbook_entries`

```
alter table workbook_entries
  add column bulk_task_id uuid null
  references admin_bulk_tasks(id) on delete set null;
create index workbook_entries_bulk_task_idx
  on workbook_entries (bulk_task_id);
```

`on delete set null` keeps per-venture rows intact if the registry row is removed by hand; the admin UI explicitly removes both together.

### New table: `workbook_task_files`

| column | type | notes |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `entry_id` | `uuid not null references workbook_entries(id) on delete cascade` | |
| `bulk_task_id` | `uuid null references admin_bulk_tasks(id) on delete set null` | identifies admin-broadcast files |
| `file_name` | `text not null` | original filename |
| `storage_path` | `text not null` | path inside the bucket |
| `mime_type` | `text` | |
| `size_bytes` | `int` | |
| `uploaded_by` | `uuid not null references profiles(id)` | |
| `created_at` | `timestamptz not null default now()` | |

Indexes: `(entry_id)`, `(bulk_task_id)`, `(storage_path)` (last one supports orphan ref-count check).

RLS: same access rules as `workbook_entries` (venture members + assigned mentors + admins). Mirror the existing policy structure in `supabase/schema.sql` (lines ~389-416).

### New storage bucket: `workbook-task-files`

- Private (no public URLs).
- All access via signed URLs (~1h expiry).
- Storage policies mirror the table RLS (venture members + assigned mentors + admins for SELECT; venture members + admins for INSERT/DELETE).

## Storage layout

- **Per-venture upload**: `venture/<venture_id>/<entry_id>/<uuid>-<filename>`
- **Bulk-admin upload**: `bulk/<bulk_task_id>/<uuid>-<filename>`

Bulk uploads store bytes once; the per-venture `workbook_task_files` rows all point at the same `storage_path`. This dedupes storage and makes admin delete clean.

### Object cleanup

Storage objects are not cleaned up by the DB — this is application logic. Whenever the app deletes a `workbook_task_files` row (or deletes a `workbook_entries` row that cascade-deletes file rows), it must:

1. Capture the set of affected `storage_path` values **before** the delete.
2. After the delete, run `select count(*) from workbook_task_files where storage_path = $1` for each.
3. If zero, remove the object from storage. Otherwise leave it (still referenced by another venture).

This applies in three places: (a) per-venture single file delete in the attachments modal, (b) per-venture row delete in `deleteRow` (workbook-client.tsx), and (c) admin bulk delete route.

## Limits

- Max **5** total files per task (a task with 3 files allows 2 more, not 5 more).
- Max **10 MB** per file.
- Any mime type allowed (consistent with `lecture-resources`).

These are enforced client-side AND in the server route (for the admin bulk path).

## Backend: server route for bulk creation

Move admin bulk creation off the client into `POST /api/admin/bulk-tasks` (server route, admin guard). The current client-side insert at src/app/admin/tasks/page.tsx is fine for tests but mixes file upload, multiple inserts, and partial-failure cleanup — the server route handles it atomically:

1. Validate admin.
2. Insert `admin_bulk_tasks` row → get `bulk_task_id`.
3. For each uploaded file: upload to `bulk/<bulk_task_id>/...`.
4. Compute next `position` per target venture (preserve current logic).
5. Insert one `workbook_entries` row per venture with `bulk_task_id` set.
6. Insert `workbook_task_files` rows: one per (venture × file), all sharing the same `storage_path`.
7. Log activity event (preserve current `/api/events` `bulk_task` event).

On failure mid-flight: best-effort rollback — delete uploaded objects, delete inserted rows. (No DB transaction since storage is involved; track inserted ids and reverse them on error.)

## Backend: server route for bulk delete

`DELETE /api/admin/bulk-tasks/[id]` (admin guard):

1. Fetch all `storage_path` values referenced by `workbook_task_files` rows where `bulk_task_id = $1`.
2. `delete from workbook_entries where bulk_task_id = $1` — cascade removes `workbook_task_files` rows.
3. For each previously-fetched `storage_path`, check ref-count; if zero, remove from storage.
4. `delete from admin_bulk_tasks where id = $1`.
5. Log activity event (`bulk_task_deleted`).

## UI changes

### Per-venture task row (src/app/workbook/workbook-client.tsx + src/lib/workbook.ts)

- Add a new `WorkbookColumnType: "files"`.
- Add `{ key: "attachments", label: "קבצים", type: "files", width: "100px" }` to the `tasks` sheet columns, placed before the `done` column.
- Cell renders a paperclip + count (e.g., `📎 2`); empty cell shows "הוסף" hint.
- Click opens a modal (reuse the modal pattern from `LongTextCell`):
  - Lists existing files with mime icon (reuse `iconForResource` pattern from src/components/lecture-resources-section.tsx), file name, size, **download** button (signed URL), and **delete** button.
  - Multi-file picker at the bottom to add more files (respects 5-file and 10 MB limits).
- File operations route through the supabase client (uploads + inserts) — same level of access the user already has on `workbook_entries`.

### Admin bulk creator form (src/app/admin/tasks/page.tsx)

- Add a "קבצים מצורפים (אופציונלי)" section above the venture picker.
- Multi-file picker; lists staged files with name, size, remove button; enforces 5/10MB limits client-side.
- Form submit calls the new `POST /api/admin/bulk-tasks` (multipart) instead of the current client-side insert. Update success/error messaging to match.

### Admin bulk-list section (new, on /admin/tasks below the form)

- "משימות שנשלחו" card listing `admin_bulk_tasks` newest-first.
- For each row show:
  - Task text (truncated to ~120 chars).
  - Category, assignee, due date, sent date.
  - "נשלח ל-N מיזמים" (from `target_count`).
  - "עדיין ב-M" (count of `workbook_entries` rows with this `bulk_task_id`).
  - Paperclip + file count (distinct files for the broadcast); click expands inline to show file names with download links.
  - Delete button (trash icon).
- Delete flow: confirmation dialog ("למחוק את המשימה מ-M המיזמים שבהם היא עדיין מופיעה? פעולה זו תמחק גם את הקבצים שצורפו."), then call the DELETE route, then refresh the list.

## Activity logging

- Per-venture file add/remove: log `workbook_updated` with `metadata.row_id` (matches existing edit semantics — no new event kind).
- Admin bulk create: keep existing `bulk_task` event; include file count in description if any.
- Admin bulk delete: new event kind `bulk_task_deleted` with description "משימה נמחקה מ-M מיזמים".

## Test plan

- Admin bulk create with 0, 1, and 5 files → registry row created, per-venture entries created, file rows created, files downloadable from each venture.
- Admin bulk delete → all per-venture entries removed; storage objects removed only when no other venture still references them.
- Per-venture user adds a file to a regular (non-bulk) task → file row created, downloadable, deletable.
- Per-venture user deletes their bulk-broadcast task → only their `workbook_task_files` rows removed; storage object remains (still referenced by other ventures).
- File size + count limits enforced on both client and server.
- RLS: venture A members cannot read venture B's `workbook_task_files` rows; non-admin cannot list `admin_bulk_tasks`.
- Old (pre-migration) tasks have `bulk_task_id = null` and continue to work; they simply don't appear in the registry.

## Open questions

None at design time. Implementation plan will resolve any micro-decisions (exact modal layout, copy text).
