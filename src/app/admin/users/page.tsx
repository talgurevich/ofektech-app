"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile, UserRole, Cohort } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, X, Check } from "lucide-react";

export default function AdminUsersPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<(Profile & { cohort?: { name: string } | null })[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("candidate");
  const [cohortId, setCohortId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [newCohortName, setNewCohortName] = useState("");
  const [showNewCohort, setShowNewCohort] = useState(false);

  useEffect(() => {
    loadProfiles();
    loadCohorts();
  }, []);

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("*, cohort:cohorts(name)")
      .order("created_at", { ascending: false });
    if (data) setProfiles(data);
  }

  async function loadCohorts() {
    const { data } = await supabase
      .from("cohorts")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setCohorts(data);
      if (data.length > 0 && !cohortId) {
        const active = data.find((c) => c.is_active);
        if (active) setCohortId(active.id);
      }
    }
  }

  async function handleCreateCohort() {
    if (!newCohortName.trim()) return;
    setLoading(true);
    await supabase.from("cohorts").insert({ name: newCohortName.trim() });
    setNewCohortName("");
    setShowNewCohort(false);
    setLoading(false);
    loadCohorts();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const body: Record<string, string> = { email, full_name: fullName, role };
    if (role === "candidate" && cohortId) {
      body.cohort_id = cohortId;
    }

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(`שגיאה: ${data.error}`);
    } else {
      setMessage(`${fullName || email} נוסף/ה בהצלחה`);
      setEmail("");
      setFullName("");
      loadProfiles();
    }

    setLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את ${name || "המשתמש"}?`)) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setMessage(`שגיאה: ${data.error}`);
    } else {
      setMessage("המשתמש נמחק");
      loadProfiles();
    }
  }

  async function handleCohortChange(userId: string, newCohortId: string) {
    await supabase
      .from("profiles")
      .update({ cohort_id: newCohortId || null })
      .eq("id", userId);
    loadProfiles();
  }

  const roleLabels: Record<UserRole, string> = {
    admin: "מנהל",
    candidate: "יזם/ית",
    mentor: "מנטור/ית",
    visitor: "מאזין/ת",
  };

  const candidates = profiles.filter((p) => p.role === "candidate");
  const mentors = profiles.filter((p) => p.role === "mentor");
  const visitors = profiles.filter((p) => p.role === "visitor");
  const admins = profiles.filter((p) => p.role === "admin");

  // Group candidates by cohort
  const candidatesByCohort = new Map<string, typeof candidates>();
  candidates.forEach((c) => {
    const cohortName = c.cohort?.name || "ללא מחזור";
    if (!candidatesByCohort.has(cohortName)) candidatesByCohort.set(cohortName, []);
    candidatesByCohort.get(cohortName)!.push(c);
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">ניהול משתמשים</h1>

      {/* Cohort management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-base text-[#1a2744]">מחזורים</CardTitle>
            {!showNewCohort && (
              <button
                onClick={() => setShowNewCohort(true)}
                className="inline-flex items-center gap-1 text-sm text-[#22c55e] hover:underline"
              >
                <Plus className="size-4" />
                מחזור חדש
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {cohorts.map((c) => (
              <Badge
                key={c.id}
                className={`text-sm cursor-default ${
                  c.is_active
                    ? "bg-[#22c55e]/10 text-[#22c55e] border-0"
                    : "bg-gray-100 text-gray-500 border-0"
                }`}
              >
                {c.name}
                {c.is_active && " (פעיל)"}
              </Badge>
            ))}
            {cohorts.length === 0 && (
              <p className="text-sm text-gray-400">אין מחזורים עדיין</p>
            )}
          </div>
          {showNewCohort && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={newCohortName}
                onChange={(e) => setNewCohortName(e.target.value)}
                placeholder="שם המחזור (למשל: מחזור א׳)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              />
              <button
                onClick={handleCreateCohort}
                disabled={loading}
                className="p-2 text-white bg-[#22c55e] rounded-lg hover:bg-[#16a34a] disabled:opacity-50"
              >
                <Check className="size-4" />
              </button>
              <button
                onClick={() => { setShowNewCohort(false); setNewCohortName(""); }}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#1a2744]">הוספת משתמש</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div
              className={`px-4 py-3 rounded-lg text-sm mb-4 ${
                message.startsWith("שגיאה")
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-green-50 border border-green-200 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="אימייל"
                required
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                dir="ltr"
              />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="שם מלא"
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              >
                <option value="candidate">יזם/ית</option>
                <option value="mentor">מנטור/ית</option>
                <option value="visitor">מאזין/ת</option>
                <option value="admin">מנהל/ת</option>
              </select>
              {role === "candidate" && cohorts.length > 0 && (
                <select
                  value={cohortId}
                  onChange={(e) => setCohortId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                >
                  <option value="">בחר מחזור</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                disabled={loading}
                className="bg-[#22c55e] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
              >
                {loading ? "מוסיף..." : "הוסף משתמש"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Candidates by cohort */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5 text-[#1a2744]" />
          <h2 className="text-lg font-semibold text-[#1a2744]">יזמים</h2>
          <Badge variant="secondary">{candidates.length}</Badge>
        </div>
        {Array.from(candidatesByCohort.entries()).map(([cohortName, members]) => (
          <div key={cohortName} className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{cohortName}</h3>
            <div className="space-y-2">
              {members.map((p) => (
                <Card key={p.id} className="border-0 shadow-sm">
                  <CardContent className="flex items-center justify-between pt-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-[#22c55e]/10">
                        <Users className="size-3.5 text-[#22c55e]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a2744]">{p.full_name || "—"}</p>
                        <p className="text-xs text-gray-500" dir="ltr">{p.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={p.cohort_id || ""}
                        onChange={(e) => handleCohortChange(p.id, e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      >
                        <option value="">ללא מחזור</option>
                        {cohorts.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDelete(p.id, p.full_name)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {candidates.length === 0 && (
          <p className="text-sm text-gray-400">אין יזמים עדיין</p>
        )}
      </section>

      {/* Mentors */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5 text-[#1a2744]" />
          <h2 className="text-lg font-semibold text-[#1a2744]">מנטורים</h2>
          <Badge variant="secondary">{mentors.length}</Badge>
        </div>
        <div className="space-y-2">
          {mentors.map((p) => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="flex items-center justify-between pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#1a2744]/10">
                    <Users className="size-3.5 text-[#1a2744]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a2744]">{p.full_name || "—"}</p>
                    <p className="text-xs text-gray-500" dir="ltr">{p.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.full_name)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
          {mentors.length === 0 && (
            <p className="text-sm text-gray-400">אין מנטורים עדיין</p>
          )}
        </div>
      </section>

      {/* Visitors */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5 text-[#1a2744]" />
          <h2 className="text-lg font-semibold text-[#1a2744]">מאזינים</h2>
          <Badge variant="secondary">{visitors.length}</Badge>
        </div>
        <div className="space-y-2">
          {visitors.map((p) => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="flex items-center justify-between pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#1a2744]/10">
                    <Users className="size-3.5 text-[#1a2744]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a2744]">{p.full_name || "—"}</p>
                    <p className="text-xs text-gray-500" dir="ltr">{p.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.full_name)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
          {visitors.length === 0 && (
            <p className="text-sm text-gray-400">אין מאזינים עדיין</p>
          )}
        </div>
      </section>

      {/* Admins */}
      {admins.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="size-5 text-[#1a2744]" />
            <h2 className="text-lg font-semibold text-[#1a2744]">מנהלים</h2>
            <Badge variant="secondary">{admins.length}</Badge>
          </div>
          <div className="space-y-2">
            {admins.map((p) => (
              <Card key={p.id} className="border-0 shadow-sm">
                <CardContent className="flex items-center gap-3 pt-0">
                  <div className="flex size-8 items-center justify-center rounded-full bg-gray-100">
                    <Users className="size-3.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a2744]">{p.full_name || "—"}</p>
                    <p className="text-xs text-gray-500" dir="ltr">{p.email}</p>
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
