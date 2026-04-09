"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: "venture", title: "המיזם שלך" },
  { id: "expectations", title: "ציפיות ויעדים" },
  { id: "mood", title: "מצב רוח" },
];

const STAGE_OPTIONS = [
  { value: "idea", label: "רעיון בלבד" },
  { value: "research", label: "מחקר ראשוני" },
  { value: "mvp", label: "יש MVP" },
  { value: "customers", label: "יש לקוחות" },
  { value: "other", label: "אחר" },
];

const OUTCOME_OPTIONS = [
  { value: "clarity", label: "בהירות לגבי המיזם" },
  { value: "networking", label: "קשרים ונטוורקינג" },
  { value: "tech_knowledge", label: "ידע טכנולוגי" },
  { value: "mentor", label: "מנטור שמלווה" },
  { value: "confidence", label: "ביטחון עצמי" },
  { value: "business_tools", label: "כלים עסקיים" },
];

const MOOD_OPTIONS = [
  { v: "1", label: "לחוץ/ה", bg: "bg-red-100 text-red-700 ring-red-300" },
  { v: "2", label: "קצת מתוח/ה", bg: "bg-orange-100 text-orange-700 ring-orange-300" },
  { v: "3", label: "ניטרלי", bg: "bg-yellow-100 text-yellow-700 ring-yellow-300" },
  { v: "4", label: "אופטימי/ת", bg: "bg-lime-100 text-lime-700 ring-lime-300" },
  { v: "5", label: "נלהב/ת!", bg: "bg-green-100 text-green-700 ring-green-300" },
];

export default function OpeningCheckinPage() {
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
    venture_name: "",
    venture_stage: "",
    expectations: "",
    most_important_outcome: [] as string[],
    main_goal_3m: "",
    mood: "",
    concerns: "",
    team_notes: "",
  });

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function toggleOutcome(value: string) {
    setFormData((prev) => {
      const current = prev.most_important_outcome;
      if (current.includes(value)) {
        return { ...prev, most_important_outcome: current.filter((v) => v !== value) };
      }
      return { ...prev, most_important_outcome: [...current, value] };
    });
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    const { error: err } = await supabase.from("checkins").upsert(
      {
        candidate_id: user.id,
        type: "opening" as const,
        period_start: today,
        venture_name: formData.venture_name || null,
        venture_stage: formData.venture_stage || null,
        expectations: formData.expectations || null,
        most_important_outcome: formData.most_important_outcome.join(",") || null,
        main_goal_3m: formData.main_goal_3m || null,
        mood: Number(formData.mood) || null,
        concerns: formData.concerns || null,
        team_notes: formData.team_notes || null,
      },
      { onConflict: "candidate_id,type,period_start" }
    );

    if (err) {
      setError("שגיאה בשמירה. נסה שוב.");
      setLoading(false);
      return;
    }

    fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "checkin", description: "שאלון פתיחה הוגש" }) });

    router.push("/");
    router.refresh();
  }

  const isLast = step === STEPS.length - 1;

  return (
    <main className="max-w-xl mx-auto p-4 md:p-8 w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a2744]">צ׳ק-אין פתיחה</h1>
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
          {/* Step 0: Venture */}
          {step === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">
                  ספרו לנו על המיזם שלכם
                </p>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    מה שם המיזם / הרעיון שלך?
                  </label>
                  <input
                    type="text"
                    value={formData.venture_name}
                    onChange={(e) => updateField("venture_name", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    placeholder="שם המיזם או תיאור קצר של הרעיון"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-3">
                    באיזה שלב המיזם נמצא?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("venture_stage", opt.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          formData.venture_stage === opt.value
                            ? "bg-[#22c55e]/15 text-[#22c55e] ring-2 ring-[#22c55e]/30"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Expectations */}
          {step === 1 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">
                  ציפיות ויעדים
                </p>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    מה הציפיות שלך מהתוכנית?
                  </label>
                  <textarea
                    value={formData.expectations}
                    onChange={(e) => updateField("expectations", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    placeholder="מה את/ה מצפה לקבל מהתוכנית?"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-3">
                    מה הדבר הכי חשוב שתרצה/י לצאת איתו? (בחירה מרובה)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {OUTCOME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleOutcome(opt.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          formData.most_important_outcome.includes(opt.value)
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
                    מה היעד המרכזי שלך ל-3 החודשים הקרובים?
                  </label>
                  <textarea
                    value={formData.main_goal_3m}
                    onChange={(e) => updateField("main_goal_3m", e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    placeholder="מה תרצה/י להשיג עד סוף התוכנית?"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Mood */}
          {step === 2 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0 space-y-5">
                <p className="text-lg font-semibold text-[#1a2744]">
                  איך את/ה מרגיש/ה?
                </p>
                <div>
                  <label className="block text-sm text-gray-600 mb-3">
                    איך את/ה מרגיש/ה לקראת תחילת התוכנית?
                  </label>
                  <div className="flex justify-between gap-2">
                    {MOOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updateField("mood", opt.v)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                          formData.mood === opt.v
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
                    יש משהו שמדאיג אותך? (אופציונלי)
                  </label>
                  <textarea
                    value={formData.concerns}
                    onChange={(e) => updateField("concerns", e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    placeholder="חששות, שאלות, אי-ודאויות..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    מה תרצה/י שהצוות ידע עליך? (אופציונלי)
                  </label>
                  <textarea
                    value={formData.team_notes}
                    onChange={(e) => updateField("team_notes", e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                    placeholder="משהו שחשוב לך שנדע..."
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
            {loading ? "שומר..." : "שלח צ׳ק-אין"}
            <Send className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
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
