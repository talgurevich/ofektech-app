import { Mail } from "lucide-react";
import Link from "next/link";

export default function NotRegisteredPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f9] p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="size-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">
            משתמש/ת לא רשום/ה
          </h1>
          <p className="text-gray-600 mt-3 leading-relaxed">
            האימייל שלך אינו רשום במערכת פורטל OfekTech.
            <br />
            רק משתמשים שהוזמנו על ידי מנהלי התוכנית יכולים להתחבר.
          </p>
        </div>

        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2">לשאלות ניתן לפנות אלינו:</p>
          <a
            href="mailto:ofektech.innovation@gmail.com"
            className="inline-flex items-center gap-2 text-[#22c55e] font-medium hover:underline"
            dir="ltr"
          >
            <Mail className="size-4" />
            ofektech.innovation@gmail.com
          </a>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a2744] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1a2744]/90 transition-colors"
        >
          חזרה לדף הכניסה
        </Link>
      </div>
    </main>
  );
}
