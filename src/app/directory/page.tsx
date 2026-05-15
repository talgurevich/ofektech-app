import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  Linkedin,
  Mail,
  Phone,
  Users,
} from "lucide-react";

type Role = "candidate" | "mentor" | "admin" | "visitor";

interface DirectoryMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role | null;
  avatar_url: string | null;
  phone: string | null;
  linkedin_url: string | null;
  venture_role: string | null;
  company: string | null;
  expertise: string | null;
  cohort_id: string | null;
  venture: { id: string; name: string } | { id: string; name: string }[] | null;
  cohort: { id: string; name: string } | { id: string; name: string }[] | null;
}

function pickRel<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return (rel[0] as T) ?? null;
  return rel;
}

function roleLabel(role: Role | null): string {
  switch (role) {
    case "candidate":
      return "יזם/ת";
    case "mentor":
      return "מנטור/ית";
    case "admin":
      return "מנהל/ת";
    case "visitor":
      return "מאזין/ת";
    default:
      return "";
  }
}

function roleBadgeClass(role: Role | null): string {
  switch (role) {
    case "mentor":
      return "bg-[#1a2744]/10 text-[#1a2744]";
    case "admin":
      return "bg-amber-100 text-amber-700";
    case "visitor":
      return "bg-gray-100 text-gray-500";
    case "candidate":
    default:
      return "bg-[#22c55e]/10 text-[#22c55e]";
  }
}

