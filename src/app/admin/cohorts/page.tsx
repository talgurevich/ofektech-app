import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Check, Plus, Users, Briefcase, Mic2 } from "lucide-react";

async function createCohortAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");
  await supabase.from("cohorts").insert({ name, is_active: false });
  revalidatePath("/admin/cohorts");
}

async function activateCohortAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  // Turn off the currently active cohort first so the partial unique index
  // doesn't reject the new one. Admin policy allows the update.
  await supabase
    .from("cohorts")
    .update({ is_active: false })
    .eq("is_active", true);
  await supabase
    .from("cohorts")
    .update({ is_active: true })
    .eq("id", id);
  revalidatePath("/admin/cohorts");
}

export default async function AdminCohortsPage() {
  const supabase = await createClient();

  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("*")
    .order("created_at", { ascending: true });

  const counts = await Promise.all(
    (cohorts || []).map(async (c) => {
      const [
        { count: candidateCount },
        { count: mentorCount },
        { count: ventureCount },
        { count: lectureCount },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "candidate")
          .eq("cohort_id", c.id),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "mentor")
          .eq("cohort_id", c.id),
        supabase
          .from("ventures")
          .select("*", { count: "exact", head: true })
          .eq("cohort_id", c.id),
        supabase
          .from("lectures")
          .select("*", { count: "exact", head: true })
          .eq("cohort_id", c.id),
      ]);
      return {
        id: c.id,
        candidates: candidateCount || 0,
        mentors: mentorCount || 0,
        ventures: ventureCount || 0,
        lectures: lectureCount || 0,
      };
    })
  );
  const countsById = new Map(counts.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1a2744]">מחזורים</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
            <Plus className="size-5" />
            מחזור חדש
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createCohortAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                שם המחזור
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="למשל: מחזור ג׳"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a] transition-colors"
            >
              <Plus className="size-4" />
              הוספה
            </button>
          </form>
          <p className="text-[11px] text-gray-400 mt-2">
            מחזור נוצר לא-פעיל. כדי להפוך אותו לברירת המחדל, לחצו "הפוך לפעיל".
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(cohorts || []).map((c) => {
          const stats = countsById.get(c.id);
          return (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10">
                      <GraduationCap className="size-5 text-[#22c55e]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-[#1a2744]">
                          {c.name}
                        </p>
                        {c.is_active && (
                          <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-[10px]">
                            <Check className="size-3 ml-0.5" />
                            פעיל
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" />
                          {stats?.candidates ?? 0} יזמים
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" />
                          {stats?.mentors ?? 0} מנטורים
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="size-3" />
                          {stats?.ventures ?? 0} מיזמים
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mic2 className="size-3" />
                          {stats?.lectures ?? 0} הרצאות
                        </span>
                        <span className="text-gray-400">
                          · נוצר {formatDate(c.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!c.is_active && (
                    <form action={activateCohortAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#22c55e]/40 bg-white px-3 py-1.5 text-xs font-medium text-[#22c55e] hover:bg-[#22c55e]/5 transition-colors"
                      >
                        הפוך לפעיל
                      </button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(!cohorts || cohorts.length === 0) && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <GraduationCap className="size-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">אין מחזורים עדיין</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
