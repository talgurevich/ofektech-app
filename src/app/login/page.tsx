"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { LoginFooter } from "@/components/footer";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("שגיאה בהתחברות עם Google");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#1a2744]">
      {/* Background photo + overlay */}
      <div className="absolute inset-0">
        <img
          src="/login-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-[#1a2744]/80" />
        <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#22c55e]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#22c55e]/5 blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center px-6 py-16">
        {/* Logo */}
        <div className="mb-6 rounded-2xl bg-white/90 px-8 py-4 backdrop-blur-sm shadow-lg">
          <img
            src="/logo.png"
            alt="OfekTech - יזמות · חדשנות · טכנולוגיה"
            className="mx-auto h-16 object-contain"
          />
        </div>

        {/* Tagline */}
        <p className="mb-12 text-center text-lg leading-relaxed text-gray-300">
          המסע שלך ליזמות, טכנולוגיה וחדשנות
          <span className="text-white font-medium"> מתחיל כאן.</span>
        </p>

        {/* Three-column info cards */}
        <div className="mb-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {/* Founders column */}
          <div className="rounded-2xl border border-[#22c55e]/20 bg-white/5 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-3">
              <svg className="h-8 w-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 0 1-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
              </svg>
              <h2 className="text-xl font-bold text-white">יזמים</h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-gray-300">
              הפורטל האישי שלכם לאורך כל התוכנית. כאן תוכלו:
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>למלא משוב שבועי ולעקוב אחרי ההתקדמות שלכם</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>לדרג הרצאות ומפגשי מנטורינג</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>לראות את לוח הזמנים והמפגשים הקרובים</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>להגדיר יעדים שבועיים ולבדוק את ההישגים</span>
              </li>
            </ul>
          </div>

          {/* Mentors column */}
          <div className="rounded-2xl border border-[#22c55e]/20 bg-white/5 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-3">
              <svg className="h-8 w-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <h2 className="text-xl font-bold text-white">מנטורים</h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-gray-300">
              הכלי שלכם ללוות את היזמים בצורה הטובה ביותר:
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>לתעד מפגשי מנטורינג ולשתף תובנות</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>לעקוב אחרי ההתקדמות של היזמים שלכם</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>לתת משוב על מפגשים ולראות את המשוב של היזם</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>לצפות בלוח הזמנים של התוכנית</span>
              </li>
            </ul>
          </div>

          {/* Visitors column */}
          <div className="rounded-2xl border border-[#22c55e]/20 bg-white/5 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-3">
              <svg className="h-8 w-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <h2 className="text-xl font-bold text-white">מאזינים</h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-gray-300">
              גישה לתוכן ההרצאות של התוכנית:
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>צפייה בלוח ההרצאות המלא</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>גישה להקלטות הזום של ההרצאות</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[#22c55e]">✦</span>
                <span>גישה למצגות ולחומרי הלימוד</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Screenshots showcase */}
        <div className="mb-12 w-full">
          <h3 className="text-center text-lg font-semibold text-white mb-3">
            הצצה לפורטל
          </h3>
          <p className="text-center text-sm leading-relaxed text-gray-400 max-w-2xl mx-auto mb-8">
            הפורטל מלווה את משתתפי תוכנית OfekTech — יזמים ומנטורים — לאורך כל המסע.
            יזמים מדווחים על התקדמות שבועית, מדרגים הרצאות ומקבלים משוב ממנטורים.
            מנטורים מתעדים פגישות, עוקבים אחרי ההתקדמות ונותנים משוב מובנה.
            הכל במקום אחד, פשוט ונגיש.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Candidate dashboard */}
            <div className="group">
              <button onClick={() => setLightbox("/screenshot-candidate.png")} className="w-full overflow-hidden rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-[1.02] cursor-zoom-in">
                <img
                  src="/screenshot-candidate.png"
                  alt="דשבורד יזמים"
                  className="w-full object-cover object-top h-48"
                />
              </button>
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-white">דשבורד יזמים</p>
                <p className="text-xs text-gray-400 mt-1">
                  לוח הרצאות, פגישות מנטורינג, סטטיסטיקות ומעקב התקדמות
                </p>
              </div>
            </div>

            {/* Check-in wizard */}
            <div className="group">
              <button onClick={() => setLightbox("/screenshot-checkin.png")} className="w-full overflow-hidden rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-[1.02] cursor-zoom-in">
                <img
                  src="/screenshot-checkin.png"
                  alt="צ׳ק-אין שבועי"
                  className="w-full object-cover object-top h-48"
                />
              </button>
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-white">צ׳ק-אין שבועי</p>
                <p className="text-xs text-gray-400 mt-1">
                  טופס שבועי קצר לדיווח על התקדמות, מצב רוח ויעדים
                </p>
              </div>
            </div>

            {/* Mentor dashboard */}
            <div className="group">
              <button onClick={() => setLightbox("/screenshot-mentor.png")} className="w-full overflow-hidden rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-[1.02] cursor-zoom-in">
                <img
                  src="/screenshot-mentor.png"
                  alt="דשבורד מנטורים"
                  className="w-full object-cover object-top h-48"
                />
              </button>
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-white">דשבורד מנטורים</p>
                <p className="text-xs text-gray-400 mt-1">
                  ניהול פגישות, מעקב אחרי יזמים ומתן משוב מובנה
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <p className="mb-6 text-center text-sm text-gray-400">
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
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 transition-all hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10 disabled:opacity-50"
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
        </div>

      </div>

      <LoginFooter />
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 left-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="size-6" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
