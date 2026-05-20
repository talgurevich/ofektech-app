import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Append a task's written answer into a venture's workbook chapter.
 *
 * The read-modify-write of venture_chapter_entries.content runs here (not in
 * the browser) so two open tabs can't clobber each other. Content is always
 * appended below existing chapter text with an attribution header — never
 * overwritten. RLS still applies: the caller must be a venture member or an
 * admin, otherwise the upsert fails and we surface a 403-ish error.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { entryId?: string; chapterId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const entryId = String(body.entryId || "").trim();
  const chapterId = String(body.chapterId || "").trim();
  if (!UUID_RE.test(entryId) || !UUID_RE.test(chapterId)) {
    return NextResponse.json(
      { error: "entryId and chapterId are required" },
      { status: 400 }
    );
  }

  // 1. Load the task row (RLS ensures the caller may see it).
  const { data: entry } = await supabase
    .from("workbook_entries")
    .select("id, venture_id, sheet_key, data")
    .eq("id", entryId)
    .single();
  if (!entry) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  if (entry.sheet_key !== "tasks") {
    return NextResponse.json(
      { error: "entry is not a task" },
      { status: 400 }
    );
  }

  const data = (entry.data || {}) as Record<string, unknown>;
  const answer =
    typeof data.answer === "string" ? data.answer.trim() : "";
  if (!answer) {
    return NextResponse.json(
      { error: "המשימה אינה כוללת תשובה" },
      { status: 400 }
    );
  }
  const taskText =
    typeof data.task === "string" && data.task.trim()
      ? data.task.trim()
      : "ללא כותרת";

  // 2. Resolve the target chapter.
  const { data: chapter } = await supabase
    .from("guide_chapters")
    .select("id, title")
    .eq("id", chapterId)
    .single();
  if (!chapter) {
    return NextResponse.json({ error: "chapter not found" }, { status: 404 });
  }

  // 3. Read existing chapter content for this venture.
  const { data: existing } = await supabase
    .from("venture_chapter_entries")
    .select("content")
    .eq("venture_id", entry.venture_id)
    .eq("chapter_id", chapterId)
    .maybeSingle();
  const prevContent =
    typeof existing?.content === "string" ? existing.content : "";

  // 4. Append the answer with an attribution header.
  const today = new Date().toISOString().slice(0, 10);
  const block = `--- מתוך משימה: ${taskText} · ${today} ---\n${answer}`;
  const newContent = prevContent.trim()
    ? `${prevContent.trimEnd()}\n\n${block}`
    : block;

  const { error: upErr } = await supabase
    .from("venture_chapter_entries")
    .upsert(
      {
        venture_id: entry.venture_id,
        chapter_id: chapterId,
        content: newContent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venture_id,chapter_id" }
    );
  if (upErr) {
    // RLS rejection (e.g. a mentor) lands here too.
    return NextResponse.json({ error: upErr.message }, { status: 403 });
  }

  // 5. Record the push on the task row so the UI can show it was sent.
  const pushed = Array.isArray(data.pushedChapters)
    ? (data.pushedChapters as unknown[])
    : [];
  pushed.push({ chapterId, at: new Date().toISOString() });
  await supabase
    .from("workbook_entries")
    .update({
      data: { ...data, pushedChapters: pushed },
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  // 6. Log it to the venture activity feed (same kind as a guide edit).
  await supabase.from("venture_activity").insert({
    venture_id: entry.venture_id,
    actor_id: user.id,
    kind: "guide_updated",
    summary: `הוסיף/ה תשובת משימה לפרק "${chapter.title}" בחוברת`,
    metadata: {
      chapter_id: chapterId,
      chapter_title: chapter.title,
      source: "task",
      entry_id: entryId,
    },
  });

  return NextResponse.json({
    ok: true,
    chapterTitle: chapter.title,
    pushedChapters: pushed,
  });
}
