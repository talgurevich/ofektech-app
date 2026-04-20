import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkbookClient } from "./workbook-client";
import { WORKBOOK_SHEETS } from "@/lib/workbook";

export default async function WorkbookPage({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string }>;
}) {
  const { sheet } = await searchParams;
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

  // Entrepreneurs and admins use this page for their venture's workbook.
  // Entrepreneurs without a venture get a friendly message.
  if (profile.role !== "candidate" && profile.role !== "admin") {
    redirect("/");
  }

  if (!profile.venture_id) {
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
    .eq("id", profile.venture_id)
    .single();

  return (
    <WorkbookClient
      ventureId={profile.venture_id}
      ventureName={venture?.name || ""}
      initialSheetKey={initialSheet!}
    />
  );
}
