import Link from "next/link";

export const metadata = {
  title: "מדריך ליזמים — OfekTech",
  description: "מדריך שימוש בפורטל OfekTech ליזמים",
};

export default function EntrepreneurManualPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Cover */}
      <section className="flex flex-col items-center justify-center py-16 md:py-24 px-6 text-center border-b border-gray-100">
        <div className="mb-6">
          <p className="text-2xl md:text-3xl font-bold tracking-wide">
            <span className="text-[#1a2744]">OFEK</span>
            <span className="text-[#22c55e]">TECH</span>
          </p>
          <p className="text-xs text-[#22c55e] tracking-[0.3em] mt-1">יזמות · חדשנות · טכנולוגיה</p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a2744] mb-3">מדריך ליזמים</h1>
        <p className="text-gray-500 text-base md:text-lg">כל מה שצריך לדעת כדי להפיק את המקסימום מהפורטל</p>
        <p className="text-gray-400 text-sm mt-8">אפריל 2026</p>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12 md:space-y-16">

        {/* Section 1: Login */}
        <section>
          <SectionTitle num={1} title="כניסה לפורטל" />
          <p className="text-gray-600 mb-4">
            לאחר שתקבלו מייל הזמנה מצוות OfekTech, תוכלו להתחבר לפורטל בכתובת:
          </p>
          <p className="text-center text-lg font-bold mb-6" dir="ltr">
            <a href="https://ofektech-portal.co.il" className="text-[#22c55e] hover:underline">ofektech-portal.co.il</a>
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">שני אופני התחברות:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
            <li><strong>כניסה עם Google</strong> — לחצו על הכפתור והתחברו עם חשבון ה-Google שלכם (לא חייב להיות Gmail)</li>
            <li><strong>קישור לאימייל (Magic Link)</strong> — הכניסו את האימייל ותקבלו קישור ישיר לתיבת הדואר</li>
          </ol>
          <Screenshot src="/manuals/entrepreneur-01-login.png" caption="מסך הכניסה לפורטל" />
          <Tip text="רק משתמשים שהוזמנו על ידי מנהלי התוכנית יכולים להתחבר. אם נתקלתם בבעיה, פנו ל-ofektech.innovation@gmail.com" />
        </section>

        {/* Section 2: Onboarding */}
        <section>
          <SectionTitle num={2} title="סיור היכרות (אונבורדינג)" />
          <p className="text-gray-600 mb-4">
            בכניסה הראשונה לפורטל, תעברו סיור קצר שמסביר את הכלים העומדים לרשותכם. הסיור כולל 4 מסכים:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
            <li><strong>ברוכים הבאים</strong> — הסבר כללי על הפורטל</li>
            <li><strong>משימות</strong> — איך לנהל את המשימות שלכם</li>
            <li><strong>מדריך התוכנית</strong> — 13 פרקים לבניית מצגת משקיעים</li>
            <li><strong>הרצאות ומשוב</strong> — צפייה בהרצאות ומתן משוב</li>
          </ol>
          <Screenshot src="/manuals/entrepreneur-02-onboarding.png" caption="המסך הראשון בסיור ההיכרות" />
          <Tip text="ניתן לדלג על הסיור, אבל מומלץ לעבור אותו כדי להכיר את כל הכלים." />
        </section>

        {/* Section 3: Dashboard */}
        <section>
          <SectionTitle num={3} title="הדשבורד שלי" />
          <p className="text-gray-600 mb-4">
            לאחר ההתחברות, תגיעו לדשבורד הראשי — המרכז שלכם לאורך כל התוכנית.
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">מה תראו בדשבורד:</h3>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>שורת נתונים</strong> — משימות פתוחות, משובים שהוגשו, הרצאות קרובות</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>משימות</strong> — סיכום המשימות הפתוחות שלכם</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>מדריך התוכנית</strong> — התקדמות במדריך עם קישור להמשך</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>הרצאות</strong> — לוח הרצאות עם קישורים להקלטות ומצגות</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>פרטי קשר</strong> — המנטור שלכם וצוות OfekTech</span></li>
          </ul>
          <Screenshot src="/manuals/entrepreneur-03-dashboard.png" caption="הדשבורד הראשי — הכל במקום אחד" />
        </section>

        {/* Section 4: Opening Check-in */}
        <section>
          <SectionTitle num={4} title="שאלון פתיחה" />
          <p className="text-gray-600 mb-6">
            בכניסה הראשונה תתבקשו למלא שאלון פתיחה קצר — ספרו לנו על המיזם, הציפיות והיעדים שלכם. השאלון כולל 3 שלבים:
          </p>

          <StepTitle num={1} title="המיזם שלך" />
          <p className="text-gray-600 mb-4">שם המיזם או הרעיון, ובאיזה שלב אתם נמצאים (רעיון, מחקר, MVP, לקוחות).</p>
          <Screenshot src="/manuals/entrepreneur-04-checkin-step1.png" caption="שלב 1 — פרטי המיזם" />

          <StepTitle num={2} title="ציפיות ויעדים" />
          <p className="text-gray-600 mb-4">מה הציפיות שלכם מהתוכנית, מה הדבר הכי חשוב שתרצו לצאת איתו, ומה היעד ל-3 חודשים.</p>
          <Screenshot src="/manuals/entrepreneur-05-checkin-step2.png" caption="שלב 2 — ציפיות ויעדים" />

          <Tip text="השאלון הזה עוזר לנו ולמנטור שלכם להבין מאיפה אתם מתחילים ולאן אתם רוצים להגיע." />
        </section>

        {/* Section 5: Tasks */}
        <section>
          <SectionTitle num={5} title="ניהול משימות" />
          <p className="text-gray-600 mb-4">
            דף המשימות מאפשר לכם לנהל את כל המשימות שלכם — אישיות ושל המיזם. גם המנטור יכול להוסיף לכם משימות.
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">יצירת משימה:</h3>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>תיאור</strong> — מה צריך לעשות</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>דדליין</strong> — תאריך יעד (אופציונלי)</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>אחראי</strong> — אני, מנטור, או צוות</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>סוג</strong> — משימה אישית או משימה למיזם (משותפת לכל חברי הצוות)</span></li>
          </ul>

          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">תצוגת רשימה:</h3>
          <Screenshot src="/manuals/entrepreneur-06-tasks-list.png" caption="תצוגת רשימה — משימות פתוחות ומשימות שהושלמו" />

          <h3 className="text-lg font-semibold text-[#1a2744] mb-3 mt-8">תצוגת ציר זמן:</h3>
          <p className="text-gray-600 mb-4">ניתן לעבור לתצוגת ציר זמן שמקבצת משימות לפי תאריך יעד ומסמנת משימות באיחור.</p>
          <Screenshot src="/manuals/entrepreneur-07-tasks-timeline.png" caption="תצוגת ציר זמן — משימות מקובצות לפי דדליין" />

          <Tip text="המנטור ומנהלי התוכנית רואים את המשימות שלכם. כשמשימה הושלמת — סמנו אותה ✓" />
        </section>

        {/* Section 6: Guide */}
        <section>
          <SectionTitle num={6} title="מדריך התוכנית" />
          <p className="text-gray-600 mb-4">
            המדריך מכיל 13 פרקים שיעזרו לכם לבנות מצגת משקיעים. כל פרק מסביר מה צריך לכתוב, ומתחתיו יש שדה טקסט שבו אתם כותבים את התוכן של המיזם שלכם.
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">13 הפרקים:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600 mb-6">
            <span>1. מטרת החברה</span>
            <span>2. הבעיה</span>
            <span>3. הפתרון</span>
            <span>4. למה עכשיו?</span>
            <span>5. גודל השוק</span>
            <span>6. תחרות</span>
            <span>7. המוצר</span>
            <span>8. חדירה לשוק</span>
            <span>9. מודל עסקי</span>
            <span>10. מפת דרכים</span>
            <span>11. הצוות</span>
            <span>12. פיננסים</span>
            <span>13. גיוס הון</span>
          </div>
          <Screenshot src="/manuals/entrepreneur-08-guide.png" caption="מדריך התוכנית — לחצו על פרק כדי לפתוח אותו" />

          <Tip text="התוכן נשמר אוטומטית. אם אתם חלק ממיזם עם שותפים — כולכם עורכים את אותו מדריך משותף." />
        </section>

        {/* Section 7: Lectures */}
        <section>
          <SectionTitle num={7} title="הרצאות ומשוב" />
          <p className="text-gray-600 mb-4">
            בדשבורד תראו את כל ההרצאות של התוכנית. לכל הרצאה: מספר, שם, תאריך, מרצה ומיקום.
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">אחרי כל הרצאה:</h3>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span>קישור להקלטה ולמצגת (אם הועלו)</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span>כפתור "מלא משוב" — משוב קצר שעוזר לנו לשפר</span></li>
          </ul>
          <Screenshot src="/manuals/entrepreneur-09-lectures.png" caption="רשימת הרצאות עם קישורים ומשוב" />
          <Tip text="כל משוב שניתן נגיש למנטור/ית שלך ולמנהלי התוכנית." />
        </section>

        {/* Section 8: Profile */}
        <section>
          <SectionTitle num={8} title="הפרופיל שלי" />
          <p className="text-gray-600 mb-4">
            בדף הפרופיל תוכלו להוסיף פרטים אישיים שיופיעו ברחבי הפורטל:
          </p>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>תמונת פרופיל</strong> — תופיע בסרגל הצד ובכרטיסי המיזם</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>טלפון</strong> — כדי שהצוות והמנטור יוכלו ליצור קשר</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>LinkedIn</strong> — קישור לפרופיל שלכם</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>ביו</strong> — כמה מילים על עצמכם</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>תפקיד במיזם</strong> — CEO, CTO, מייסד/ת וכו׳</span></li>
          </ul>
          <Screenshot src="/manuals/entrepreneur-10-profile.png" caption="דף הפרופיל — הפרטים נשמרים אוטומטית" />
        </section>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400">OfekTech — תוכנית יזמות, חדשנות וטכנולוגיה</p>
          <p className="text-sm text-gray-400 mt-1">
            <a href="https://www.ofektech.org" className="hover:text-[#22c55e]">www.ofektech.org</a>
            {" · "}
            <a href="mailto:ofektech.innovation@gmail.com" className="hover:text-[#22c55e]">ofektech.innovation@gmail.com</a>
          </p>
          <Link href="/login" className="inline-block mt-6 mb-4 text-sm text-[#22c55e] hover:underline">
            כניסה לפורטל ←
          </Link>
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white font-bold text-lg">
        {num}
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-[#1a2744]">{title}</h2>
    </div>
  );
}

function StepTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-8 mb-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1a2744] text-white font-bold text-sm">
        {num}
      </div>
      <h3 className="text-lg font-semibold text-[#1a2744]">{title}</h3>
    </div>
  );
}

function Screenshot({ src, caption }: { src: string; caption: string }) {
  return (
    <div className="my-6">
      <img
        src={src}
        alt={caption}
        className="w-full rounded-xl border border-gray-200 shadow-sm"
      />
      <p className="text-center text-xs text-gray-400 mt-2">{caption}</p>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="bg-[#f0fdf4] border-r-4 border-[#22c55e] rounded-lg px-4 py-3 my-4">
      <p className="text-sm text-[#166534]">
        <strong>💡 טיפ: </strong>{text}
      </p>
    </div>
  );
}
