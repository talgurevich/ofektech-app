"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Lecture } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function AdminLecturesPage() {
  const supabase = createClient();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLectures();
  }, []);

  async function loadLectures() {
    const { data } = await supabase
      .from("lectures")
      .select("*")
      .order("scheduled_date", { ascending: false });
    if (data) setLectures(data);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("lectures").insert({
      title,
      scheduled_date: date,
      created_by: user.id,
    });

    if (err) {
      setError("שגיאה ביצירת הרצאה");
      setLoading(false);
      return;
    }

    setTitle("");
    setDate("");
    setLoading(false);
    loadLectures();
  }

  async function handleDelete(id: string) {
    await supabase.from("lectures").delete().eq("id", id);
    loadLectures();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">ניהול הרצאות</h1>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold mb-4">הרצאה חדשה</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="שם ההרצאה"
            required
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "יוצר..." : "צור הרצאה"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                שם
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                תאריך
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {lectures.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="px-4 py-3">{l.title}</td>
                <td className="px-4 py-3">{formatDate(l.scheduled_date)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    מחק
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
