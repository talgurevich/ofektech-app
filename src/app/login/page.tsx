"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  Lightbulb,
  Users,
  Eye,
  ClipboardCheck,
  Table2,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { LoginFooter } from "@/components/footer";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  useRouter();
  const supabase = createClient();

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError("שגיאה בהתחברות עם Google");
      fetch("/api/login-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "error",
          description: "שגיאה בהתחברות עם Google",
        }),
      });
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    setLoading(true);
    setError("");
    setMagicSent(false);

    let exists = false;
    try {
      const checkRes = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: magicEmail.trim() }),
      });
      if (checkRes.ok) {
        const data = await checkRes.json();
        exists = data.exists;
      }
    } catch {
      // fail closed
    }

    if (!exists) {
      setError(
        "אימייל זה אינו רשום במערכת. לשאלות ניתן לפנות ל-ofektech.innovation@gmail.com"
      );
      fetch("/api/login-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "error",
          email: magicEmail.trim(),
          description: `ניסיון כניסה עם אימייל לא רשום: ${magicEmail.trim()}`,
        }),
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError("שגיאה בשליחת הקישור. ודא/י שהאימייל נכון.");
      fetch("/api/login-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "error",
          email: magicEmail.trim(),
          description: `שגיאה בשליחת קישור קסם: ${magicEmail.trim()}`,
        }),
      });
      setLoading(false);
      return;
    }

    setMagicSent(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0f1a33] text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f1a33]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="#top" className="inline-flex items-center">
            <span className="inline-flex items-center rounded-lg bg-white/95 px-3 py-1.5 shadow-sm ring-1 ring-white/10">
              <img src="/logo.png" alt="OfekTech" className="h-7 w-auto object-contain" />
            </span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <img
          src="/login-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1a33]/85 via-[#0f1a33]/75 to-[#0f1a33]/95" />
        <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#22c55e]/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#22c55e]/10 blur-[100px]" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 md:py-20 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-12">
          <div className="text-center lg:text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-[#22c55e]" />
              פורטל מאיץ OfekTech
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">
              המסע שלך ליזמות, חדשנות וטכנולוגיה
              <br />
              <span className="text-[#22c55e]">מתחיל כאן.</span>
            </h1>
            <p className="mt-5 text-base text-gray-300 md:text-lg">
              פלטפורמה אחת שמלווה את משתתפי התוכנית לאורך כל המסע — דיווח
              שבועי, חוברת עבודה, מדריך מובנה, מנטורינג ומעקב יעדים.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              <FeaturePill icon={ClipboardCheck} label="צ׳ק-אין שבועי" />
              <FeaturePill icon={Table2} label="חוברת עבודה" />
              <FeaturePill icon={BookOpen} label="מדריך התוכנית" />
              <FeaturePill icon={MessageSquare} label="משוב מנטורינג" />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a
                href="/manual/entrepreneur"
                target="_blank"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-gray-200 transition-colors hover:bg-white/10"
              >
                מדריך ליזמים
              </a>
              <a
                href="/manual/mentor"
                target="_blank"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-gray-200 transition-colors hover:bg-white/10"
              >
                מדריך למנטורים
              </a>
            </div>
          </div>

          {/* Login card */}
          <div id="login" className="scroll-mt-24">
            <LoginCard
              error={error}
              loading={loading}
              magicEmail={magicEmail}
              setMagicEmail={setMagicEmail}
              magicSent={magicSent}
              handleGoogleLogin={handleGoogleLogin}
              handleMagicLink={handleMagicLink}
              onReset={() => {
                setMagicSent(false);
                setMagicEmail("");
              }}
            />
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="border-y border-white/5 bg-[#0b1428] py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
            למי הפורטל מיועד
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-400">
            לכל תפקיד בתוכנית יש מסך ייעודי עם הכלים הנכונים.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            <RoleCard
              icon={Lightbulb}
              title="יזמים"
              intro="הפורטל האישי שלכם לאורך כל התוכנית."
              bullets={[
                "דיווח שבועי וחודשי על ההתקדמות",
                "חוברת עבודה משותפת למיזם",
                "מדריך התוכנית לכל פרק",
                "דירוג הרצאות ומפגשי מנטורינג",
              ]}
            />
            <RoleCard
              icon={Users}
              title="מנטורים"
              intro="הכלי שלכם ללוות את היזמים בצורה הטובה ביותר."
              bullets={[
                "לתעד פגישות מנטורינג",
                "לעקוב אחרי ההתקדמות של היזמים",
                "לראות פעילות אחרונה של המיזם",
                "לתת משוב מובנה עם דירוגים",
              ]}
            />
            <RoleCard
              icon={Eye}
              title="מאזינים"
              intro="גישה לתוכן ההרצאות של התוכנית."
              bullets={[
                "לוח ההרצאות המלא",
                "הקלטות הזום של ההרצאות",
                "מצגות וחומרי הלימוד",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Manuals */}
      <section className="border-b border-white/5 bg-[#0b1428] py-14 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
            מדריכי שימוש
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-400">
            הסבר קצר על איך להתחבר לפורטל, ליזמים ולמנטורים.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ManualCard
              href="/manual/entrepreneur"
              title="מדריך ליזמים"
              desc="איך להתחבר לפורטל כיזם/ת"
            />
            <ManualCard
              href="/manual/mentor"
              title="מדריך למנטורים"
              desc="איך להתחבר לפורטל כמנטור/ית"
            />
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
            הצצה לפורטל
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-400">
            יזמים מדווחים על התקדמות שבועית, מדרגים הרצאות ומקבלים משוב
            ממנטורים. מנטורים מתעדים פגישות, עוקבים אחרי ההתקדמות ונותנים משוב
            מובנה. הכל במקום אחד, פשוט ונגיש.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Shot
              src="/screenshot-candidate.png"
              title="דשבורד יזמים"
              desc="לוח הרצאות, פגישות מנטורינג, סטטיסטיקות ומעקב התקדמות"
              onOpen={() => setLightbox("/screenshot-candidate.png")}
            />
            <Shot
              src="/screenshot-checkin.png"
              title="צ׳ק-אין שבועי"
              desc="טופס שבועי קצר לדיווח על התקדמות, מצב רוח ויעדים"
              onOpen={() => setLightbox("/screenshot-checkin.png")}
            />
            <Shot
              src="/screenshot-mentor.png"
              title="דשבורד מנטורים"
              desc="ניהול פגישות, מעקב אחרי יזמים ומתן משוב מובנה"
              onOpen={() => setLightbox("/screenshot-mentor.png")}
            />
          </div>
        </div>
      </section>

      <LoginFooter />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 left-4 p-2 text-white/70 transition-colors hover:text-white"
          >
            <X className="size-6" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200 backdrop-blur-sm">
      <Icon className="size-3.5 text-[#22c55e]" />
      {label}
    </span>
  );
}

