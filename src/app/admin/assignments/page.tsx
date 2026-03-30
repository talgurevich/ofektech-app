"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserCheck, X, Users, UserPlus, AlertCircle } from "lucide-react";

interface Assignment {
  id: string;
  mentor_id: string;
  candidate_id: string;
  assigned_at: string;
  candidate: { id: string; full_name: string; email: string } | null;
  mentor: { id: string; full_name: string; email: string } | null;
}

export default function AdminAssignmentsPage() {
  const supabase = createClient();
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedMentor, setSelectedMentor] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [
      { data: mentorData },
      { data: candidateData },
      { data: assignmentData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "mentor")
        .order("full_name"),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "candidate")
        .order("full_name"),
      supabase
        .from("mentor_assignments")
        .select(
          "*, candidate:profiles!mentor_assignments_candidate_id_fkey(id, full_name, email), mentor:profiles!mentor_assignments_mentor_id_fkey(id, full_name, email)"
        )
        .order("assigned_at", { ascending: false }),
    ]);

    if (mentorData) setMentors(mentorData);
    if (candidateData) setCandidates(candidateData);
    if (assignmentData) setAssignments(assignmentData as Assignment[]);
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMentor || !selectedCandidate) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("mentor_assignments").insert({
      mentor_id: selectedMentor,
      candidate_id: selectedCandidate,
    });

    if (error) {
      if (error.code === "23505") {
        setMessage("שיבוץ זה כבר קיים");
      } else {
        setMessage(`שגיאה: ${error.message}`);
      }
    } else {
      setMessage("השיבוץ נוסף בהצלחה");
      setSelectedCandidate("");
    }

    setLoading(false);
    loadData();
  }

  async function handleRemove(id: string) {
    if (!confirm("להסיר שיבוץ זה?")) return;

    const { error } = await supabase
      .from("mentor_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(`שגיאה: ${error.message}`);
    } else {
      setMessage("השיבוץ הוסר");
    }

    loadData();
  }

  // Group assignments by mentor
  const assignmentsByMentor = new Map<
    string,
    { mentor: Profile; assignments: Assignment[] }
  >();
  mentors.forEach((m) => {
    assignmentsByMentor.set(m.id, { mentor: m, assignments: [] });
  });
  assignments.forEach((a) => {
    const group = assignmentsByMentor.get(a.mentor_id);
    if (group) {
      group.assignments.push(a);
    }
  });

  // Find unassigned candidates
  const assignedCandidateIds = new Set(assignments.map((a) => a.candidate_id));
  const unassignedCandidates = candidates.filter(
    (c) => !assignedCandidateIds.has(c.id)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <UserCheck className="size-6" />
          שיבוץ מנטורים
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          שיבוץ חניכים למנטורים — כל מנטור יכול לראות רק את החניכים המשובצים אליו
        </p>
      </div>

      {/* Assign form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
            <UserPlus className="size-4" />
            שיבוץ חדש
          </CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div
              className={`px-4 py-3 rounded-lg text-sm mb-4 ${
                message.includes("שגיאה") || message.includes("קיים")
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-green-50 border border-green-200 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleAssign} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מנטור/ית
              </label>
              <select
                value={selectedMentor}
                onChange={(e) => setSelectedMentor(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              >
                <option value="">בחר מנטור/ית</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                חניך/ה
              </label>
              <select
                value={selectedCandidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              >
                <option value="">בחר חניך/ה</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#22c55e] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
            >
              {loading ? "משבץ..." : "שבץ"}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Mentor cards with assignments */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#1a2744] flex items-center gap-2">
          <Users className="size-5" />
          מנטורים ושיבוצים
        </h2>

        {Array.from(assignmentsByMentor.values()).map(
          ({ mentor, assignments: mentorAssignments }) => (
            <Card key={mentor.id} className="border-0 shadow-sm">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#1a2744]/10">
                    <UserCheck className="size-4 text-[#1a2744]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a2744]">
                      {mentor.full_name || mentor.email}
                    </p>
                    <p className="text-xs text-gray-500" dir="ltr">
                      {mentor.email}
                    </p>
                  </div>
                  <Badge variant="secondary" className="mr-auto text-xs">
                    {mentorAssignments.length} חניכים
                  </Badge>
                </div>

                {mentorAssignments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mentorAssignments.map((a) => (
                      <Badge
                        key={a.id}
                        className="bg-[#22c55e]/10 text-[#22c55e] border-0 gap-1.5 pr-1.5 text-sm"
                      >
                        {a.candidate?.full_name || "—"}
                        <button
                          onClick={() => handleRemove(a.id)}
                          className="rounded-full p-0.5 hover:bg-[#22c55e]/20 transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">אין חניכים משובצים</p>
                )}
              </CardContent>
            </Card>
          )
        )}

        {mentors.length === 0 && (
          <p className="text-sm text-gray-400">אין מנטורים במערכת</p>
        )}
      </section>

      {/* Unassigned candidates */}
      {unassignedCandidates.length > 0 && (
        <section>
          <Separator className="mb-6" />
          <h2 className="text-lg font-semibold text-[#1a2744] flex items-center gap-2 mb-4">
            <AlertCircle className="size-5 text-amber-500" />
            חניכים ללא מנטור ({unassignedCandidates.length})
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
                      {c.full_name || "—"}
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
