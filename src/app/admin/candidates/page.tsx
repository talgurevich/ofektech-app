import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Eye, Users } from "lucide-react";

export default async function AdminCandidatesPage() {
  const supabase = await createClient();

  const { data: candidates } = await supabase
    .from("profiles")
    .select("*, cohort:cohorts(name)")
    .eq("role", "candidate")
    .order("full_name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="size-6 text-[#1a2744]" />
        <h1 className="text-2xl font-bold text-[#1a2744]">חניכים</h1>
        <Badge variant="secondary">{candidates?.length || 0}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(candidates || []).map((c) => (
          <Card key={c.id} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between pt-0">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-[#22c55e]/10">
                  <Users className="size-4 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a2744]">
                    {c.full_name || "---"}
                  </p>
                  <p className="text-xs text-gray-500" dir="ltr">
                    {c.email}
                  </p>
                  {(c.cohort as { name: string } | null)?.name && (
                    <Badge
                      className="mt-1 text-[10px] bg-[#22c55e]/10 text-[#22c55e] border-0"
                    >
                      {(c.cohort as { name: string }).name}
                    </Badge>
                  )}
                </div>
              </div>
              <Link
                href={`/admin/candidates/${c.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-[#1a2744] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a2744]/90 transition-colors"
              >
                <Eye className="size-3.5" />
                צפייה
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!candidates || candidates.length === 0) && (
        <p className="text-sm text-gray-400 text-center py-8">
          אין חניכים עדיין
        </p>
      )}
    </div>
  );
}
