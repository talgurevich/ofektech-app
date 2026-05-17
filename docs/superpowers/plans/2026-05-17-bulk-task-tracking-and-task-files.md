# Bulk Task Tracking + Task File Attachments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track admin-broadcast tasks in a registry so admins can list and delete them across all ventures, and let anyone attach files to a task (per-venture editor or admin bulk creator).

**Architecture:** New `admin_bulk_tasks` registry table + nullable `bulk_task_id` FK on `workbook_entries` links per-venture rows to their broadcast. New `workbook_task_files` table + private `workbook-task-files` storage bucket stores attachments; admin-broadcast files are deduped (one object, many metadata rows). New API routes handle atomic bulk-create and bulk-delete with storage cleanup; per-venture file ops go through the supabase client. A shared `TaskFilesModal` component renders the file UI in both contexts.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + Storage + RLS), Tailwind v4, lucide-react. No test framework — verification = `npx tsc --noEmit` + `npm run lint` + manual browser smoke test.

**Spec:** `docs/superpowers/specs/2026-05-17-bulk-task-tracking-and-task-files-design.md`

---

## File map

**Create:**
- `supabase/migrate_bulk_tasks_and_task_files.sql` — schema migration (run in Supabase SQL editor)
- `src/components/task-files-modal.tsx` — shared file list/upload/delete modal
- `src/app/api/admin/bulk-tasks/route.ts` — `POST` for atomic bulk-create with file uploads
- `src/app/api/admin/bulk-tasks/[id]/route.ts` — `DELETE` for cascade-removal across ventures

