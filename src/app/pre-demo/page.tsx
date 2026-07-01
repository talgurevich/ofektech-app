import { createClient } from "@/lib/supabase/server";
import { PreDemoFeedbackForm } from "./form";

export const metadata = {
  title: "משוב יום חזרה גנרלית — OfekTech",
  description: "מלאו משוב מובנה לוונצ'ר שאתם צופים בו",
};

export type VentureWithMembers = {
  id: string;
  name: string;
  members: string[];
};

export default async function PreDemoFeedbackPage() {
  const supabase = await createClient();

  const [{ data: ventures }, { data: members }] = await Promise.all([
    supabase.from("ventures").select("id, name").order("name"),
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

  const withMembers: VentureWithMembers[] = (ventures ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    members: membersByVenture.get(v.id) ?? [],
  }));

  return (
    <main className="min-h-screen bg-[#f4f6f9] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1a2744] mb-2">
            משוב יום חזרה גנרלית
          </h1>
          <p className="text-sm text-gray-600">
            בחרו את הוונצ'ר שצפיתם בו והשאירו משוב מובנה. המשוב יעזור לצוות
            להתכונן טוב יותר ליום ההדגמה.
          </p>
        </header>

        <PreDemoFeedbackForm ventures={withMembers} />
      </div>
    </main>
  );
}
