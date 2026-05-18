import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Library,
  BookOpen,
  FileText,
  Video as VideoIcon,
  Headphones,
  Link2,
  ExternalLink,
} from "lucide-react";
import type { BibliographyEntry, BibliographyKind, Cohort } from "@/lib/types";

const KIND_LABELS: Record<BibliographyKind, string> = {
  book: "ספר",
  article: "מאמר",
  video: "וידאו",
  podcast: "פודקאסט",
  other: "אחר",
};

function KindIcon({ kind, className }: { kind: BibliographyKind; className?: string }) {
  switch (kind) {
    case "book":
      return <BookOpen className={className} />;
    case "article":
      return <FileText className={className} />;
    case "video":
      return <VideoIcon className={className} />;
    case "podcast":
      return <Headphones className={className} />;
    default:
      return <Link2 className={className} />;
  }
}

export default async function BibliographyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, cohort_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/not-registered");

  if (profile.role === "admin") redirect("/admin/bibliography");

  let query = supabase
    .from("bibliography_entries")
    .select("*, cohort:cohorts(id, name, is_active, created_at)")
    .order("created_at", { ascending: false });

  if (profile.role === "candidate") {
    if (!profile.cohort_id) {
      query = query.eq("cohort_id", "00000000-0000-0000-0000-000000000000");
    } else {
      query = query.eq("cohort_id", profile.cohort_id);
    }
  } else if (profile.role === "mentor") {
    const { data: assignments } = await supabase
      .from("mentor_assignments")
      .select("venture:ventures(cohort_id)")
      .eq("mentor_id", user.id);
    const cohortIds = Array.from(
      new Set(
        (assignments || [])
          .map((a) => {
            const v = a.venture as
              | { cohort_id: string | null }
              | { cohort_id: string | null }[]
              | null;
            if (!v) return null;
            if (Array.isArray(v)) return v[0]?.cohort_id ?? null;
            return v.cohort_id ?? null;
          })
          .filter((c): c is string => !!c)
      )
    );
    if (cohortIds.length === 0) {
      query = query.eq("cohort_id", "00000000-0000-0000-0000-000000000000");
    } else {
      query = query.in("cohort_id", cohortIds);
    }
  }
  // Visitor: no extra filter; RLS lets them read all.

  const { data: entriesRaw } = await query;
  const entries = (entriesRaw || []) as (BibliographyEntry & {
    cohort: Cohort | null;
  })[];

  // Group by cohort (active first, then by created_at descending)
  type Group = {
    key: string;
    title: string;
    isActive: boolean;
    createdAt: string;
    items: typeof entries;
  };
  const groupMap = new Map<string, Group>();
  for (const e of entries) {
    const key = e.cohort?.id || e.cohort_id || "__unassigned__";
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        title: e.cohort?.name || "ללא מחזור",
        isActive: !!e.cohort?.is_active,
        createdAt: e.cohort?.created_at || "",
        items: [],
      });
    }
    groupMap.get(key)!.items.push(e);
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  const showCohortHeaders = groups.length > 1;

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-[#1a2744]/10">
            <Library className="size-5 text-[#1a2744]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2744]">ביבליוגרפיה</h1>
            <p className="text-sm text-gray-500">
              חומרי קריאה, צפייה והאזנה לחברי המחזור
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center">
            <Library className="size-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">אין פריטים בביבליוגרפיה עדיין</p>
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-3">
            {showCohortHeaders && (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#1a2744]">
                  {group.title}
                </h2>
                {group.isActive && (
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-[10px]">
                    פעיל
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  {group.items.length}
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map((entry) => (
                <Card key={entry.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      {entry.cover_url ? (
                        <img
                          src={entry.cover_url}
                          alt=""
                          className="size-16 rounded-lg object-cover shrink-0 bg-gray-50"
                        />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-lg bg-[#22c55e]/10 shrink-0">
                          <KindIcon
                            kind={entry.kind}
                            className="size-7 text-[#22c55e]"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Badge className="bg-[#1a2744]/10 text-[#1a2744] border-0 text-[10px] mb-1.5 gap-1">
                          <KindIcon kind={entry.kind} className="size-3" />
                          {KIND_LABELS[entry.kind] || entry.kind}
                        </Badge>
                        <CardTitle className="text-base text-[#1a2744] leading-snug">
                          {entry.title}
                        </CardTitle>
                        {entry.author && (
                          <CardDescription className="mt-0.5">
                            {entry.author}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {(entry.description || entry.url) && (
                    <CardContent className="space-y-3">
                      {entry.description && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {entry.description}
                        </p>
                      )}
                      {entry.url && (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#22c55e] hover:underline"
                        >
                          <ExternalLink className="size-4" />
                          פתח/י קישור
                        </a>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
