import { createClient } from "@/lib/supabase/server";
import { formatDate, moodLabel } from "@/lib/utils";
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

export default async function AdminCheckinsPage() {
  const supabase = await createClient();

  const { data: checkins } = await supabase
    .from("checkins")
    .select(
      "*, candidate:profiles!checkins_candidate_id_fkey(full_name, email)"
    )
    .eq("type", "opening")
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-6 text-[#1a2744]" />
        <h1 className="text-2xl font-bold text-[#1a2744]">שאלוני פתיחה</h1>
        <Badge variant="secondary">{checkins?.length || 0}</Badge>
      </div>

      {!checkins || checkins.length === 0 ? (
        <p className="text-gray-500">אין שאלוני פתיחה עדיין</p>
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
                      {formatDate(c.submitted_at || c.period_start)}
                    </Badge>
                  </div>

                  {/* Opening check-in fields */}
                  {c.type === "opening" && (
                    <div className="space-y-2">
                      {c.venture_name && (
                        <div className="bg-[#22c55e]/5 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">שם המיזם</p>
                          <p className="text-sm text-gray-700 font-medium">{c.venture_name}</p>
                        </div>
                      )}
                      {c.venture_stage && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">שלב המיזם</p>
                          <p className="text-sm text-gray-700">{c.venture_stage}</p>
                        </div>
                      )}
                      {c.expectations && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">ציפיות מהתוכנית</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.expectations}</p>
                        </div>
                      )}
                      {c.most_important_outcome && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">הכי חשוב לצאת עם</p>
                          <p className="text-sm text-gray-700">{c.most_important_outcome}</p>
                        </div>
                      )}
                      {c.main_goal_3m && (
                        <div className="bg-blue-50/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">יעד ל-3 חודשים</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.main_goal_3m}</p>
                        </div>
                      )}
                      {c.concerns && (
                        <div className="bg-red-50/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">חששות</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.concerns}</p>
                        </div>
                      )}
                      {c.team_notes && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">הערות לצוות</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.team_notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {c.mood != null && (
                    <div className="flex flex-wrap gap-3">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">מצב רוח לקראת התוכנית</p>
                        <Badge className={`${MOOD_COLORS[c.mood]} border-0 text-xs`}>
                          {moodLabel(c.mood)}
                        </Badge>
                      </div>
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
