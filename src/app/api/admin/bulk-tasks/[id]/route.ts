import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/events";

const BUCKET = "workbook-task-files";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
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

  // 1. Capture all storage paths attached to ANY entry of this bulk task
  //    (both admin-broadcast files and per-venture uploads on those entries)
  //    BEFORE the cascade-delete in step 3 removes the file rows.
  const { data: entryRows } = await supabase
    .from("workbook_entries")
    .select("id")
    .eq("bulk_task_id", id);
  const entryIds = (entryRows || []).map((r) => r.id as string);

  const { data: fileRows } =
    entryIds.length === 0
      ? { data: [] as { storage_path: string }[] }
      : await supabase
          .from("workbook_task_files")
          .select("storage_path")
          .in("entry_id", entryIds);
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
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove(orphans);
    if (storageErr) {
      console.warn(
        "[bulk-tasks DELETE] storage remove failed:",
        storageErr.message
      );
    }
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
