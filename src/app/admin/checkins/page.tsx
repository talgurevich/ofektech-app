import { createClient } from "@/lib/supabase/server";
import { formatDate, moodLabel, goalStatusLabel } from "@/lib/utils";

export default async function AdminCheckinsPage() {
  const supabase = await createClient();

  const { data: checkins } = await supabase
    .from("weekly_checkins")
    .select(
      "*, candidate:profiles!weekly_checkins_candidate_id_fkey(full_name, email)"
    )
    .order("week_start", { ascending: false })
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">צ׳ק-אין שבועי</h1>

      {!checkins || checkins.length === 0 ? (
        <p className="text-gray-500">אין צ׳ק-אינים עדיין</p>
      ) : (
        <div className="space-y-4">
          {checkins.map((c) => {
            const candidate = c.candidate as { full_name: string; email: string } | null;
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl shadow-sm border p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold">
                    {candidate?.full_name || candidate?.email || "—"}
                  </span>
                  <span className="text-sm text-gray-500">
                    שבוע של {formatDate(c.week_start)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">שעות השקעה</p>
                    <p className="font-medium">{c.hours_invested ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">שעות מנטורינג</p>
                    <p className="font-medium">{c.hours_mentoring ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">מצב רוח</p>
                    <p className="font-medium">
                      {c.mood ? `${c.mood}/5 (${moodLabel(c.mood)})` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">שימושיות הרצאה</p>
                    <p className="font-medium">
                      {c.lecture_usefulness ? `${c.lecture_usefulness}/5` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">שימושיות מנטורינג</p>
                    <p className="font-medium">
                      {c.mentor_usefulness ? `${c.mentor_usefulness}/5` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">השיג יעד קודם</p>
                    <p className="font-medium">
                      {c.hit_last_goal
                        ? goalStatusLabel(c.hit_last_goal)
                        : "—"}
                    </p>
                  </div>
                </div>

                {(c.progress_feeling ||
                  c.key_accomplishment ||
                  c.biggest_blocker ||
                  c.goal_next_week) && (
                  <div className="mt-4 space-y-3 text-sm">
                    {c.progress_feeling && (
                      <div>
                        <p className="text-gray-500">תחושת התקדמות</p>
                        <p className="whitespace-pre-wrap">
                          {c.progress_feeling}
                        </p>
                      </div>
                    )}
                    {c.key_accomplishment && (
                      <div>
                        <p className="text-gray-500">הישג מרכזי</p>
                        <p className="whitespace-pre-wrap">
                          {c.key_accomplishment}
                        </p>
                      </div>
                    )}
                    {c.biggest_blocker && (
                      <div>
                        <p className="text-gray-500">חסם עיקרי</p>
                        <p className="whitespace-pre-wrap">
                          {c.biggest_blocker}
                        </p>
                      </div>
                    )}
                    {c.goal_next_week && (
                      <div>
                        <p className="text-gray-500">יעד לשבוע הבא</p>
                        <p className="whitespace-pre-wrap">
                          {c.goal_next_week}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
