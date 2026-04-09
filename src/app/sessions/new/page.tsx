"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { Venture } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CalendarDays, Briefcase } from "lucide-react";
import Link from "next/link";

function NewSessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVenture = searchParams.get("venture") || "";
  const supabase = createClient();
  const [assignedVentures, setAssignedVentures] = useState<Venture[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get assigned ventures
      const { data: assignments } = await supabase
        .from("mentor_assignments")
        .select("venture:ventures(id, name, description)")
        .eq("mentor_id", user.id);

      if (assignments) {
        const ventures = assignments
          .map((a) => a.venture as unknown as Venture)
          .filter(Boolean);
        setAssignedVentures(ventures);
      }
    }
    load();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const ventureId = form.get("venture_id") as string;

    const { error: err } = await supabase.from("mentor_sessions").insert({
      venture_id: ventureId,
      mentor_id: user.id,
      session_date: form.get("session_date"),
      created_by: user.id,
    });

    if (err) {
      setError("שגיאה ביצירת הפגישה");
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "error", description: "שגיאה ביצירת פגישת מנטורינג" }) });
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2744] transition-colors mb-3"
        >
          <ArrowRight className="size-4" />
          חזרה
        </Link>
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <CalendarDays className="size-6" />
          פגישת מנטורינג חדשה
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="size-4 inline ml-1" />
                מיזם
              </label>
              <select
                name="venture_id"
                required
                defaultValue={preselectedVenture}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              >
                <option value="">בחר מיזם</option>
                {assignedVentures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך הפגישה
              </label>
              <input
                name="session_date"
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22c55e] text-white rounded-lg px-4 py-3 font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              {loading ? "יוצר..." : "צור פגישה"}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
          <p className="text-gray-500">טוען...</p>
        </main>
      }
    >
      <NewSessionForm />
    </Suspense>
  );
}
