import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  PreDemoFeedbackVentureCard,
  type PreDemoFeedbackRow,
} from "@/components/pre-demo-feedback-venture-card";

export const metadata = {
  title: "משוב פרה-דמו — OfekTech",
};

export default async function PreDemoFeedbackViewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, venture_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/not-registered");

  if (profile.role === "admin") redirect("/admin/pre-demo-feedback");

  let ventureIds: string[] = [];
  if (profile.role === "candidate") {
    if (profile.venture_id) ventureIds = [profile.venture_id];
  } else if (profile.role === "mentor") {
    const { data: assignments } = await supabase
      .from("mentor_assignments")
      .select("venture_id")
      .eq("mentor_id", profile.id);
    ventureIds = (assignments ?? [])
      .map((a) => a.venture_id as string)
      .filter(Boolean);
  } else {
    redirect("/");
  }

  if (ventureIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[#1a2744]">משוב פרה-דמו</h1>
        <p className="text-sm text-gray-600">
          אין מיזם משויך להצגת משובים.
        </p>
      </div>
    );
  }

  const [{ data: rowsRaw }, { data: ventures }] = await Promise.all([
    supabase
      .from("pre_demo_feedback")
      .select("*")
      .in("venture_id", ventureIds)
      .order("created_at", { ascending: false }),
    supabase.from("ventures").select("id, name").in("id", ventureIds),
  ]);

  const rows = (rowsRaw ?? []) as PreDemoFeedbackRow[];
  const byVenture = new Map<string, PreDemoFeedbackRow[]>();
  for (const r of rows) {
    const arr = byVenture.get(r.venture_id) ?? [];
    arr.push(r);
    byVenture.set(r.venture_id, arr);
  }

  const ventureList = (ventures ?? []).sort((a, b) => {
    const ca = byVenture.get(a.id)?.length ?? 0;
    const cb = byVenture.get(b.id)?.length ?? 0;
    return cb - ca;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744]">משוב פרה-דמו</h1>
        <p className="text-sm text-gray-600 mt-1">
          {profile.role === "mentor"
            ? "משובים שנאספו על המיזמים המשויכים אליך"
            : "משובים שנאספו על המיזם שלך"}{" "}
          ({rows.length} סה"כ)
        </p>
      </div>

      <div className="space-y-6">
        {ventureList.map((v) => (
          <PreDemoFeedbackVentureCard
            key={v.id}
            ventureName={v.name}
            items={byVenture.get(v.id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
