"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile, Venture } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserCheck, X, Users, UserPlus, AlertCircle, Briefcase } from "lucide-react";

interface AssignmentWithJoins {
  id: string;
  mentor_id: string;
  venture_id: string;
  assigned_at: string;
  venture: { id: string; name: string; description: string | null } | null;
  mentor: { id: string; full_name: string; email: string } | null;
}

export default function AdminAssignmentsPage() {
  const supabase = createClient();
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [ventures, setVentures] = useState<(Venture & { memberCount: number })[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithJoins[]>([]);
  const [selectedMentor, setSelectedMentor] = useState("");
  const [selectedVenture, setSelectedVenture] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [
      { data: mentorData },
      { data: ventureData },
      { data: assignmentData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "mentor")
        .order("full_name"),
      supabase
        .from("ventures")
        .select("*")
        .order("name"),
      supabase
        .from("mentor_assignments")
        .select(
          "*, venture:ventures(id, name, description), mentor:profiles!mentor_assignments_mentor_id_fkey(id, full_name, email)"
        )
        .order("assigned_at", { ascending: false }),
    ]);

    if (mentorData) setMentors(mentorData);
    if (assignmentData) setAssignments(assignmentData as AssignmentWithJoins[]);

    if (ventureData) {
      // Get member counts
      const withCounts = await Promise.all(
        ventureData.map(async (v) => {
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("venture_id", v.id);
          return { ...v, memberCount: count || 0 };
        })
      );
      setVentures(withCounts);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMentor || !selectedVenture) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("mentor_assignments").insert({
      mentor_id: selectedMentor,
      venture_id: selectedVenture,
    });

    if (error) {
      if (error.code === "23505") {
        setMessage("שיבוץ זה כבר קיים");
      } else {
        setMessage(`שגיאה: ${error.message}`);
      }
    } else {
      setMessage("השיבוץ נוסף בהצלחה");

      // Notify the mentor about the new venture assignment
      const venture = ventures.find((v) => v.id === selectedVenture);
      await fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedMentor,
          type: "task",
          title: "מיזם חדש שובץ אליך",
          body: venture?.name || "",
          link: "/",
        }),
      });

      setSelectedVenture("");
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
    { mentor: Profile; assignments: AssignmentWithJoins[] }
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

  // Find unassigned ventures
  const assignedVentureIds = new Set(assignments.map((a) => a.venture_id));
  const unassignedVentures = ventures.filter(
    (v) => !assignedVentureIds.has(v.id)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
          <UserCheck className="size-6" />
          שיבוץ מנטורים
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          שיבוץ מיזמים למנטורים -- כל מנטור יכול לראות רק את המיזמים המשובצים אליו
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
                מיזם
              </label>
              <select
                value={selectedVenture}
                onChange={(e) => setSelectedVenture(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              >
                <option value="">בחר מיזם</option>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.memberCount} חברים)
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
                    {mentorAssignments.length} מיזמים
                  </Badge>
                </div>

                {mentorAssignments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mentorAssignments.map((a) => {
                      const ventureInfo = ventures.find((v) => v.id === a.venture_id);
                      return (
                        <Badge
                          key={a.id}
                          className="bg-[#22c55e]/10 text-[#22c55e] border-0 gap-1.5 pr-1.5 text-sm"
                        >
                          <Briefcase className="size-3" />
                          {a.venture?.name || "---"}
                          {ventureInfo && (
                            <span className="text-[#22c55e]/60 text-[10px]">
                              ({ventureInfo.memberCount})
                            </span>
                          )}
                          <button
                            onClick={() => handleRemove(a.id)}
                            className="rounded-full p-0.5 hover:bg-[#22c55e]/20 transition-colors"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">אין מיזמים משובצים</p>
                )}
              </CardContent>
            </Card>
          )
        )}

        {mentors.length === 0 && (
          <p className="text-sm text-gray-400">אין מנטורים במערכת</p>
        )}
      </section>

      {/* Unassigned ventures */}
      {unassignedVentures.length > 0 && (
        <section>
          <Separator className="mb-6" />
          <h2 className="text-lg font-semibold text-[#1a2744] flex items-center gap-2 mb-4">
            <AlertCircle className="size-5 text-amber-500" />
            מיזמים ללא מנטור ({unassignedVentures.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedVentures.map((v) => (
              <Card key={v.id} className="border-0 shadow-sm bg-amber-50/50">
                <CardContent className="flex items-center gap-3 pt-0">
                  <div className="flex size-8 items-center justify-center rounded-full bg-amber-100">
                    <Briefcase className="size-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a2744]">
                      {v.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.memberCount} חברים
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
