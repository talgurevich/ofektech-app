import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Copy } from "lucide-react";
import {
  PreDemoFeedbackVentureCard,
  type PreDemoFeedbackRow,
} from "@/components/pre-demo-feedback-venture-card";

export default async function AdminPreDemoFeedbackPage() {
  const supabase = await createClient();

  const [{ data: rowsRaw }, { data: ventures }] = await Promise.all([
    supabase
      .from("pre_demo_feedback")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("ventures").select("id, name").order("name"),
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

  const publicUrl = "/pre-demo";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">משוב פרה-דמו</h1>
          <p className="text-sm text-gray-600 mt-1">
            משובים שנאספו דרך הקישור הפתוח ({rows.length} סה"כ)
          </p>
        </div>
        <Card className="min-w-0">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              קישור פתוח:
            </span>
            <code className="text-xs bg-gray-100 rounded px-2 py-1 truncate">
              {publicUrl}
            </code>
            <Copy className="size-4 text-gray-400" />
          </CardContent>
        </Card>
      </div>

      {ventureList.length === 0 ? (
        <p className="text-gray-500 text-sm">אין מיזמים.</p>
      ) : (
        <div className="space-y-6">
          {ventureList.map((v) => (
            <PreDemoFeedbackVentureCard
              key={v.id}
              ventureName={v.name}
              items={byVenture.get(v.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
