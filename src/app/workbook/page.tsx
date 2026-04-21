import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkbookClient } from "./workbook-client";
import { WORKBOOK_SHEETS } from "@/lib/workbook";

export default async function WorkbookPage({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string; venture?: string }>;
}) {
  const { sheet, venture: ventureParam } = await searchParams;
  const initialSheet = WORKBOOK_SHEETS.some((s) => s.key === sheet)
    ? sheet
    : WORKBOOK_SHEETS[0].key;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, venture_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  let resolvedVentureId: string | null = null;

  if (profile.role === "mentor") {
    if (!ventureParam) redirect("/");
    const { data: assignment } = await supabase
      .from("mentor_assignments")
      .select("id")
      .eq("mentor_id", user.id)
      .eq("venture_id", ventureParam)
      .maybeSingle();
    if (!assignment) redirect("/");
    resolvedVentureId = ventureParam;
  } else if (profile.role === "candidate" || profile.role === "admin") {
    // Admins can view any venture via ?venture=; candidates use their own.
    if (profile.role === "admin" && ventureParam) {
      resolvedVentureId = ventureParam;
    } else {
      resolvedVentureId = profile.venture_id || null;
    }
  } else {
    redirect("/");
  }

  if (!resolvedVentureId) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-bold text-[#1a2744] mb-3">חוברת עבודה</h1>
        <p className="text-gray-600">
          חוברת העבודה זמינה לאחר שיבוץ למיזם. פנו לצוות התוכנית כדי להשלים את השיבוץ.
        </p>
      </div>
    );
  }

  const { data: venture } = await supabase
    .from("ventures")
    .select("id, name")
    .eq("id", resolvedVentureId)
    .single();

  return (
    <WorkbookClient
      ventureId={resolvedVentureId}
      ventureName={venture?.name || ""}
      initialSheetKey={initialSheet!}
    />
  );
}
