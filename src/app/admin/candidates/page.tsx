"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Cohort } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Eye, Briefcase } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";

type CandidateRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  cohort_id: string | null;
  cohort: { name: string } | null;
  venture: { name: string } | null;
};

const UNASSIGNED_KEY = "__unassigned__";

export default function AdminCandidatesPage() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [filterCohortId, setFilterCohortId] = useState<string>("");

  useEffect(() => {
    async function load() {
      const [{ data: candidateData }, { data: cohortData }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, email, full_name, avatar_url, cohort_id, cohort:cohorts(name), venture:ventures(name)"
          )
          .eq("role", "candidate")
          .order("full_name", { ascending: true }),
        supabase
          .from("cohorts")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);
      if (candidateData) setCandidates(candidateData as unknown as CandidateRow[]);
      if (cohortData) setCohorts(cohortData);
    }
    load();
  }, [supabase]);

  const visibleCandidates = filterCohortId
    ? candidates.filter((c) => (c.cohort_id || UNASSIGNED_KEY) === filterCohortId)
    : candidates;

  type CohortGroup = {
    key: string;
    title: string;
    isActive: boolean;
    candidates: CandidateRow[];
  };

  const groupedCandidates: CohortGroup[] = (() => {
    if (filterCohortId) {
      return [
        {
          key: filterCohortId,
          title: "",
          isActive: false,
          candidates: visibleCandidates,
        },
      ];
    }
    const groups = new Map<string, CohortGroup>();
    for (const c of visibleCandidates) {
      const cohort = cohorts.find((co) => co.id === c.cohort_id);
      const key = c.cohort_id || UNASSIGNED_KEY;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: cohort?.name || c.cohort?.name || "ללא מחזור",
          isActive: !!cohort?.is_active,
          candidates: [],
        });
      }
      groups.get(key)!.candidates.push(c);
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === UNASSIGNED_KEY) return 1;
      if (b.key === UNASSIGNED_KEY) return -1;
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.title.localeCompare(b.title, "he");
    });
  })();
  const showGroupHeaders = !filterCohortId && groupedCandidates.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-6 text-[#1a2744]" />
          <h1 className="text-2xl font-bold text-[#1a2744]">חניכים</h1>
          <Badge variant="secondary">{candidates.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">מחזור:</label>
          <select
            value={filterCohortId}
            onChange={(e) => setFilterCohortId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
          >
            <option value="">כל המחזורים</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? " · פעיל" : ""}
              </option>
            ))}
            <option value={UNASSIGNED_KEY}>ללא מחזור</option>
          </select>
        </div>
      </div>

      {visibleCandidates.length === 0 && candidates.length > 0 && (
        <p className="text-center text-sm text-gray-400 py-6">
          אין חניכים במחזור שנבחר
        </p>
      )}

      <div className="space-y-6">
        {groupedCandidates.map((group) => (
          <div key={group.key} className="space-y-3">
            {showGroupHeaders && (
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-[#1a2744]">
                  {group.title}
                </span>
                {group.isActive && (
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-[10px]">
                    פעיל
                  </Badge>
                )}
                <span className="text-xs text-gray-400">
                  {group.candidates.length} חניכים
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.candidates.map((c) => {
                const cohortName = c.cohort?.name;
                const ventureName = c.venture?.name;

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
          </div>
        ))}
      </div>

      {candidates.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          אין חניכים עדיין
        </p>
      )}
    </div>
  );
}
