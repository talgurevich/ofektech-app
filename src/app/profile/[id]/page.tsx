import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatRelativeHe } from "@/lib/utils";
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
  Phone,
  Mail,
  Linkedin,
  Briefcase,
  GraduationCap,
  Sparkles,
  ExternalLink,
  MessageCircle,
  ImageIcon,
} from "lucide-react";

function roleLabel(role: string | null | undefined): string {
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

function roleBadgeClass(role: string | null | undefined): string {
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

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Send the user back to the editor for their own profile.
  if (user.id === id) redirect("/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, avatar_url, phone, motto, bio, linkedin_url, venture_role, company, expertise, cohort:cohorts(name), venture:ventures(name)"
    )
    .eq("id", id)
    .single();

  if (!profile) notFound();

  function pickName(rel: unknown): string | null {
    if (!rel) return null;
    if (Array.isArray(rel)) {
      const first = rel[0] as { name?: string } | undefined;
      return first?.name ?? null;
    }
    return (rel as { name?: string }).name ?? null;
  }
  const cohortName = pickName(profile.cohort);
  const ventureName = pickName(profile.venture);

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, body, created_at, kind, image_url")
    .eq("author_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const fullName = profile.full_name?.trim() || profile.email || "משתמש";

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors"
        >
          <ArrowRight className="size-4" />
          חזרה לפיד הקהילה
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <ProfileAvatar
          fullName={profile.full_name}
          email={profile.email}
          avatarUrl={profile.avatar_url}
          size={104}
        />
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">{fullName}</h1>
          <div className="mt-1 flex items-center justify-center gap-2 flex-wrap">
            {profile.role && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadgeClass(profile.role)}`}
              >
                {roleLabel(profile.role)}
              </span>
            )}
            {ventureName && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Briefcase className="size-3" />
                {ventureName}
                {profile.venture_role ? ` — ${profile.venture_role}` : ""}
              </Badge>
            )}
            {cohortName && (
              <Badge variant="secondary" className="text-xs gap-1">
                <GraduationCap className="size-3" />
                {cohortName}
              </Badge>
            )}
          </div>
          {profile.motto && (
            <p className="mt-3 text-sm italic text-gray-600">
              “{profile.motto}”
            </p>
          )}
        </div>
      </div>

      {profile.bio && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
              <Sparkles className="size-4" />
              קצת עליי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {profile.role === "mentor" && (profile.company || profile.expertise) && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
              <Briefcase className="size-4" />
              רקע מקצועי
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {profile.company && (
              <p>
                <span className="text-gray-500">חברה / ארגון: </span>
                <span className="text-[#1a2744] font-medium">
                  {profile.company}
                </span>
              </p>
            )}
            {profile.expertise && (
              <p>
                <span className="text-gray-500">תחום מומחיות: </span>
                <span className="text-[#1a2744] font-medium">
                  {profile.expertise}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
            <Mail className="size-4" />
            יצירת קשר
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              dir="ltr"
              className="flex items-center gap-2 text-gray-700 hover:text-[#22c55e] transition-colors"
            >
              <Mail className="size-3.5 shrink-0 text-gray-400" />
              {profile.email}
            </a>
          )}
          {profile.phone && (
            <a
              href={`tel:${profile.phone.replace(/[^0-9+]/g, "")}`}
              dir="ltr"
              className="flex items-center gap-2 text-gray-700 hover:text-[#22c55e] transition-colors"
            >
              <Phone className="size-3.5 shrink-0 text-gray-400" />
              {profile.phone}
            </a>
          )}
          {profile.linkedin_url && (
            <a
              href={
                profile.linkedin_url.startsWith("http")
                  ? profile.linkedin_url
                  : `https://${profile.linkedin_url}`
              }
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="flex items-center gap-2 text-gray-700 hover:text-[#22c55e] transition-colors"
            >
              <Linkedin className="size-3.5 shrink-0 text-gray-400" />
              {profile.linkedin_url}
              <ExternalLink className="size-3 text-gray-300" />
            </a>
          )}
          {!profile.email && !profile.phone && !profile.linkedin_url && (
            <p className="text-sm text-gray-400">אין פרטי קשר זמינים</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
            <MessageCircle className="size-4" />
            פוסטים אחרונים בפיד
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentPosts || recentPosts.length === 0 ? (
            <p className="text-sm text-gray-400">אין פוסטים עדיין</p>
          ) : (
            <ul className="space-y-3">
              {recentPosts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/feed#post-${p.id}`}
                    className="block rounded-lg border border-gray-100 bg-gray-50/40 px-3 py-2 hover:bg-[#22c55e]/5 hover:border-[#22c55e]/40 transition-colors"
                  >
                    <p
                      className={`text-sm leading-relaxed ${
                        p.kind === "system"
                          ? "italic text-gray-600"
                          : "text-[#1a2744]"
                      }`}
                    >
                      {p.body}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                      <span>{formatRelativeHe(p.created_at)}</span>
                      {p.image_url && (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="size-3" /> תמונה
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
