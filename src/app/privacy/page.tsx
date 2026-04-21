import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "מדיניות פרטיות — OfekTech",
  description: "מדיניות הפרטיות של פורטל OfekTech",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a2744]">מדיניות פרטיות</h1>
        <p className="text-sm text-gray-400 mt-4">תאריך עדכון אחרון: 21 באפריל 2026</p>
      </section>

      <article className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-8 text-[15px] leading-relaxed text-gray-700">
        <Section title="1. כללי">
          מדיניות זו מפרטת כיצד פורטל OfekTech ("הפורטל") אוסף, משתמש, שומר
          ומגן על המידע האישי של המשתמשים. השימוש בפורטל כפוף למדיניות זו
          ולתקנון השימוש.
        </Section>

        <Section title="2. המידע שאנו אוספים">
          <p>בעת השימוש בפורטל אנו אוספים את סוגי המידע הבאים:</p>
          <ul className="list-disc pr-6 space-y-1.5">
            <li>
              <strong>פרטי זיהוי:</strong> שם מלא, כתובת אימייל, מספר טלפון
              (אופציונלי), תמונת פרופיל.
            </li>
            <li>
              <strong>פרטי תפקיד וארגון:</strong> תפקיד בתוכנית (יזם/ת,
              מנטור/ית, מאזין/ת, מנהל/ת), שיוך למיזם, שיוך למחזור (קוהורט),
              תפקיד בתוך המיזם, תחומי התמחות.
            </li>
            <li>
              <strong>תוכן שהוזן ישירות:</strong> חוברת עבודה, פרקי מדריך,
              משובים על הרצאות ופגישות מנטורינג, צ&apos;ק-אינים שבועיים
              וחודשיים, פעילות במיזם, ביוגרפיה, לינק ללינקדאין, סיסמה/מוטו אישי.
            </li>
            <li>
              <strong>מטא-דאטה ופעילות:</strong> לוגים של אירועי התחברות,
              עדכוני תוכן, תאריכי יצירה ועריכה של רשומות.
            </li>
          </ul>
        </Section>

        <Section title="3. כיצד אנו אוספים את המידע">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>
              <strong>ישירות ממך:</strong> בעת הזמנה לפורטל, עדכון פרופיל
              והזנת תכנים בכלים השונים.
            </li>
            <li>
              <strong>דרך ספק הזיהוי:</strong> בעת כניסה באמצעות חשבון Google
              (OAuth) או קישור קסם (Magic Link) שנשלח לאימייל.
            </li>
            <li>
              <strong>באופן אוטומטי:</strong> מטא-דאטה טכנית כגון חותמות זמן
              של פעולות.
            </li>
          </ul>
        </Section>

        <Section title="4. השימושים במידע">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>הפעלה שוטפת של התוכנית, ניהול מיזמים ושיבוץ מנטורים.</li>
            <li>תקשורת בין יזמים, מנטורים וצוות התוכנית.</li>
            <li>ניתוח והערכה פנימית של התוכנית לצורך שיפור מתמשך.</li>
            <li>
              שליחת התראות מערכת (למשל משימות חדשות, השלמת מדריך) ועדכונים
              הנוגעים לתוכנית.
            </li>
            <li>עמידה בדרישות החוק, התגוננות משפטית ואבטחת מידע.</li>
          </ul>
        </Section>

        <Section title="5. מי רואה את המידע שלך">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>
              <strong>צוות התוכנית (מנהלים):</strong> רואה את מלוא המידע לצורך
              תפעול.
            </li>
            <li>
              <strong>המנטור/ית המשויך/ת למיזם שלך:</strong> רואה את התכנים
              המשותפים של המיזם (חוברת עבודה, מדריך, משובים) ואת פעילות חברי
              המיזם.
            </li>
            <li>
              <strong>חברי המיזם שלך:</strong> רואים את התוכן המשותף של המיזם
              ואת פרופיל החברים האחרים.
            </li>
            <li>
              <strong>משתמשי הפורטל בכללותו:</strong> רואים פרטי פרופיל
              בסיסיים (שם, תמונה, תפקיד) של משתמשים אחרים בתוך הפורטל.
            </li>
          </ul>
        </Section>

        <Section title="6. ספקי שירות צד שלישי">
          <p>אנו נעזרים בספקי שירות כדי לתפעל את הפורטל:</p>
          <ul className="list-disc pr-6 space-y-1.5">
            <li>
              <strong>Supabase:</strong> מסד הנתונים ושירות האימות שלנו. מארח
              את הנתונים בצורה מאובטחת.
            </li>
            <li>
              <strong>Google:</strong> שירות כניסה באמצעות חשבון Google (OAuth)
              — רק אם בחרת להשתמש בו.
            </li>
            <li>
              <strong>Resend:</strong> שליחת אימיילים תפעוליים (הזמנות,
              התראות, קישורי קסם).
            </li>
            <li>
              <strong>Slack:</strong> קבלת התראות אירועים פנימיות לצוות
              התוכנית.
            </li>
            <li>
              <strong>Vercel:</strong> שירות אירוח ופריסה של הפורטל.
            </li>
          </ul>
          <p>
            ספקים אלה כפופים למדיניות הפרטיות ולהתחייבויות האבטחה שלהם, ואיננו
            משתפים את המידע שלך עם צדדים שלישיים אחרים ללא רשותך.
          </p>
        </Section>

        <Section title="7. אבטחת מידע">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>הנתונים מוצפנים במעבר (HTTPS) ובמנוחה אצל ספק המסד.</li>
            <li>
              בקרת גישה מבוצעת באמצעות Row-Level Security (RLS) — כל שאילתה
              מוגבלת לפי התפקיד והשיוך של המשתמש/ת.
            </li>
            <li>
              אנו מתחייבים להתריע על אירועי אבטחה משמעותיים בהתאם לחובה על פי
              דין, אך איננו יכולים להבטיח אבטחה מוחלטת.
            </li>
          </ul>
        </Section>

        <Section title="8. זכויותיך">
          <ul className="list-disc pr-6 space-y-1.5">
            <li>זכות עיון במידע האישי שלך.</li>
            <li>זכות לבקש תיקון מידע שגוי או עדכון.</li>
            <li>
              זכות לבקש מחיקת חשבון ומידע אישי, בכפוף לחובות שמירה מכוח חוק או
              לצרכים תפעוליים חיוניים.
            </li>
            <li>זכות לבקש ייצוא של המידע האישי שלך בפורמט נגיש.</li>
          </ul>
          <p>
            למימוש הזכויות ניתן לפנות אלינו באימייל:{" "}
            <a
              href="mailto:ofektech.innovation@gmail.com"
              className="text-[#22c55e] hover:underline"
              dir="ltr"
            >
              ofektech.innovation@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="9. שמירת המידע">
          נשמור את המידע כל עוד החשבון שלך פעיל או כל עוד יש צורך לצורך המטרות
          המפורטות במדיניות זו ועמידה בדרישות חוקיות. לאחר מחיקת חשבון, ייתכן
          שחלק מהמידע יישאר בגיבויים לתקופה מוגבלת לפני מחיקה מלאה.
        </Section>

        <Section title="10. קבצי Cookies וסיבת שימוש">
          הפורטל משתמש בקבצי עוגיות (Cookies) חיוניים בלבד — לצורך אימות,
          שמירת מצב התחברות והעדפות מערכת. איננו משתמשים בקבצי Cookie לצרכי
          פרסום או מעקב צד שלישי.
        </Section>

        <Section title="11. קטינים">
          הפורטל מיועד למשתתפים בתוכנית בגירים בלבד. איננו אוספים מידע במתכוון
          מקטינים מתחת לגיל 18.
        </Section>

        <Section title="12. שינויים במדיניות">
          מדיניות זו עשויה להתעדכן מעת לעת. הגרסה המעודכנת תפורסם בעמוד זה
          עם תאריך העדכון. במקרה של שינוי מהותי, נעדכן את המשתמשים באמצעים
          סבירים.
        </Section>

        <Section title="13. יצירת קשר">
          לשאלות בנושא הפרטיות או למימוש זכויות ניתן לפנות לצוות התוכנית:
          <br />
          <a
            href="mailto:ofektech.innovation@gmail.com"
            className="text-[#22c55e] hover:underline"
            dir="ltr"
          >
            ofektech.innovation@gmail.com
          </a>
        </Section>

        <p className="text-sm text-gray-400 border-t border-gray-100 pt-6">
          המדיניות מנוסחת בלשון זכר לשם הנוחות בלבד ומופנית לנשים וגברים כאחד.
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
