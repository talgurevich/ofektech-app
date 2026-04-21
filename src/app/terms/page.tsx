import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "תקנון שימוש — OfekTech",
  description: "תקנון השימוש בפורטל OfekTech",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-100 py-12 px-6 text-center">
        <div className="mb-4">
          <p className="text-xl md:text-2xl font-bold tracking-wide">
            <span className="text-[#1a2744]">OFEK</span>
            <span className="text-[#22c55e]">TECH</span>
          </p>
          <p className="text-[10px] text-[#22c55e] tracking-[0.3em] mt-1">
            יזמות · חדשנות · טכנולוגיה
          </p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a2744]">תקנון שימוש</h1>
        <p className="text-sm text-gray-400 mt-4">תאריך עדכון אחרון: 21 באפריל 2026</p>
      </section>

      <article className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-8 text-[15px] leading-relaxed text-gray-700">
        <Section title="1. כללי">
          פורטל OfekTech ("הפורטל") הוא כלי טכנולוגי המשמש את משתתפי תוכניות
          המסע אל האופק — יזמים, מנטורים, צוות התוכנית ומאזינים. השימוש בפורטל
          מותנה בקבלת תקנון זה ובמדיניות הפרטיות המתלווה לו. אם אינך מסכים/ה
          לתנאים, אנא הימנע/י מהשימוש בפורטל.
        </Section>

        <Section title="2. הרשאה וגישה">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>הגישה לפורטל מוגבלת למשתמשים שהוזמנו באופן פרטני על ידי צוות התוכנית.</li>
            <li>כל משתמש/ת מקבל/ת תפקיד — יזם/ת, מנטור/ית, מאזין/ת או מנהל/ת — הקובע את רמת הגישה שלו/שלה.</li>
            <li>פרטי ההתחברות הם אישיים; חל איסור לשתף אותם עם אחרים או לאפשר שימוש על ידי צד שלישי.</li>
            <li>אחריות לשמירה על סודיות פרטי החשבון ועל השימוש בו מוטלת על המשתמש/ת.</li>
          </ul>
        </Section>

        <Section title="3. תוכן המשתמש">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>
              התכנים שמשתמשים מוסיפים לפורטל — ובכלל זה חוברת עבודה, מדריך
              התוכנית, משובים, פרופיל אישי וצ&apos;ק-אינים — שייכים למשתמש/ת
              שיצר/ה אותם או למיזם שאליו הם משויכים.
            </li>
            <li>
              במסגרת המיזם, חברי המיזם וצוות OfekTech (כולל המנטור/ית
              המשויך/ת) עשויים לצפות בתכנים הרלוונטיים לתפעול התוכנית.
            </li>
            <li>
              צוות OfekTech שומר על זכותו לגבות, לגשת, לערוך ולמחוק תכנים
              לצורך תפעול התוכנית, אבטחת מידע, או בהתאם לדרישות הדין.
            </li>
          </ul>
        </Section>

        <Section title="4. שימוש הוגן">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>אין להעלות או להפיץ תוכן בלתי חוקי, פוגעני, מזיק, או הפוגע בזכויות יוצרים או במידע אישי של אחרים.</li>
            <li>אין להשתמש בפורטל לצרכים שאינם קשורים ישירות לתפעול התוכנית.</li>
            <li>אין לנסות לעקוף מנגנוני אבטחה, בקרת גישה או סודיות של הפורטל.</li>
            <li>אין להפעיל בפורטל רובוטים, סקריפטים אוטומטיים או כלים המתחזים למשתמש אנושי.</li>
          </ul>
        </Section>

        <Section title="5. זמינות השירות">
          הפורטל מסופק "כפי שהוא" (AS IS) ו"כפי שזמין" (AS AVAILABLE). אנו
          פועלים לשמירה על זמינות ותקינות השירות, אך איננו מתחייבים לזמינות
          רציפה או להעדר תקלות. אנו שומרים את הזכות לשנות, לעדכן, להגביל או
          להשבית רכיבים מהפורטל בכל עת, ולפי שיקול דעתנו.
        </Section>

        <Section title="6. הגבלת אחריות">
          במידה המרבית המותרת על פי דין, OfekTech והפועלים מטעמה אינם אחראים
          לנזק ישיר או עקיף — לרבות אובדן רווחים, אובדן נתונים או נזקים
          מיוחדים — שנגרמו כתוצאה מהשימוש בפורטל או מאי-יכולת להשתמש בו.
          המשתמש/ת אחראי/ת באופן מלא לתכנים שהוזנו על ידו/ה ולתוצאות השימוש
          בהם.
        </Section>

        <Section title="7. סיום השימוש">
          צוות התוכנית רשאי להשעות או להפסיק את הגישה של משתמש/ת לפורטל בכל
          עת, לפי שיקול דעתו, לרבות במקרים של הפרת תקנון זה, פגיעה בפורטל או
          במשתמשים אחרים, או בתום מחזור ההשתתפות בתוכנית.
        </Section>

        <Section title="8. שינויים בתקנון">
          אנו עשויים לעדכן את תקנון זה מעת לעת. הגרסה המעודכנת תפורסם בעמוד
          זה עם תאריך העדכון. המשך השימוש בפורטל לאחר עדכון מהווה הסכמה
          לתקנון המעודכן.
        </Section>

        <Section title="9. יצירת קשר">
          לכל שאלה, הבהרה או בקשה הנוגעת לתקנון זה ניתן לפנות אלינו באימייל:{" "}
          <a
            href="mailto:ofektech.innovation@gmail.com"
            className="text-[#22c55e] hover:underline"
            dir="ltr"
          >
            ofektech.innovation@gmail.com
          </a>
          .
        </Section>

        <p className="text-sm text-gray-400 border-t border-gray-100 pt-6">
          התקנון מנוסח בלשון זכר לשם הנוחות בלבד ומופנה לנשים וגברים כאחד.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#22c55e] transition-colors"
        >
          <ArrowRight className="size-4" />
          חזרה לפורטל
        </Link>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-[#1a2744] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
