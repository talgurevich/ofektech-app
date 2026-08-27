import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canViewDemoDayResults } from "@/lib/demo-day-access";
import { byPitchOrder, isJudgeableVenture } from "@/lib/demo-day-ventures";
import { DemoDayResults, type ScoreRow, type ResultVenture } from "./results";

// Scores change live during the event.
export const dynamic = "force-dynamic";

export default async function AdminDemoDayJudgesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The admin layout already required role = 'admin'; this narrows it further to
  // the owner. Hiding the sidebar link is not enough on its own.
  if (!canViewDemoDayResults(user?.email)) redirect("/admin");

  // Read with the service role: demo_day_scores has RLS on and no policies, so
  // even an admin's own session cannot select from it.
  const admin = createAdminClient();

  const { data: cohort } = await admin
    .from("cohorts")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  let ventures: ResultVenture[] = [];
  let rows: ScoreRow[] = [];

  if (cohort) {
    const [{ data: ventureRows }, { data: members }, { data: scoreRows }] =
      await Promise.all([
        admin
          .from("ventures")
          .select("id, name")
          .eq("cohort_id", cohort.id)
          .order("name"),
        admin
          .from("profiles")
          .select("full_name, venture_id")
          .eq("role", "candidate")
          .not("venture_id", "is", null),
        admin
          .from("demo_day_scores")
          .select("*")
          .order("updated_at", { ascending: false }),
      ]);

    const membersByVenture = new Map<string, string[]>();
    for (const m of members ?? []) {
      if (!m.venture_id) continue;
      const arr = membersByVenture.get(m.venture_id) ?? [];
      if (m.full_name?.trim()) arr.push(m.full_name);
      membersByVenture.set(m.venture_id, arr);
    }

    ventures = (ventureRows ?? [])
      .filter((v) => isJudgeableVenture(v.name))
      .sort(byPitchOrder)
      .map((v) => ({
        id: v.id,
        name: v.name,
        members: membersByVenture.get(v.id) ?? [],
      }));

    const ventureIds = new Set(ventures.map((v) => v.id));
    rows = ((scoreRows ?? []) as ScoreRow[]).filter((r) =>
      ventureIds.has(r.venture_id)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744]">
          תוצאות שיפוט Demo Day
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {cohort ? `מחזור ${cohort.name} · ` : ""}
          {rows.length} כרטיסי ניקוד · התוצאות גלויות לך בלבד ואינן מוצגות
          למיזמים או למנטורים.
        </p>
      </div>

      {!cohort ? (
        <p className="text-sm text-gray-500">אין מחזור פעיל.</p>
      ) : (
        <DemoDayResults ventures={ventures} rows={rows} />
      )}
    </div>
  );
}
