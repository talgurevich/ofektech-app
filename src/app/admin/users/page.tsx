"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile, UserRole } from "@/lib/types";

export default function AdminUsersPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("candidate");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProfiles(data);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: fullName, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(`שגיאה: ${data.error}`);
    } else {
      setMessage(`הזמנה נשלחה ל-${email}`);
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

  const roleLabels: Record<UserRole, string> = {
    admin: "מנהל",
    candidate: "מועמד/ת",
    mentor: "מנטור",
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">ניהול משתמשים</h1>

      {/* Invite form */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-4">הזמנת משתמש חדש</h2>

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

        <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל"
            required
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="שם מלא"
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="candidate">מועמד/ת</option>
            <option value="mentor">מנטור</option>
            <option value="admin">מנהל</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "שולח..." : "שלח הזמנה"}
          </button>
        </form>
      </div>

      {/* Users list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                שם
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                אימייל
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                תפקיד
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3">{p.full_name || "—"}</td>
                <td className="px-4 py-3" dir="ltr">
                  {p.email}
                </td>
                <td className="px-4 py-3">{roleLabels[p.role]}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(p.id, p.full_name)}
                    className="text-red-600 hover:text-red-800 text-sm hover:underline"
                  >
                    מחיקה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