**Modify:**
- `supabase/schema.sql` — append new tables and policies (keeps schema.sql in sync)
- `src/lib/types.ts` — add `AdminBulkTask` and `WorkbookTaskFile` types
- `src/lib/workbook.ts` — add `"files"` to `WorkbookColumnType` and append the attachments column to the `tasks` sheet
- `src/app/workbook/workbook-client.tsx` — render `"files"` cells via the new modal; update `deleteRow` to ref-count + remove storage objects
- `src/app/admin/tasks/page.tsx` — add file picker to the form, switch submit to the new POST route, add the broadcast-history list section with delete

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrate_bulk_tasks_and_task_files.sql`
- Modify: `supabase/schema.sql` (append to keep canonical schema in sync)

- [ ] **Step 1: Create the migration file**

Create `supabase/migrate_bulk_tasks_and_task_files.sql` with this content:

```sql
-- =========================================================================
-- Migration: admin bulk-tasks registry + task file attachments
-- Run this in the Supabase SQL Editor.
-- Also creates the private Storage bucket "workbook-task-files".
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. admin_bulk_tasks: one row per broadcast (admin -> many ventures)
-- -------------------------------------------------------------------------
create table if not exists admin_bulk_tasks (
  id uuid primary key default gen_random_uuid(),
  task_text text not null,
  category text,
  assignee text,
  due_date date,
  target_count int not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists admin_bulk_tasks_created_at_idx
  on admin_bulk_tasks (created_at desc);

alter table admin_bulk_tasks enable row level security;

drop policy if exists "Admin manages bulk tasks" on admin_bulk_tasks;
create policy "Admin manages bulk tasks"
  on admin_bulk_tasks for all using (get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 2. Link workbook_entries to their bulk-task source (nullable)
-- -------------------------------------------------------------------------
alter table workbook_entries
  add column if not exists bulk_task_id uuid null
  references admin_bulk_tasks(id) on delete set null;

create index if not exists workbook_entries_bulk_task_idx
  on workbook_entries (bulk_task_id);

-- -------------------------------------------------------------------------
-- 3. workbook_task_files: file metadata per workbook entry
-- -------------------------------------------------------------------------
create table if not exists workbook_task_files (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references workbook_entries(id) on delete cascade,
  bulk_task_id uuid null references admin_bulk_tasks(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes int,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists workbook_task_files_entry_idx
  on workbook_task_files (entry_id);
create index if not exists workbook_task_files_bulk_task_idx
  on workbook_task_files (bulk_task_id);
create index if not exists workbook_task_files_storage_path_idx
  on workbook_task_files (storage_path);

alter table workbook_task_files enable row level security;

-- RLS mirrors workbook_entries: venture members + assigned mentors + admins
drop policy if exists "Venture members and mentors read task files"
  on workbook_task_files;
create policy "Venture members and mentors read task files"
  on workbook_task_files for select using (
    get_user_role() = 'admin'
    or exists (
      select 1
      from workbook_entries we
      join profiles p on p.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and p.id = auth.uid()
    )
    or exists (
      select 1
      from workbook_entries we
      join mentor_assignments ma on ma.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and ma.mentor_id = auth.uid()
    )
  );

drop policy if exists "Venture members and mentors manage task files"
  on workbook_task_files;
create policy "Venture members and mentors manage task files"
  on workbook_task_files for all using (
    exists (
      select 1
      from workbook_entries we
      join profiles p on p.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and p.id = auth.uid()
    )
    or exists (
      select 1
      from workbook_entries we
      join mentor_assignments ma on ma.venture_id = we.venture_id
      where we.id = workbook_task_files.entry_id
        and ma.mentor_id = auth.uid()
    )
  );

drop policy if exists "Admin manages all task files" on workbook_task_files;
create policy "Admin manages all task files"
  on workbook_task_files for all using (get_user_role() = 'admin');

-- -------------------------------------------------------------------------
-- 4. Private storage bucket for task attachments
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('workbook-task-files', 'workbook-task-files', false)
  on conflict (id) do update set public = excluded.public;

-- Read: venture members, assigned mentors, admins. Path layout:
--   venture/<venture_id>/<entry_id>/<uuid>-<filename>
--   bulk/<bulk_task_id>/<uuid>-<filename>
-- We can't cheaply parse paths in policy, so we permit any authenticated
-- read on this bucket and rely on signed URLs (issued only after the
-- workbook_task_files RLS check passes) for access control in practice.
drop policy if exists "Authenticated read workbook-task-files"
  on storage.objects;
create policy "Authenticated read workbook-task-files"
  on storage.objects for select
  using (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );

drop policy if exists "Authenticated insert workbook-task-files"
  on storage.objects;
create policy "Authenticated insert workbook-task-files"
  on storage.objects for insert
  with check (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );

drop policy if exists "Authenticated update workbook-task-files"
  on storage.objects;
create policy "Authenticated update workbook-task-files"
  on storage.objects for update
  using (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );

drop policy if exists "Authenticated delete workbook-task-files"
  on storage.objects;
create policy "Authenticated delete workbook-task-files"
  on storage.objects for delete
  using (
    bucket_id = 'workbook-task-files' and auth.uid() is not null
  );
```

- [ ] **Step 2: Append the same SQL to `supabase/schema.sql`**

Open `supabase/schema.sql` and append the contents from Step 1 at the end of the file (under a comment header `-- Bulk tasks + task files (migrate_bulk_tasks_and_task_files.sql)`). This keeps the canonical schema in sync with the migration file.

- [ ] **Step 3: Run the migration in Supabase**

Open the Supabase SQL Editor for the project and paste the contents of `supabase/migrate_bulk_tasks_and_task_files.sql`. Run it. Expected: success, no errors. Confirm in the Supabase UI:
- Tables `admin_bulk_tasks` and `workbook_task_files` exist.
- `workbook_entries` now has a `bulk_task_id` column.
- A private bucket `workbook-task-files` exists.

(This is an out-of-band manual step the human operator runs — the agent should pause here for confirmation before continuing.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrate_bulk_tasks_and_task_files.sql supabase/schema.sql
git commit -m "Add bulk_tasks registry + task file attachments schema"
```

---

## Task 2: Type definitions and tasks-sheet column

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/workbook.ts`

- [ ] **Step 1: Add the new types**

Open `src/lib/types.ts`. After the `WorkbookEntry` interface (around line 215), add:

```ts
export interface AdminBulkTask {
  id: string;
  task_text: string;
  category: string | null;
  assignee: string | null;
  due_date: string | null;
  target_count: number;
  created_by: string;
  created_at: string;
}

export interface WorkbookTaskFile {
  id: string;
  entry_id: string;
  bulk_task_id: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  created_at: string;
}
```

Also extend `WorkbookEntry` to include the new column:

```ts
export interface WorkbookEntry {
  id: string;
  venture_id: string;
  sheet_key: string;
  data: Record<string, unknown>;
  position: number;
  bulk_task_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Add the `"files"` column type and the new column on the tasks sheet**

Open `src/lib/workbook.ts`. Update `WorkbookColumnType`:

```ts
export type WorkbookColumnType =
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "boolean"
  | "url"
  | "email"
  | "phone"
  | "select"
  | "select_creatable"
  | "member"
  | "files";
```

Then add the attachments column on the `tasks` sheet `columns` array, placed **before** the existing `done` column:

```ts
{ key: "attachments", label: "קבצים", type: "files", width: "100px" },
{ key: "done", label: "בוצע", type: "boolean", width: "90px" },
```

- [ ] **Step 3: Verify the project still compiles and lints**

Run from the repo root:

```bash
npx tsc --noEmit && npm run lint
```

Expected: TypeScript compiles cleanly (any error here means a downstream file is reading `WorkbookEntry` in a way the new field breaks — fix by accepting the new `bulk_task_id` field, which is nullable so should be additive). Lint passes.

It's normal for `workbook-client.tsx` to log a warning about an unknown column type `"files"` at runtime — that gets handled in Task 4. Lint should still pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/workbook.ts
git commit -m "Add AdminBulkTask, WorkbookTaskFile types and files column type"
```

---

## Task 3: TaskFilesModal component

**Files:**
- Create: `src/components/task-files-modal.tsx`

This component is the shared file UI used in both `workbook-client.tsx` (per-venture cell) and `/admin/tasks` (bulk-history file expand). It's also where the per-venture ref-count cleanup lives.

- [ ] **Step 1: Create the component file**

Create `src/components/task-files-modal.tsx` with the full content below.

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WorkbookTaskFile } from "@/lib/types";
import {
  X,
  Upload,
  Trash2,
  Loader2,
  File as FileIcon,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BUCKET = "workbook-task-files";
export const MAX_FILES_PER_TASK = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

interface Props {
  entryId: string;
  ventureId: string;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  readOnly?: boolean;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function iconForFile(mime: string | null) {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return ImageIcon;
  if (m.startsWith("video/")) return Film;
  if (m.startsWith("audio/")) return Music;
  if (m.includes("pdf") || m.includes("text")) return FileText;
  return FileIcon;
}

export function TaskFilesModal({
  entryId,
  ventureId,
  open,
  onClose,
  onCountChange,
  readOnly = false,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [files, setFiles] = useState<WorkbookTaskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("workbook_task_files")
      .select("*")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });
    const list = (data as WorkbookTaskFile[]) || [];
    setFiles(list);
    setLoading(false);
    onCountChange?.(list.length);
  }, [supabase, entryId, onCountChange]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function handleDownload(f: WorkbookTaskFile) {
    const { data, error: e } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(f.storage_path, 3600, { download: f.file_name });
    if (e || !data?.signedUrl) {
      setError(e?.message || "שגיאה בהורדה");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleUpload(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setError("");

    const candidates = Array.from(selected);
    if (files.length + candidates.length > MAX_FILES_PER_TASK) {
      setError(`מותר עד ${MAX_FILES_PER_TASK} קבצים למשימה`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const tooBig = candidates.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`הקובץ "${tooBig.name}" גדול מ-10MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("נדרשת התחברות");
      setBusy(false);
      return;
    }

    for (const file of candidates) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `venture/${ventureId}/${entryId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (upErr) {
        setError(upErr.message);
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const { error: insErr } = await supabase
        .from("workbook_task_files")
        .insert({
          entry_id: entryId,
          bulk_task_id: null,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user.id,
        });
      if (insErr) {
        // Roll back the uploaded object so we don't leak it
        await supabase.storage.from(BUCKET).remove([path]);
        setError(insErr.message);
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    await refresh();
    setBusy(false);
  }

  async function handleDelete(f: WorkbookTaskFile) {
    if (!confirm(`למחוק את הקובץ "${f.file_name}"?`)) return;
    setBusy(true);
    setError("");

    const { error: delErr } = await supabase
      .from("workbook_task_files")
      .delete()
      .eq("id", f.id);
    if (delErr) {
      setError(delErr.message);
      setBusy(false);
      return;
    }

    // Ref-count check: only remove the storage object if no other row
    // (in any venture) still references this path.
    const { count } = await supabase
      .from("workbook_task_files")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", f.storage_path);
    if ((count ?? 0) === 0) {
      await supabase.storage.from(BUCKET).remove([f.storage_path]);
    }

    await refresh();
    setBusy(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-[#1a2744]">
            קבצים מצורפים
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="סגור"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-gray-400">
              <Loader2 className="mx-auto size-5 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              אין קבצים מצורפים עדיין
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {files.map((f) => {
                const Icon = iconForFile(f.mime_type);
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Icon className="size-5 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#1a2744]">
                        {f.file_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatSize(f.size_bytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(f)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#1a2744]"
                      title="הורדה"
                    >
                      <Download className="size-4" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDelete(f)}
                        disabled={busy}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        title="מחק"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!readOnly && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]",
                  (busy || files.length >= MAX_FILES_PER_TASK) &&
                    "pointer-events-none opacity-50"
                )}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                <span>הוסף קבצים</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                  disabled={busy || files.length >= MAX_FILES_PER_TASK}
                />
              </label>
              <p className="mt-2 text-xs text-gray-400">
                עד {MAX_FILES_PER_TASK} קבצים, עד 10MB לקובץ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean compile, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/task-files-modal.tsx
git commit -m "Add TaskFilesModal for task attachments"
```

---

## Task 4: Wire `"files"` column type into workbook-client + storage cleanup on row delete

**Files:**
- Modify: `src/app/workbook/workbook-client.tsx`

- [ ] **Step 1: Import the new modal and the constant**

Open `src/app/workbook/workbook-client.tsx`. Add at the top with the other imports:

```tsx
import { TaskFilesModal } from "@/components/task-files-modal";
import { Paperclip } from "lucide-react";
```

(`Paperclip` joins the existing lucide imports — add it to that import list.)

- [ ] **Step 2: Update `deleteRow` to clean up storage objects**

Replace the existing `deleteRow` function (currently around lines 124-138) with:

```tsx
  async function deleteRow(id: string) {
    if (!confirm("למחוק את השורה הזו?")) return;
    const removed = entries.find((e) => e.id === id);

    // Capture storage paths BEFORE delete so we can ref-count them after.
    const { data: fileRows } = await supabase
      .from("workbook_task_files")
      .select("storage_path")
      .eq("entry_id", id);
    const paths = (fileRows || []).map((r) => r.storage_path as string);

    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("workbook_entries").delete().eq("id", id);

    // After cascade-delete of workbook_task_files rows, remove orphan objects.
    for (const p of paths) {
      const { count } = await supabase
        .from("workbook_task_files")
        .select("id", { count: "exact", head: true })
        .eq("storage_path", p);
      if ((count ?? 0) === 0) {
        await supabase.storage.from("workbook-task-files").remove([p]);
      }
    }

    logActivity(supabase, {
      ventureId,
      kind: "workbook_deleted",
      summary: `מחק שורה מ"${activeSheet.label}"`,
      metadata: {
        sheet_key: activeSheetKey,
        row_label: rowLabel(removed?.data, activeSheet),
      },
    });
  }
```

- [ ] **Step 3: Handle the `"files"` column in `CellEditor`**

In `CellEditor`, add a new branch **before** the existing `column.type === "boolean"` check:

```tsx
  if (column.type === "files") {
    // Files are stored in their own table, not in entry.data.
    // The cell is rendered separately via FilesCell, which knows the entry id.
    return null;
  }
```

(This guards the inline value-based path; the actual files cell renders via a dedicated path — see next step.)

- [ ] **Step 4: Render `FilesCell` instead of `CellEditor` when the column is `"files"`**

In the table-row mapping (currently around line 293-311), replace:

```tsx
                  {activeSheet.columns.map((col, idx) => (
                    <td key={col.key} className="align-top p-1.5">
                      <div className="relative">
                        {idx === 0 && isUnseen && (
                          <span
                            className="absolute -right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-white"
                            title="חדש — טרם נצפה"
                          />
                        )}
                        <CellEditor
                          column={col}
                          value={entry.data[col.key]}
                          onChange={(v) => updateCell(entry.id, col.key, v)}
                          suggestions={columnSuggestions[col.key]}
                          members={members}
                        />
                      </div>
                    </td>
                  ))}
```

with:

```tsx
                  {activeSheet.columns.map((col, idx) => (
                    <td key={col.key} className="align-top p-1.5">
                      <div className="relative">
                        {idx === 0 && isUnseen && (
                          <span
                            className="absolute -right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-white"
                            title="חדש — טרם נצפה"
                          />
                        )}
                        {col.type === "files" ? (
                          <FilesCell
                            entryId={entry.id}
                            ventureId={ventureId}
                          />
                        ) : (
                          <CellEditor
                            column={col}
                            value={entry.data[col.key]}
                            onChange={(v) => updateCell(entry.id, col.key, v)}
                            suggestions={columnSuggestions[col.key]}
                            members={members}
                          />
                        )}
                      </div>
                    </td>
                  ))}
```

- [ ] **Step 5: Add the `FilesCell` component at the bottom of the same file**

Add this function after the `LongTextCell` function:

```tsx
function FilesCell({
  entryId,
  ventureId,
}: {
  entryId: string;
  ventureId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const loadCount = useCallback(async () => {
    const { count: c } = await supabase
      .from("workbook_task_files")
      .select("id", { count: "exact", head: true })
      .eq("entry_id", entryId);
    setCount(c ?? 0);
  }, [supabase, entryId]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-white hover:border-gray-200",
          count === 0 && "text-gray-400"
        )}
        title="קבצים מצורפים"
      >
        <Paperclip className="size-3.5" />
        <span>{count ?? "…"}</span>
      </button>
      <TaskFilesModal
        entryId={entryId}
        ventureId={ventureId}
        open={open}
        onClose={() => {
          setOpen(false);
          loadCount();
        }}
        onCountChange={(c) => setCount(c)}
      />
    </>
  );
}
```

- [ ] **Step 6: Verify build + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

- [ ] **Step 7: Manual browser smoke test**

Start the dev server (if not already running):

```bash
npm run dev
```

In a browser:
1. Log in as a venture member, navigate to `/workbook`, switch to the משימות sheet.
2. Add a row (existing "הוסף שורה" button). Confirm a קבצים column appears at the right (before בוצע) showing "📎 0".
3. Click the paperclip cell — modal opens with "אין קבצים מצורפים עדיין".
4. Click "הוסף קבצים", pick a small file. Modal lists it with size; cell badge updates to "📎 1".
5. Click the download icon — file downloads (signed URL opens in a new tab).
6. Click the trash icon, confirm — file disappears from the list and the cell badge.
7. Delete the row (trash on right) — confirm row disappears (no error toast).

If any of these fail, stop and debug before continuing.

- [ ] **Step 8: Commit**

```bash
git add src/app/workbook/workbook-client.tsx
git commit -m "Render task attachments column with TaskFilesModal + clean storage on row delete"
```

---

## Task 5: Server route `POST /api/admin/bulk-tasks`

**Files:**
- Create: `src/app/api/admin/bulk-tasks/route.ts`

This route receives a multipart/form-data POST with the task fields + optional files + the list of selected venture IDs, performs all inserts and uploads, and rolls back on partial failure.

- [ ] **Step 1: Create the route file**

Create `src/app/api/admin/bulk-tasks/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "workbook-task-files";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const taskText = String(form.get("task_text") || "").trim();
  const category = String(form.get("category") || "").trim();
  const assignee = String(form.get("assignee") || "").trim();
  const dueDate = String(form.get("due_date") || "").trim();
  const ventureIdsRaw = String(form.get("venture_ids") || "").trim();
  const files = form.getAll("files").filter((v): v is File => v instanceof File);

  if (!taskText) {
    return NextResponse.json({ error: "task_text required" }, { status: 400 });
  }
  if (!ventureIdsRaw) {
    return NextResponse.json(
      { error: "venture_ids required" },
      { status: 400 }
    );
  }
  const ventureIds = ventureIdsRaw.split(",").filter(Boolean);
  if (ventureIds.length === 0) {
    return NextResponse.json(
      { error: "at least one venture_id required" },
      { status: 400 }
    );
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `up to ${MAX_FILES} files allowed` },
      { status: 400 }
    );
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `file "${f.name}" exceeds 10MB` },
        { status: 400 }
      );
    }
  }

  // Track everything we create so we can roll back on failure.
  const uploadedPaths: string[] = [];
  let bulkTaskId: string | null = null;
  const insertedEntryIds: string[] = [];

  async function rollback() {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
    }
    if (insertedEntryIds.length > 0) {
      await supabase
        .from("workbook_entries")
        .delete()
        .in("id", insertedEntryIds);
    }
    if (bulkTaskId) {
      await supabase.from("admin_bulk_tasks").delete().eq("id", bulkTaskId);
    }
  }

  // 1. Insert registry row.
  const { data: bulkRow, error: bulkErr } = await supabase
    .from("admin_bulk_tasks")
    .insert({
      task_text: taskText,
      category: category || null,
      assignee: assignee || null,
      due_date: dueDate || null,
      target_count: ventureIds.length,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (bulkErr || !bulkRow) {
    return NextResponse.json(
      { error: bulkErr?.message || "failed to insert bulk task" },
      { status: 500 }
    );
  }
  bulkTaskId = bulkRow.id as string;

  // 2. Upload files once to bulk/<id>/...
  const fileMetas: {
    storage_path: string;
    file_name: string;
    mime_type: string | null;
    size_bytes: number;
  }[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `bulk/${bulkTaskId}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (upErr) {
      await rollback();
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    uploadedPaths.push(path);
    fileMetas.push({
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    });
  }

  // 3. Compute next position per venture so new tasks land at the bottom.
  const { data: existing } = await supabase
    .from("workbook_entries")
    .select("venture_id, position")
    .eq("sheet_key", "tasks")
    .in("venture_id", ventureIds);

  const maxByVenture = new Map<string, number>();
  (existing || []).forEach((row) => {
    const cur = maxByVenture.get(row.venture_id as string) ?? -1;
    const p = row.position as number;
    if (p > cur) maxByVenture.set(row.venture_id as string, p);
  });

  // 4. Build task data payload (kept compatible with the existing sheet shape).
  const today = new Date().toISOString().slice(0, 10);
  const taskData: Record<string, unknown> = {
    task: taskText,
    category: category || "מוצר",
    date: today,
  };
  if (assignee) taskData.assignee = assignee;
  if (dueDate) taskData.due_date = dueDate;

  // 5. Insert workbook entries (one per venture).
  const entryRows = ventureIds.map((venture_id) => ({
    venture_id,
    sheet_key: "tasks",
    data: taskData,
    position: (maxByVenture.get(venture_id) ?? -1) + 1,
    created_by: user.id,
    bulk_task_id: bulkTaskId,
  }));
  const { data: insertedEntries, error: entryErr } = await supabase
    .from("workbook_entries")
    .insert(entryRows)
    .select("id, venture_id");
  if (entryErr || !insertedEntries) {
    await rollback();
    return NextResponse.json(
      { error: entryErr?.message || "failed to insert workbook entries" },
      { status: 500 }
    );
  }
  for (const e of insertedEntries) {
    insertedEntryIds.push(e.id as string);
  }

  // 6. Insert workbook_task_files rows (one per venture × file).
  if (fileMetas.length > 0) {
    const fileRows = insertedEntries.flatMap((e) =>
      fileMetas.map((m) => ({
        entry_id: e.id as string,
        bulk_task_id: bulkTaskId,
        file_name: m.file_name,
        storage_path: m.storage_path,
        mime_type: m.mime_type,
        size_bytes: m.size_bytes,
        uploaded_by: user.id,
      }))
    );
    const { error: fileErr } = await supabase
      .from("workbook_task_files")
      .insert(fileRows);
    if (fileErr) {
      await rollback();
      return NextResponse.json({ error: fileErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    bulk_task_id: bulkTaskId,
    target_count: ventureIds.length,
    file_count: fileMetas.length,
  });
}
```

- [ ] **Step 2: Verify build + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/bulk-tasks/route.ts
git commit -m "Add POST /api/admin/bulk-tasks server route with atomic rollback"
```

---

## Task 6: Server route `DELETE /api/admin/bulk-tasks/[id]`

**Files:**
- Create: `src/app/api/admin/bulk-tasks/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/admin/bulk-tasks/[id]/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/events";

const BUCKET = "workbook-task-files";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Capture all storage paths linked to this bulk task BEFORE deleting.
  const { data: fileRows } = await supabase
    .from("workbook_task_files")
    .select("storage_path")
    .eq("bulk_task_id", id);
  const paths = Array.from(
    new Set((fileRows || []).map((r) => r.storage_path as string))
  );

  // 2. Count remaining venture entries so we can report in the event.
  const { count: entriesCount } = await supabase
    .from("workbook_entries")
    .select("id", { count: "exact", head: true })
    .eq("bulk_task_id", id);

  // 3. Delete the venture entries (cascades to workbook_task_files rows).
  const { error: entryErr } = await supabase
    .from("workbook_entries")
    .delete()
    .eq("bulk_task_id", id);
  if (entryErr) {
    return NextResponse.json({ error: entryErr.message }, { status: 500 });
  }

  // 4. For each storage path, ref-count and remove the object if orphaned.
  const orphans: string[] = [];
  for (const p of paths) {
    const { count } = await supabase
      .from("workbook_task_files")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", p);
    if ((count ?? 0) === 0) orphans.push(p);
  }
  if (orphans.length > 0) {
    await supabase.storage.from(BUCKET).remove(orphans);
  }

  // 5. Delete the registry row itself.
  const { error: regErr } = await supabase
    .from("admin_bulk_tasks")
    .delete()
    .eq("id", id);
  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 500 });
  }

  // 6. Activity event.
  const actor = profile?.full_name || profile?.email || user.email || "unknown";
  await trackEvent({
    type: "bulk_task_deleted",
    actor,
    description: `משימה נמחקה מ-${entriesCount ?? 0} מיזמים${
      paths.length > 0 ? ` (כולל ${paths.length} קבצים)` : ""
    }`,
  });

  return NextResponse.json({
    deleted_entries: entriesCount ?? 0,
    removed_objects: orphans.length,
  });
}
```

- [ ] **Step 2: Verify build + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/bulk-tasks/[id]/route.ts
git commit -m "Add DELETE /api/admin/bulk-tasks/[id] with ref-counted storage cleanup"
```

---

## Task 7: Wire admin bulk form to the new POST route + add file picker

**Files:**
- Modify: `src/app/admin/tasks/page.tsx`

- [ ] **Step 1: Add file picker state and the picker UI**

Open `src/app/admin/tasks/page.tsx`. Add to the imports:

```tsx
import { Paperclip, Trash2 } from "lucide-react";
```

(Add to the existing lucide-react import; keep the other icons.)

Add state declarations alongside the existing ones (near line 25-31):

```tsx
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const MAX_FILES = 5;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
```

- [ ] **Step 2: Add file-picker UI block above the venture picker**

Inside the form (inside `<form onSubmit={handleSubmit}>`), insert this block **above** the existing `<div>` that contains the "בחירת מיזמים" label (currently around line 228):

```tsx
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Paperclip className="size-4" />
                קבצים מצורפים (אופציונלי)
              </label>
              {fileError && (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {fileError}
                </div>
              )}
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:border-[#22c55e] hover:text-[#22c55e] ${
                  stagedFiles.length >= MAX_FILES
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                <Plus className="size-4" />
                <span>הוסף קבצים</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    setFileError("");
                    const picked = Array.from(e.target.files || []);
                    if (stagedFiles.length + picked.length > MAX_FILES) {
                      setFileError(`מותר עד ${MAX_FILES} קבצים`);
                      e.target.value = "";
                      return;
                    }
                    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
                    if (tooBig) {
                      setFileError(`הקובץ "${tooBig.name}" גדול מ-10MB`);
                      e.target.value = "";
                      return;
                    }
                    setStagedFiles((prev) => [...prev, ...picked]);
                    e.target.value = "";
                  }}
                />
              </label>
              {stagedFiles.length > 0 && (
                <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {stagedFiles.map((f, idx) => (
                    <li
                      key={`${f.name}-${idx}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700"
                    >
                      <Paperclip className="size-3.5 text-gray-400" />
                      <span className="flex-1 min-w-0 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">
                        {f.size < 1024 * 1024
                          ? `${(f.size / 1024).toFixed(0)} KB`
                          : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setStagedFiles((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="הסר"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-gray-400">
                עד {MAX_FILES} קבצים, עד 10MB לקובץ
              </p>
            </div>
```

- [ ] **Step 3: Replace `handleSubmit` to call the new route**

Replace the entire `handleSubmit` function (currently lines 60-135) with:

```tsx
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskText.trim() || selected.size === 0) return;
    setSubmitting(true);
    setMessage("");

    const fd = new FormData();
    fd.append("task_text", taskText.trim());
    fd.append("category", category);
    if (assignee.trim()) fd.append("assignee", assignee.trim());
    if (dueDate) fd.append("due_date", dueDate);
    fd.append("venture_ids", Array.from(selected).join(","));
    for (const f of stagedFiles) fd.append("files", f, f.name);

    const res = await fetch("/api/admin/bulk-tasks", {
      method: "POST",
      body: fd,
    });
    const body = (await res.json()) as
      | { bulk_task_id: string; target_count: number; file_count: number }
      | { error: string };

    if (!res.ok || "error" in body) {
      const errMsg = "error" in body ? body.error : `HTTP ${res.status}`;
      setMessage(`שגיאה: ${errMsg}`);
      setSubmitting(false);
      return;
    }

    setMessage(
      `המשימה נוספה ל־${body.target_count} מיזמים${
        body.file_count > 0 ? ` (כולל ${body.file_count} קבצים)` : ""
      }`
    );

    const preview = taskText.trim().slice(0, 120);
    const ventureNames = ventures
      .filter((v) => selected.has(v.id))
      .map((v) => v.name)
      .slice(0, 4)
      .join(", ");
    const more =
      body.target_count > 4 ? ` ועוד ${body.target_count - 4}` : "";
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bulk_task",
        description: `משימה נוספה ל־${body.target_count} מיזמים (${ventureNames}${more}): "${preview}"${
          body.file_count > 0 ? ` [${body.file_count} קבצים]` : ""
        }`,
      }),
    });

    setTaskText("");
    setAssignee("");
    setDueDate("");
    setSelected(new Set());
    setStagedFiles([]);
    setSubmitting(false);
    // Bump a refresh signal for the history list (added in Task 8)
    setHistoryRefreshKey((k) => k + 1);
  }
```

- [ ] **Step 4: Add the history refresh state (used by both this submit and Task 8)**

Add this state declaration next to the others (around line 31):

```tsx
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
```

- [ ] **Step 5: Verify build + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. The `historyRefreshKey` may show as unused — that's fine, Task 8 consumes it.

- [ ] **Step 6: Manual smoke test**

In the browser, log in as admin, go to `/admin/tasks`:
1. Fill in a task description, pick a category, select 1-2 ventures.
2. Add 1-2 small files via the new picker; confirm they appear in the staged list and can be removed via trash.
3. Submit → success message mentions file count.
4. Open one of the target ventures' workbook → confirm a new task row exists with paperclip count > 0; open the modal → confirm files are listed and downloadable.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/tasks/page.tsx
git commit -m "Wire admin bulk task form to new POST route with file uploads"
```

---

## Task 8: Add the broadcast-history list with delete

**Files:**
- Modify: `src/app/admin/tasks/page.tsx`

- [ ] **Step 1: Add imports and types at the top**

Open `src/app/admin/tasks/page.tsx`. Add to imports:

```tsx
import { Trash2 as TrashIcon, History } from "lucide-react";
import type { AdminBulkTask } from "@/lib/types";
```

(If `Trash2` is already imported from Task 7, just add `History`; rename the local reference below to whichever symbol you imported.)

- [ ] **Step 2: Add the history-list component at the bottom of the same file**

Append after the existing `AdminBulkTasksPage` function:

```tsx
type BulkTaskRow = AdminBulkTask & {
  current_count: number;
  file_count: number;
};

function BulkTaskHistory({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<BulkTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<
    { id: string; file_name: string; storage_path: string; size_bytes: number | null }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: bulk } = await supabase
      .from("admin_bulk_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (bulk as AdminBulkTask[]) || [];

    // For each bulk task, fetch current entry count and distinct file count.
    const enriched: BulkTaskRow[] = await Promise.all(
      list.map(async (b) => {
        const { count: cur } = await supabase
          .from("workbook_entries")
          .select("id", { count: "exact", head: true })
          .eq("bulk_task_id", b.id);
        const { data: files } = await supabase
          .from("workbook_task_files")
          .select("storage_path")
          .eq("bulk_task_id", b.id);
        const distinctFiles = new Set(
          (files || []).map((r) => r.storage_path as string)
        );
        return {
          ...b,
          current_count: cur ?? 0,
          file_count: distinctFiles.size,
        };
      })
    );
    setRows(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function toggleFiles(b: BulkTaskRow) {
    if (expandedId === b.id) {
      setExpandedId(null);
      setExpandedFiles([]);
      return;
    }
    setExpandedId(b.id);
    setExpandedFiles([]);
    const { data } = await supabase
      .from("workbook_task_files")
      .select("id, file_name, storage_path, size_bytes")
      .eq("bulk_task_id", b.id);
    // Dedupe by storage_path (same file across many ventures shows once)
    const seen = new Set<string>();
    const unique = (data || [])
      .filter((r) => {
        const p = r.storage_path as string;
        if (seen.has(p)) return false;
        seen.add(p);
        return true;
      })
      .map((r) => ({
        id: r.id as string,
        file_name: r.file_name as string,
        storage_path: r.storage_path as string,
        size_bytes: (r.size_bytes as number | null) ?? null,
      }));
    setExpandedFiles(unique);
  }

  async function downloadFile(path: string, name: string) {
    const { data } = await supabase.storage
      .from("workbook-task-files")
      .createSignedUrl(path, 3600, { download: name });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(b: BulkTaskRow) {
    const confirmMsg =
      b.current_count > 0
        ? `למחוק את המשימה מ-${b.current_count} המיזמים שבהם היא עדיין מופיעה? פעולה זו תמחק גם את הקבצים שצורפו.`
        : `למחוק את הרשומה מההיסטוריה? (המשימה כבר אינה קיימת באף מיזם)`;
    if (!confirm(confirmMsg)) return;
    setBusyId(b.id);
    const res = await fetch(`/api/admin/bulk-tasks/${b.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(`שגיאה: ${body?.error || res.status}`);
      return;
    }
    await load();
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
          <History className="size-4" />
          משימות שנשלחו
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center text-gray-400">
            <Loader2 className="mx-auto size-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            עדיין לא נשלחו משימות בקבוצה
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((b) => (
              <li key={b.id} className="py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a2744] line-clamp-2">
                      {b.task_text}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      {b.category && <span>קטגוריה: {b.category}</span>}
                      {b.assignee && <span>אחראי: {b.assignee}</span>}
                      {b.due_date && <span>יעד: {b.due_date}</span>}
                      <span>
                        נשלח: {new Date(b.created_at).toLocaleDateString("he-IL")}
                      </span>
                      <span>
                        נשלח ל-{b.target_count} · עדיין ב-{b.current_count}
                      </span>
                      {b.file_count > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleFiles(b)}
                          className="inline-flex items-center gap-1 text-[#22c55e] hover:underline"
                        >
                          <Paperclip className="size-3" />
                          {b.file_count}
                        </button>
                      )}
                    </div>
                    {expandedId === b.id && expandedFiles.length > 0 && (
                      <ul className="mt-2 rounded-md border border-gray-100 bg-gray-50/60 p-2 text-xs text-gray-600">
                        {expandedFiles.map((f) => (
                          <li
                            key={f.id}
                            className="flex items-center gap-2 py-1"
                          >
                            <Paperclip className="size-3 text-gray-400" />
                            <span className="flex-1 min-w-0 truncate">
                              {f.file_name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                downloadFile(f.storage_path, f.file_name)
                              }
                              className="text-[#22c55e] hover:underline"
                            >
                              הורדה
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    disabled={busyId === b.id}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    title="מחק משימה מכל המיזמים"
                  >
                    {busyId === b.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <TrashIcon className="size-4" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Render the history section in `AdminBulkTasksPage`**

Inside the page component's returned JSX, **after** the closing `</Card>` of the "פרטי המשימה" card (currently around line 297), insert:

```tsx
      <BulkTaskHistory refreshKey={historyRefreshKey} />
```

- [ ] **Step 4: Add the `useCallback` import if missing**

The `BulkTaskHistory` component uses `useCallback`. If the existing import at the top of `src/app/admin/tasks/page.tsx` is `import { useEffect, useMemo, useState } from "react";`, change it to:

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
```

- [ ] **Step 5: Verify build + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

- [ ] **Step 6: Manual end-to-end smoke test**

In the browser as admin, on `/admin/tasks`:

1. **Empty state:** Before broadcasting anything in this dev session, scroll to "משימות שנשלחו" — confirm it shows the empty-state message (or existing pre-test rows if any).
2. **Broadcast with files:** Fill the form, attach 2 files, select 2 ventures, submit. The history section should refresh and the new entry should appear at the top with "נשלח ל-2 · עדיין ב-2" and a "📎 2" expandable link.
3. **Expand files:** Click the paperclip count — file names appear with download links. Click a download — file opens/saves.
4. **Per-venture check:** Open one of the two ventures' workbook → confirm the task appears with the same files attached.
5. **Delete:** Back on `/admin/tasks`, click the trash on the new history row. Confirm dialog mentions "מ-2 המיזמים". Confirm → row disappears from the history list. Revisit the venture workbook → task is gone.
6. **Orphan handling:** Broadcast another file, manually go into one venture's workbook and delete that task row. Refresh `/admin/tasks` — count should show "עדיין ב-1". Delete the bulk task → storage object is removed (no errors).

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/tasks/page.tsx
git commit -m "Add bulk task broadcast history list with delete"
```

---

## Self-review (already applied)

- **Spec coverage:** schema (Task 1), types/column-type (Task 2), shared modal (Task 3), per-venture cell + row-delete cleanup (Task 4), POST route with rollback (Task 5), DELETE route with ref-counted cleanup (Task 6), form file picker + new submit path (Task 7), history list with file expand + delete (Task 8). All "Goals" and "UI changes" entries in the spec are covered. Non-goals (editing a bulk task, cherry-pick delete, backfill, inline previews) are intentionally not addressed — matches spec.
- **Placeholder scan:** No TBDs/TODOs. Each step shows complete code or the exact command.
- **Type/symbol consistency:** `BUCKET = "workbook-task-files"` used identically across modal, both API routes, and workbook-client. `bulk_task_id` is consistently named in the schema, types, and queries. `WorkbookEntry` is extended in `src/lib/types.ts` (Task 2) before the field is queried (Tasks 5, 7).
