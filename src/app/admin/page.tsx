import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekStart } from "@/lib/utils";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const weekStart = getCurrentWeekStart();

  const { count: totalCandidates } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "candidate");

  const { count: totalMentors } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "mentor");

  const { count: checkinsThisWeek } = await supabase
    .from("weekly_checkins")
    .select("*", { count: "exact", head: true })
    .eq("week_start", weekStart);

  const { count: totalLectures } = await supabase
    .from("lectures")
    .select("*", { count: "exact", head: true });

  const { count: totalSessions } = await supabase
    .from("mentor_sessions")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">סקירה כללית</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="מועמדים" value={totalCandidates || 0} />
        <StatCard label="מנטורים" value={totalMentors || 0} />
        <StatCard label="הרצאות" value={totalLectures || 0} />
        <StatCard label="פגישות מנטורינג" value={totalSessions || 0} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-2">צ׳ק-אין שבועי</h2>
        <p className="text-gray-600">
          {checkinsThisWeek || 0} מתוך {totalCandidates || 0} מועמדים מילאו
          השבוע
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
