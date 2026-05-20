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
    .select("role, full_name")
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
  const guideChapterId = String(form.get("guide_chapter_id") || "").trim();
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
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!ventureIds.every((id) => UUID_RE.test(id))) {
    return NextResponse.json(
      { error: "invalid venture_id" },
      { status: 400 }
    );
  }
  if (guideChapterId && !UUID_RE.test(guideChapterId)) {
    return NextResponse.json(
      { error: "invalid guide_chapter_id" },
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
    if (f.size === 0) {
      return NextResponse.json(
        { error: `file "${f.name}" is empty` },
        { status: 400 }
      );
    }
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
    try {
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
    } catch (err) {
      console.error("[bulk-tasks POST] rollback failed:", err);
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
      guide_chapter_id: guideChapterId || null,
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
  const adminName =
    (profile.full_name && profile.full_name.trim()) || "ההנהלה";
  const taskData: Record<string, unknown> = {
    task: taskText,
    category: category || "מוצר",
    creator: adminName,
    date: today,
  };
  if (assignee) taskData.assignee = assignee;
  if (dueDate) taskData.due_date = dueDate;
  // Carried per-entry so candidates (who can't read admin_bulk_tasks) get the
  // target chapter pre-selected in the "push to workbook" dialog.
  if (guideChapterId) taskData.suggestedChapterId = guideChapterId;

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
