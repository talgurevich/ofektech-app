import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import {
  CLARITY_COLORS,
  clarityLabel,
  pilotLabel,
  prototypeLabel,
} from "@/lib/ending-checkin";

export default async function AdminEndingCheckinsPage() {
  const supabase = await createClient();

  const { data: checkins } = await supabase
    .from("checkins")
    .select(
      "*, candidate:profiles!checkins_candidate_id_fkey(full_name, email, venture:ventures(name))"
    )
    .eq("type", "ending")
    .order("submitted_at", { ascending: false });

  const rows = checkins || [];
  const withPrototype = rows.filter((c) => c.has_prototype && c.has_prototype !== "no").length;
  const withPilot = rows.filter((c) => c.pilot_status === "yes_pilot").length;
  const clarityValues = rows.map((c) => c.value_prop_clarity).filter((v): v is number => v != null);
  const avgClarity = clarityValues.length
    ? (clarityValues.reduce((a, b) => a + b, 0) / clarityValues.length).toFixed(1)
    : null;
  const totalCustomers = rows.reduce((sum, c) => sum + (c.customers_spoken ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-6 text-[#1a2744]" />
        <h1 className="text-2xl font-bold text-[#1a2744]">שאלוני סיכום</h1>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-500">אין שאלוני סיכום עדיין</p>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "יש מוצר / אב-טיפוס", value: `${withPrototype}/${rows.length}` },
              { label: "הגיעו לפיילוט", value: `${withPilot}/${rows.length}` },
              { label: "סה״כ שיחות עם לקוחות", value: totalCustomers },
              { label: "בהירות הצעת ערך (ממוצע)", value: avgClarity ? `${avgClarity}/5` : "—" },
            ].map((s) => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="pt-0">
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold text-[#1a2744]">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            {rows.map((c) => {
              const candidate = c.candidate as {
                full_name: string;
                email: string;
                venture: { name: string } | { name: string }[] | null;
              } | null;
              const venture = Array.isArray(candidate?.venture)
                ? candidate?.venture[0]
                : candidate?.venture;
              return (
                <Card key={c.id} className="border-0 shadow-sm">
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-[#22c55e]/10">
                          <ClipboardCheck className="size-3.5 text-[#22c55e]" />
                        </div>
                        <div>
                          <span className="font-semibold text-[#1a2744]">
                            {candidate?.full_name || candidate?.email || "—"}
                          </span>
                          {venture?.name && (
                            <span className="text-xs text-gray-500 mr-2">· {venture.name}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {formatDate(c.submitted_at || c.period_start)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-[#22c55e]/5 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">מוצר / אב-טיפוס להצגה</p>
                        <p className="text-sm text-gray-700 font-medium">{prototypeLabel(c.has_prototype) || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">שיחות עם לקוחות / משתמשים</p>
                        <p className="text-sm text-gray-700 font-medium">{c.customers_spoken ?? "—"}</p>
                      </div>
                      <div className="bg-blue-50/50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">פיילוט בשטח</p>
                        <p className="text-sm text-gray-700 font-medium">{pilotLabel(c.pilot_status) || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">בהירות הצעת הערך והבידול</p>
                        {c.value_prop_clarity != null ? (
                          <Badge className={`${CLARITY_COLORS[c.value_prop_clarity]} border-0 text-xs`}>
                            {c.value_prop_clarity}/5 · {clarityLabel(c.value_prop_clarity)}
                          </Badge>
                        ) : (
                          <p className="text-sm text-gray-700">—</p>
                        )}
                      </div>
                    </div>

                    {c.team_notes && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">הערות לצוות</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.team_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
