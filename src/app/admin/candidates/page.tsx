import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Eye, Briefcase } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";

export default async function AdminCandidatesPage() {
  const supabase = await createClient();

  const { data: candidates } = await supabase
    .from("profiles")
    .select("*, cohort:cohorts(name), venture:ventures(name)")
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
        {(candidates || []).map((c) => {
          const cohortName = (c.cohort as { name: string } | null)?.name;
          const ventureName = (c.venture as { name: string } | null)?.name;

          return (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="flex items-center justify-between pt-0">
                <div className="flex items-center gap-3">
                  <ProfileAvatar
                    fullName={c.full_name}
                    email={c.email}
                    avatarUrl={c.avatar_url}
                    size={36}
                    tone="green"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1a2744]">
                      {c.full_name || "---"}
                    </p>
                    <p className="text-xs text-gray-500" dir="ltr">
                      {c.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {cohortName && (
                        <Badge
                          className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] border-0"
                        >
                          {cohortName}
                        </Badge>
                      )}
                      {ventureName && (
                        <Badge
                          className="text-[10px] bg-[#1a2744]/10 text-[#1a2744] border-0 gap-0.5"
                        >
                          <Briefcase className="size-2.5" />
                          {ventureName}
                        </Badge>
                      )}
                    </div>
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
          );
        })}
      </div>

      {(!candidates || candidates.length === 0) && (
        <p className="text-sm text-gray-400 text-center py-8">
          אין חניכים עדיין
        </p>
      )}
    </div>
  );
}
