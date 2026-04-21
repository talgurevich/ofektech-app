import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "מדריך למנטורים — כניסה לפורטל OfekTech",
  description: "איך להתחבר לפורטל OfekTech כמנטור/ית",
};

export default function MentorManualPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="flex flex-col items-center justify-center border-b border-gray-100 py-14 md:py-20 px-6 text-center">
        <div className="mb-4">
          <p className="text-xl md:text-2xl font-bold tracking-wide">
            <span className="text-[#1a2744]">OFEK</span>
            <span className="text-[#22c55e]">TECH</span>
          </p>
          <p className="mt-1 text-[10px] text-[#22c55e] tracking-[0.3em]">
            יזמות · חדשנות · טכנולוגיה
          </p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a2744]">מדריך למנטורים</h1>
        <p className="mt-3 text-gray-500 text-base md:text-lg">כך מתחברים לפורטל</p>
      </section>

      <article className="mx-auto max-w-2xl px-4 md:px-6 py-10 md:py-14 space-y-6 text-[15px] leading-relaxed text-gray-700">
        <section className="space-y-5">
          <p>לאחר שתקבלו מייל הזמנה מצוות OfekTech, תוכלו להתחבר לפורטל.</p>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
            <p className="text-xs text-gray-500 mb-2">כתובת הפורטל</p>
            <a
              href="https://ofektech-portal.co.il"
              className="text-lg font-bold text-[#22c55e] hover:underline"
              dir="ltr"
            >
              ofektech-portal.co.il
            </a>
          </div>

          <h2 className="text-xl font-bold text-[#1a2744] pt-2">שני אופני התחברות</h2>

          <div className="space-y-4">
            <Option
              num={1}
              title="כניסה עם Google"
              body={
                <>
                  לחצו על <strong>"כניסה עם Google"</strong> והתחברו עם חשבון
                  Google שלכם. לא חייב להיות חשבון Gmail — כל חשבון שמחובר לשירות
                  Google (גם חשבון ארגוני) יעבוד.
                </>
              }
            />
            <Option
              num={2}
              title="קישור לאימייל (Magic Link)"
              body={
                <>
                  הכניסו את כתובת האימייל שבה הוזמנתם ולחצו{" "}
                  <strong>"שלח לי קישור להתחברות"</strong>. יגיע אליכם מייל עם
                  קישור חד-פעמי — לחיצה עליו תכניס אתכם ישירות לפורטל.
                </>
              }
            />
          </div>

          <div className="rounded-lg border-r-4 border-[#22c55e] bg-[#f0fdf4] px-4 py-3">
            <p className="text-sm text-[#166534]">
              <strong>💡 חשוב: </strong>רק משתמשים שהוזמנו במפורש על ידי צוות
              התוכנית יכולים להיכנס לפורטל. אם נתקלתם בבעיה, פנו אלינו ב-
              <a
                href="mailto:ofektech.innovation@gmail.com"
                className="text-[#22c55e] hover:underline"
                dir="ltr"
              >
                ofektech.innovation@gmail.com
              </a>
              .
            </p>
          </div>
        </section>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[#22c55e] hover:underline"
        >
          <ArrowRight className="size-4" />
          חזרה לפורטל
        </Link>
      </article>
    </main>
  );
}

function Option({
  num,
  title,
  body,
}: {
  num: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-sm font-bold text-white">
        {num}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-[#1a2744]">{title}</p>
        <p className="text-gray-600">{body}</p>
      </div>
    </div>
  );
}
