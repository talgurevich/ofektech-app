import { createClient } from "@/lib/supabase/server";
import { formatDate, moodLabel, goalStatusLabel } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

const MOOD_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-lime-100 text-lime-700",
  5: "bg-green-100 text-green-700",
};

const GOAL_COLORS: Record<string, string> = {
  yes: "bg-green-100 text-green-700",
  partially: "bg-yellow-100 text-yellow-700",
  no: "bg-red-100 text-red-700",
};

export default async function AdminCheckinsPage() {
  const supabase = await createClient();

  const { data: checkins } = await supabase
    .from("checkins")
    .select(
      "*, candidate:profiles!checkins_candidate_id_fkey(full_name, email)"
    )
    .order("period_start", { ascending: false })
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-6 text-[#1a2744]" />
        <h1 className="text-2xl font-bold text-[#1a2744]">צ׳ק-אין שבועי</h1>
        <Badge variant="secondary">{checkins?.length || 0}</Badge>
      </div>

      {!checkins || checkins.length === 0 ? (
        <p className="text-gray-500">אין צ׳ק-אינים עדיין</p>
      ) : (
        <div className="space-y-4">
          {checkins.map((c) => {
            const candidate = c.candidate as { full_name: string; email: string } | null;
            return (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardContent className="pt-0 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-[#22c55e]/10">
                        <ClipboardCheck className="size-3.5 text-[#22c55e]" />
                      </div>
                      <span className="font-semibold text-[#1a2744]">
                        {candidate?.full_name || candidate?.email || "—"}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatDate(c.period_start)}
                    </Badge>
                  </div>

                  {/* Ratings row */}
                  <div className="flex flex-wrap gap-3">
                    {c.mood != null && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">מצב רוח</p>
                        <Badge className={`${MOOD_COLORS[c.mood]} border-0 text-xs`}>
                          {moodLabel(c.mood)}
                        </Badge>
                      </div>
                    )}
                    {c.hours_invested != null && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">שעות השקעה</p>
                        <Badge variant="secondary" className="text-xs">{c.hours_invested}</Badge>
                      </div>
                    )}
                    {c.hours_mentoring != null && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">שעות מנטורינג</p>
                        <Badge variant="secondary" className="text-xs">{c.hours_mentoring}</Badge>
                      </div>
                    )}
                    {c.lecture_usefulness != null && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">הרצאה</p>
                        <Badge className={`${MOOD_COLORS[c.lecture_usefulness]} border-0 text-xs`}>
                          {c.lecture_usefulness}/5
                        </Badge>
                      </div>
                    )}
                    {c.mentor_usefulness != null && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">מנטורינג</p>
                        <Badge className={`${MOOD_COLORS[c.mentor_usefulness]} border-0 text-xs`}>
                          {c.mentor_usefulness}/5
                        </Badge>
                      </div>
                    )}
                    {c.hit_last_goal && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">השיג יעד</p>
                        <Badge className={`${GOAL_COLORS[c.hit_last_goal]} border-0 text-xs`}>
                          {goalStatusLabel(c.hit_last_goal)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Text fields */}
                  {(c.progress_feeling || c.key_accomplishment || c.biggest_blocker || c.goal_next_week) && (
                    <div className="space-y-2">
                      {c.key_accomplishment && (
                        <div className="bg-green-50/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">הישג מרכזי</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.key_accomplishment}</p>
                        </div>
                      )}
                      {c.biggest_blocker && (
                        <div className="bg-red-50/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">חסם עיקרי</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.biggest_blocker}</p>
                        </div>
                      )}
                      {c.progress_feeling && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">תחושת התקדמות</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.progress_feeling}</p>
                        </div>
                      )}
                      {c.goal_next_week && (
                        <div className="bg-blue-50/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">יעד לשבוע הבא</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.goal_next_week}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