export default async function DirectoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, cohort_id, venture_id")
    .eq("id", user.id)
    .single();

  if (!me) redirect("/login");

  const myRole = me.role as Role;

  if (myRole === "admin") redirect("/admin/users");
  if (myRole === "visitor") redirect("/");

  // Determine cohort scope.
  const cohortIds = new Set<string>();
  if (myRole === "candidate" && me.cohort_id) {
    cohortIds.add(me.cohort_id);
  }
  if (myRole === "mentor") {
    const { data: assignments } = await supabase
      .from("mentor_assignments")
      .select("venture:ventures(cohort_id)")
      .eq("mentor_id", user.id);
    for (const a of assignments ?? []) {
      const v = pickRel(a.venture as unknown as { cohort_id: string | null });
      if (v?.cohort_id) cohortIds.add(v.cohort_id);
    }
  }

  const cohortIdList = Array.from(cohortIds);

  // Collect members:
  // - All candidates in those cohorts.
  // - All mentors assigned to ventures in those cohorts.
  let candidates: DirectoryMember[] = [];
  let mentors: DirectoryMember[] = [];

  if (cohortIdList.length > 0) {
    const { data: candidateRows } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, avatar_url, phone, linkedin_url, venture_role, company, expertise, cohort_id, venture:ventures(id, name), cohort:cohorts(id, name)"
      )
      .eq("role", "candidate")
      .in("cohort_id", cohortIdList)
      .order("full_name", { ascending: true });
    candidates = (candidateRows ?? []) as DirectoryMember[];

    // Mentors assigned to ventures in those cohorts.
    const { data: ventureRows } = await supabase
      .from("ventures")
      .select("id")
      .in("cohort_id", cohortIdList);
    const ventureIds = (ventureRows ?? []).map((v) => v.id);

    if (ventureIds.length > 0) {
      const { data: assignmentRows } = await supabase
        .from("mentor_assignments")
        .select("mentor_id")
        .in("venture_id", ventureIds);
      const mentorIds = Array.from(
        new Set((assignmentRows ?? []).map((a) => a.mentor_id))
      );

      if (mentorIds.length > 0) {
        const { data: mentorRows } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, avatar_url, phone, linkedin_url, venture_role, company, expertise, cohort_id, venture:ventures(id, name), cohort:cohorts(id, name)"
          )
          .in("id", mentorIds)
          .order("full_name", { ascending: true });
        mentors = (mentorRows ?? []) as DirectoryMember[];
      }
    }
  }

  // Hide the viewer from their own directory.
  candidates = candidates.filter((m) => m.id !== user.id);
  mentors = mentors.filter((m) => m.id !== user.id);

  // Group candidates by cohort name when more than one cohort is in scope.
  const candidatesByCohort = new Map<string, DirectoryMember[]>();
  for (const c of candidates) {
    const name = pickRel(c.cohort)?.name ?? "ללא מחזור";
    if (!candidatesByCohort.has(name)) candidatesByCohort.set(name, []);
    candidatesByCohort.get(name)!.push(c);
  }

  const totalCount = candidates.length + mentors.length;
  const showCohortHeadings = candidatesByCohort.size > 1;

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors"
        >
          <ArrowRight className="size-4" />
          חזרה לפרופיל
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1a2744]">
            <Users className="size-6" />
            אנשי המחזור
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            רשימת חברי המחזור ופרטי קשר
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {totalCount}
        </Badge>
      </div>

      {totalCount === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-0 text-sm text-gray-500">
            עדיין אין חברים אחרים במחזור שלך.
          </CardContent>
        </Card>
      )}

      {candidates.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-[#22c55e]" />
            <h2 className="text-lg font-semibold text-[#1a2744]">יזמים</h2>
            <Badge variant="secondary">{candidates.length}</Badge>
          </div>

          {Array.from(candidatesByCohort.entries()).map(([cohortName, members]) => (
            <div key={cohortName} className="space-y-2">
              {showCohortHeadings && (
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {cohortName}
                </h3>
              )}
              {members.map((m) => (
                <MemberCard key={m.id} member={m} tone="green" />
              ))}
            </div>
          ))}
        </section>
      )}

      {mentors.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="size-5 text-[#1a2744]" />
            <h2 className="text-lg font-semibold text-[#1a2744]">מנטורים</h2>
            <Badge variant="secondary">{mentors.length}</Badge>
          </div>
          <div className="space-y-2">
            {mentors.map((m) => (
              <MemberCard key={m.id} member={m} tone="navy" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function MemberCard({
  member,
  tone,
}: {
  member: DirectoryMember;
  tone: "green" | "navy";
}) {
  const venture = pickRel(member.venture);
  const fullName = member.full_name?.trim() || member.email || "משתמש";
  const subtitle =
    member.role === "mentor"
      ? [member.company, member.expertise].filter(Boolean).join(" · ")
      : venture
        ? `${venture.name}${member.venture_role ? ` — ${member.venture_role}` : ""}`
        : "";

  const phoneHref = member.phone
    ? `tel:${member.phone.replace(/[^0-9+]/g, "")}`
    : null;
  const linkedinHref = member.linkedin_url
    ? member.linkedin_url.startsWith("http")
      ? member.linkedin_url
      : `https://${member.linkedin_url}`
    : null;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/profile/${member.id}`}
            className="flex items-center gap-3 group"
          >
            <ProfileAvatar
              fullName={member.full_name}
              email={member.email}
              avatarUrl={member.avatar_url}
              size={40}
              tone={tone}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[#1a2744] group-hover:underline">
                  {fullName}
                </p>
                {member.role && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadgeClass(member.role)}`}
                  >
                    {roleLabel(member.role)}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-0.5 text-xs text-gray-500 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 self-start sm:self-auto">
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                title={member.email}
                className="inline-flex items-center justify-center size-9 rounded-lg text-gray-500 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
              >
                <Mail className="size-4" />
              </a>
            )}
            {phoneHref && (
              <a
                href={phoneHref}
                title={member.phone ?? ""}
                className="inline-flex items-center justify-center size-9 rounded-lg text-gray-500 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
              >
                <Phone className="size-4" />
              </a>
            )}
            {linkedinHref && (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noreferrer"
                title="LinkedIn"
                className="inline-flex items-center justify-center size-9 rounded-lg text-gray-500 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
              >
                <Linkedin className="size-4" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
