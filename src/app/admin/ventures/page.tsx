"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile, Venture, Cohort } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  Plus,
  Trash2,
  X,
  Users,
  UserPlus,
  AlertCircle,
} from "lucide-react";

export default function AdminVenturesPage() {
  const supabase = createClient();
  const [ventures, setVentures] = useState<
    (Venture & { members: Profile[]; cohort: Cohort | null })[]
  >([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cohortId, setCohortId] = useState("");

  // Assign candidate state per venture
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [
      { data: ventureData },
      { data: cohortData },
      { data: candidateData },
    ] = await Promise.all([
      supabase
        .from("ventures")
        .select("*, cohort:cohorts(*)")
        .order("created_at", { ascending: false }),
      supabase.from("cohorts").select("*").order("created_at"),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "candidate")
        .order("full_name"),
    ]);

    if (cohortData) setCohorts(cohortData);
    if (candidateData) setCandidates(candidateData);

    if (ventureData) {
      // Get members for each venture
      const withMembers = await Promise.all(
        ventureData.map(async (v) => {
          const { data: members } = await supabase
            .from("profiles")
            .select("*")
            .eq("venture_id", v.id)
            .order("full_name");
          return {
            ...v,
            members: (members || []) as Profile[],
            cohort: v.cohort as Cohort | null,
          };
        })
      );
      setVentures(withMembers);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("ventures").insert({
      name: name.trim(),
      description: description.trim() || null,
      cohort_id: cohortId || null,
    });

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setMessage("המיזם נוצר בהצלחה");
      setName("");
      setDescription("");
      setCohortId("");
    }

    setLoading(false);
    loadData();
  }

  async function handleAssignCandidate(ventureId: string) {
    if (!selectedCandidate) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ venture_id: ventureId })
      .eq("id", selectedCandidate);

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setMessage("החניך/ה שובץ/ה למיזם");
      setSelectedCandidate("");
      setAssignTarget(null);
    }

    setLoading(false);
    loadData();
  }

  async function handleRemoveCandidate(candidateId: string) {
    if (!confirm("להסיר חניך/ה מהמיזם?")) return;

    const { error } = await supabase
      .from("profiles")
      .update({ venture_id: null })
      .eq("id", candidateId);

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setMessage("החניך/ה הוסר/ה מהמיזם");
    }

    loadData();
  }

  async function handleDeleteVenture(ventureId: string) {
    if (!confirm("למחוק מיזם זה? פעולה זו לא ניתנת לביטול.")) return;

    // First remove all candidates from this venture
    await supabase
      .from("profiles")
      .update({ venture_id: null })
      .eq("venture_id", ventureId);

    // Delete mentor assignments for this venture
    await supabase
      .from("mentor_assignments")
      .delete()
      .eq("venture_id", ventureId);

    // Delete venture chapter entries
    await supabase
      .from("venture_chapter_entries")
      .delete()
      .eq("venture_id", ventureId);

    // Delete venture tasks
    await supabase.from("tasks").delete().eq("venture_id", ventureId);

    // Delete sessions and their feedback
    const { data: sessions } = await supabase
      .from("mentor_sessions")
      .select("id")
      .eq("venture_id", ventureId);
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      await supabase
        .from("session_feedback")
        .delete()
        .in("session_id", sessionIds);
    }
    await supabase
      .from("mentor_sessions")
      .delete()
      .eq("venture_id", ventureId);

    const { error } = await supabase
      .from("ventures")
      .delete()
      .eq("id", ventureId);

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setMessage("המיזם נמחק");
    }

    loadData();
  }

  // Candidates not assigned to any venture
  const unassignedCandidates = candidates.filter((c) => !c.venture_id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <Briefcase className="size-6" />
          ניהול מיזמים
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          יצירה וניהול של מיזמים, שיבוץ חניכים למיזמים
        </p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.includes("שגיאה")
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Create venture form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
            <Plus className="size-4" />
            מיזם חדש
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם המיזם
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="שם המיזם"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תיאור
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תיאור קצר (אופציונלי)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
              </div>
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מחזור
                </label>
                <select
                  value={cohortId}
                  onChange={(e) => setCohortId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                >
                  <option value="">ללא מחזור</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#22c55e] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              {loading ? "יוצר..." : "צור מיזם"}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Venture list */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1a2744] flex items-center gap-2">
          <Briefcase className="size-5" />
          מיזמים ({ventures.length})
        </h2>

        {ventures.map((venture) => (
          <Card key={venture.id} className="border-0 shadow-sm">
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#1a2744]/10">
                  <Briefcase className="size-5 text-[#1a2744]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1a2744]">
                    {venture.name}
                  </p>
                  {venture.description && (
                    <p className="text-xs text-gray-500">{venture.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {venture.cohort && (
                    <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 text-xs">
                      {venture.cohort.name}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {venture.members.length} חברים
                  </Badge>
                  <button
                    onClick={() => handleDeleteVenture(venture.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="flex flex-wrap gap-2">
                {venture.members.map((member) => (
                  <Badge
                    key={member.id}
                    className="bg-[#22c55e]/10 text-[#22c55e] border-0 gap-1.5 pr-1.5 text-sm"
                  >
                    {member.full_name || member.email}
                    <button
                      onClick={() => handleRemoveCandidate(member.id)}
                      className="rounded-full p-0.5 hover:bg-[#22c55e]/20 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {venture.members.length === 0 && (
                  <span className="text-sm text-gray-400">אין חברים עדיין</span>
                )}
              </div>

              {/* Assign candidate */}
              {assignTarget === venture.id ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCandidate}
                    onChange={(e) => setSelectedCandidate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  >
                    <option value="">בחר חניך/ה</option>
                    {unassignedCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || c.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssignCandidate(venture.id)}
                    disabled={!selectedCandidate || loading}
                    className="bg-[#22c55e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                  >
                    שבץ
                  </button>
                  <button
                    onClick={() => {
                      setAssignTarget(null);
                      setSelectedCandidate("");
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAssignTarget(venture.id)}
                  className="inline-flex items-center gap-1.5 text-sm text-[#22c55e] hover:underline"
                >
                  <UserPlus className="size-4" />
                  הוסף חניך/ה
                </button>
              )}
            </CardContent>
          </Card>
        ))}

        {ventures.length === 0 && (
          <p className="text-sm text-gray-400">אין מיזמים עדיין</p>
        )}
      </section>

      {/* Unassigned candidates */}
      {unassignedCandidates.length > 0 && (
        <section>
          <Separator className="mb-6" />
          <h2 className="text-lg font-semibold text-[#1a2744] flex items-center gap-2 mb-4">
            <AlertCircle className="size-5 text-amber-500" />
            חניכים ללא מיזם ({unassignedCandidates.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedCandidates.map((c) => (
              <Card key={c.id} className="border-0 shadow-sm bg-amber-50/50">
                <CardContent className="flex items-center gap-3 pt-0">
                  <div className="flex size-8 items-center justify-center rounded-full bg-amber-100">
                    <Users className="size-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a2744]">
                      {c.full_name || "---"}
                    </p>
                    <p className="text-xs text-gray-500" dir="ltr">
                      {c.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
