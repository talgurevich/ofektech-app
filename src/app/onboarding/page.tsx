"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2,
  ClipboardCheck,
  Users,
  CalendarDays,
  Star,
  ArrowLeft,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  bullets?: string[];
}

const CANDIDATE_STEPS: Step[] = [
  {
    title: "!ברוכים הבאים ל-OfekTech",
    description:
      "הפורטל הזה מלווה אותך לאורך כל התוכנית — הכל במקום אחד, פשוט ונגיש.",
    icon: <Rocket className="size-8 text-[#22c55e]" />,
    image: "/logo.png",
  },
  {
    title: "הרצאות ולוח זמנים",
    description:
      "כאן תראו את כל ההרצאות, המרצים, התאריכים, וקישורים להקלטות ומצגות.",
    icon: <Mic2 className="size-8 text-[#22c55e]" />,
    image: "/screenshot-candidate.png",
    bullets: [
      "לוח הרצאות מלא עם תאריכים ומרצים",
      "קישורים להקלטות ומצגות אחרי כל הרצאה",
      "אחרי כל הרצאה — תתבקשו למלא משוב קצר",
    ],
  },
  {
    title: "צ׳ק-אין שבועי",
    description:
      "כל שבוע נבקש ממך למלא צ׳ק-אין קצר — זה עוזר לנו ולמנטור שלך ללוות אותך.",
    icon: <ClipboardCheck className="size-8 text-[#22c55e]" />,
    image: "/screenshot-checkin.png",
    bullets: [
      "שעות השקעה ומנטורינג",
      "מצב רוח והתקדמות",
      "הישגים, חסמים ויעדים לשבוע הבא",
    ],
  },
  {
    title: "פגישות מנטורינג",
    description:
      "אחרי כל פגישה עם המנטור — שניכם ממלאים משוב קצר. ככה אנחנו יודעים שהליווי עובד.",
    icon: <Users className="size-8 text-[#22c55e]" />,
    image: "/screenshot-mentor.png",
    bullets: [
      "תיעוד פגישות עם המנטור שלך",
      "משוב הדדי אחרי כל פגישה",
      "מעקב אחרי כל הפגישות במקום אחד",
    ],
  },
];

const VISITOR_STEPS: Step[] = [
  {
    title: "!ברוכים הבאים ל-OfekTech",
    description:
      "הוזמנת לצפות בתוכן ההרצאות של התוכנית.",
    icon: <Rocket className="size-8 text-[#22c55e]" />,
    image: "/logo.png",
  },
  {
    title: "הרצאות ותוכן",
    description:
      "כאן תמצאו את כל ההרצאות, קישורים להקלטות ומצגות.",
    icon: <Mic2 className="size-8 text-[#22c55e]" />,
    image: "/screenshot-candidate.png",
    bullets: [
      "לוח הרצאות מלא עם תאריכים ומרצים",
      "קישורים להקלטות זום אחרי כל הרצאה",
      "קישורים למצגות",
    ],
  },
];

const MENTOR_STEPS: Step[] = [
  {
    title: "!תודה שהצטרפת כמנטור/ית",
    description:
      "הפורטל עוזר לך ללוות את היזמים שלך בצורה מובנית ואפקטיבית.",
    icon: <Rocket className="size-8 text-[#22c55e]" />,
    image: "/logo.png",
  },
  {
    title: "פגישות ומשוב",
    description:
      "אחרי כל פגישה — תתבקש/י לדרג את היזם/ית ולכתוב משוב חופשי.",
    icon: <Star className="size-8 text-[#22c55e]" />,
    image: "/screenshot-mentor.png",
    bullets: [
      "דירוג ב-5 קריטריונים: מיקוד, התקדמות, מוכנות, יוזמה, יישום",
      "משוב כתוב חופשי",
      "צפייה במשוב של היזם/ית על הפגישה",
    ],
  },
  {
    title: "מעקב אחרי יזמים",
    description:
      "בדשבורד שלך תראה/י את כל הפגישות, מי מילא משוב, ואיך ליצור קשר עם הצוות.",
    icon: <CalendarDays className="size-8 text-[#22c55e]" />,
    image: "/screenshot-mentor.png",
    bullets: [
      "סטטיסטיקות על פגישות ומשובים",
      "רשימת פגישות עם סטטוס משוב",
      "פרטי קשר של צוות OfekTech",
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<"candidate" | "mentor" | "visitor">("candidate");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!profile) {
        router.push("/login");
        return;
      }

      if (profile.onboarding_completed) {
        router.push("/");
        return;
      }

      setRole(profile.role as "candidate" | "mentor" | "visitor");
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function completeOnboarding() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">טוען...</p>
      </main>
    );
  }

  const steps = role === "mentor" ? MENTOR_STEPS : role === "visitor" ? VISITOR_STEPS : CANDIDATE_STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isLogoStep = current.image === "/logo.png";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f9] p-4">
      <div className="w-full max-w-lg">
        {/* Skip link */}
        <div className="flex justify-start mb-4">
          <button
            onClick={completeOnboarding}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            דלג
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden">
              {/* Image */}
              {current.image && (
                <div
                  className={`flex items-center justify-center ${
                    isLogoStep
                      ? "bg-white py-8"
                      : "bg-[#1a2744] p-4"
                  }`}
                >
                  <img
                    src={current.image}
                    alt=""
                    className={
                      isLogoStep
                        ? "h-16 object-contain"
                        : "rounded-lg shadow-md max-h-48 w-full object-cover object-top"
                    }
                  />
                </div>
              )}

              <CardContent className="pt-6 pb-4 space-y-4">
                {/* Icon + Title */}
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[#22c55e]/10 shrink-0">
                    {current.icon}
                  </div>
                  <h2 className="text-xl font-bold text-[#1a2744]">
                    {current.title}
                  </h2>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed">
                  {current.description}
                </p>

                {/* Bullets */}
                {current.bullets && (
                  <ul className="space-y-2">
                    {current.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <span className="mt-0.5 text-[#22c55e] shrink-0">
                          ✦
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-[#22c55e]"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              step === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <ArrowRight className="size-4" />
            הקודם
          </button>

          {isLast ? (
            <button
              onClick={completeOnboarding}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] transition-colors shadow-sm"
            >
              בואו נתחיל
              <Rocket className="size-4" />
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
      </div>
    </main>
  );
}
