"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PROTOTYPE_OPTIONS, PILOT_OPTIONS, CLARITY_OPTIONS } from "@/lib/ending-checkin";

const STEPS = [
  { id: "product", title: "המוצר והלקוחות" },
  { id: "validation", title: "פיילוט ובידול" },
];

export default function EndingCheckinPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);

  // Guard: only candidates
  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (data?.role !== "candidate") router.push("/");
    }
    checkRole();
  }, [supabase, router]);

  const [formData, setFormData] = useState({
    has_prototype: "",
    customers_spoken: "",
    pilot_status: "",
    value_prop_clarity: "",
    team_notes: "",
  });

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const step0Valid = formData.has_prototype !== "" && formData.customers_spoken.trim() !== "";
  const step1Valid = formData.pilot_status !== "" && formData.value_prop_clarity !== "";

  async function handleSubmit() {
    if (!step1Valid) {
      setError("נא לענות על כל השאלות לפני השליחה.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const customers = parseInt(formData.customers_spoken, 10);

    const { error: err } = await supabase.from("checkins").upsert(
      {
        candidate_id: user.id,
        type: "ending" as const,
        period_start: today,
        has_prototype: formData.has_prototype || null,
        customers_spoken: Number.isFinite(customers) ? Math.max(0, customers) : null,
        pilot_status: formData.pilot_status || null,
        value_prop_clarity: Number(formData.value_prop_clarity) || null,
        team_notes: formData.team_notes || null,
      },
      { onConflict: "candidate_id,type,period_start" }
    );

    if (err) {
      setError("שגיאה בשמירה. נסה שוב.");
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "error", description: "שגיאה בשמירת שאלון סיכום" }) });
      setLoading(false);
      return;
    }

    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "checkin", description: "שאלון סיכום הוגש" }) });

    try {
      sessionStorage.removeItem("ending-checkin-dismissed");
    } catch {
      /* ignore */
    }

    router.push("/");
    router.refresh();
  }

  const isLast = step === STEPS.length - 1;

  return (
    <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a2744]">שאלון סיכום</h1>
        <p className="text-sm text-gray-500 mt-1">
          {STEPS[step].title} — שלב {step + 1} מתוך {STEPS.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i <= step ? "bg-[#22c55e]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 0: Product + customers */}
          {step === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">
                  איפה המיזם עומד היום?
                </p>
                <div>
                  <label className="block text-sm text-gray-600 mb-3">
                    האם יש לכם כיום מוצר או אב-טיפוס שניתן להציג או לבדוק?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROTOTYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("has_prototype", opt.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          formData.has_prototype === opt.value
                            ? "bg-[#22c55e]/15 text-[#22c55e] ring-2 ring-[#22c55e]/30"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    עם כמה לקוחות / משתמשים פוטנציאליים שוחחתם בסך הכל עד כה?
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={formData.customers_spoken}
                    onChange={(e) => updateField("customers_spoken", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    placeholder="מספר משוער, למשל 12"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Pilot + value proposition */}
          {step === 1 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">
                  ולידציה ובידול
                </p>
                <div>
                  <label className="block text-sm text-gray-600 mb-3">
                    האם הגעתם לבדיקה או פיילוט בשטח מול משתמשים אמיתיים?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PILOT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("pilot_status", opt.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          formData.pilot_status === opt.value
                            ? "bg-[#22c55e]/15 text-[#22c55e] ring-2 ring-[#22c55e]/30"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-3">
                    עד כמה הצעת הערך (Value Proposition) והבידול שלכם מהמתחרים ברורים לכם כיום?
                  </label>
                  <div className="flex justify-between gap-2">
                    {CLARITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updateField("value_prop_clarity", opt.v)}
                        className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                          formData.value_prop_clarity === opt.v
                            ? `${opt.bg} ring-2`
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    משהו נוסף שתרצו לשתף עם הצוות? (אופציונלי)
                  </label>
                  <textarea
                    value={formData.team_notes}
                    onChange={(e) => updateField("team_notes", e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    placeholder="תובנות, בקשות, מה הלאה..."
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : router.push("/")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
        >
          <ArrowRight className="size-4" />
          {step === 0 ? "חזרה" : "הקודם"}
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "שומר..." : "שלח שאלון"}
            <Send className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              if (!step0Valid) {
                setError("נא לענות על שתי השאלות לפני שממשיכים.");
                return;
              }
              setError("");
              setStep(step + 1);
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1a2744] hover:bg-[#1a2744]/90 transition-colors shadow-sm"
          >
            הבא
            <ArrowLeft className="size-4" />
          </button>
        )}
      </div>
    </main>
  );
}