function RoleCard({
  icon: Icon,
  title,
  intro,
  bullets,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  intro: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-colors hover:border-[#22c55e]/30">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/15">
          <Icon className="size-5 text-[#22c55e]" />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-gray-300">{intro}</p>
      <ul className="space-y-1.5 text-sm text-gray-400">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-1 text-[#22c55e]">✦</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManualCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#22c55e]/40 hover:bg-white/[0.06]"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/15">
        <BookOpen className="size-5 text-[#22c55e]" />
      </div>
      <div className="flex-1 text-right">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
      </div>
    </a>
  );
}

function Shot({
  src,
  title,
  desc,
  onOpen,
}: {
  src: string;
  title: string;
  desc: string;
  onOpen: () => void;
}) {
  return (
    <div className="group">
      <button
        onClick={onOpen}
        className="w-full cursor-zoom-in overflow-hidden rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-[1.02]"
      >
        <img
          src={src}
          alt={title}
          className="h-48 w-full object-cover object-top"
        />
      </button>
      <div className="mt-3 text-center">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs text-gray-400">{desc}</p>
      </div>
    </div>
  );
}

function LoginCard({
  error,
  loading,
  magicEmail,
  setMagicEmail,
  magicSent,
  handleGoogleLogin,
  handleMagicLink,
  onReset,
}: {
  error: string;
  loading: boolean;
  magicEmail: string;
  setMagicEmail: (v: string) => void;
  magicSent: boolean;
  handleGoogleLogin: () => void;
  handleMagicLink: (e: React.FormEvent) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-7 shadow-xl backdrop-blur-md">
      <p className="mb-5 text-center text-sm font-medium text-gray-200">
        כניסה לפורטל
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 transition-all hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10 disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        כניסה עם Google
      </button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-transparent px-3 text-xs text-gray-500">או</span>
        </div>
      </div>

      {magicSent ? (
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#22c55e]/20">
              <svg
                className="size-6 text-[#22c55e]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-white">קישור נשלח!</p>
          <p className="text-xs text-gray-400">
            בדקו את תיבת הדואר ב-{magicEmail}
          </p>
          <button
            onClick={onReset}
            className="mt-2 text-xs text-[#22c55e] hover:underline"
          >
            שלח שוב
          </button>
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            placeholder="האימייל שלך"
            required
            dir="ltr"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50"
          />
          <button
            type="submit"
            disabled={loading || !magicEmail.trim()}
            className="w-full rounded-xl border border-white/10 bg-[#1a2744] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a2744]/80 disabled:opacity-50"
          >
            {loading ? "שולח..." : "שלח לי קישור להתחברות"}
          </button>
        </form>
      )}
    </div>
  );
}
