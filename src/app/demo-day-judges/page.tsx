import { createClient } from "@/lib/supabase/server";
import { DemoDayJudgeForm } from "./form";
import { isJudgeableVenture } from "@/lib/demo-day-ventures";

export const metadata = {
  title: "שיפוט Demo Day — OfekTech",
  description: "טופס שיפוט לפאנל השופטים של יום ההדגמה",
};

export type JudgeVenture = {
  id: string;
  name: string;
  members: string[];
};

export default async function DemoDayJudgesPage() {
  const supabase = await createClient();

  // Judges only score the current cohort's ventures.
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  let ventures: JudgeVenture[] = [];

  if (cohort) {
    const [{ data: ventureRows }, { data: members }] = await Promise.all([
      supabase
        .from("ventures")
        .select("id, name")
        .eq("cohort_id", cohort.id)
        .order("name"),
      supabase
        .from("profiles")
        .select("full_name, venture_id")
        .eq("role", "candidate")
        .not("venture_id", "is", null),
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
      .map((v) => ({
        id: v.id,
        name: v.name,
        members: membersByVenture.get(v.id) ?? [],
      }));
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1a2744] mb-2">
            שיפוט Demo Day
          </h1>
          <p className="text-sm text-gray-600">
            בחרו את המיזם שהרגע הציג, הזינו את שמכם ודרגו. אפשר לחזור למיזם
            שכבר דירגתם ולעדכן את הציון.
          </p>
        </header>

        {ventures.length === 0 ? (
          <p className="text-center text-sm text-gray-500">
            אין מיזמים במחזור הפעיל.
          </p>
        ) : (
          <DemoDayJudgeForm ventures={ventures} />
        )}
      </div>
    </main>
  );
}
