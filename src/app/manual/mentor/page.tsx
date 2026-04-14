import Link from "next/link";

export const metadata = {
  title: "מדריך למנטורים — OfekTech",
  description: "מדריך שימוש בפורטל OfekTech למנטורים",
};

export default function MentorManualPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a2744] mb-3">מדריך למנטורים</h1>
        <p className="text-gray-500 text-base md:text-lg">כל מה שצריך לדעת כדי ללוות את היזמים שלך בפורטל</p>
        <p className="text-gray-400 text-sm mt-8">אפריל 2026</p>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12 md:space-y-16">

        {/* Section 1 */}
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
          <Screenshot src="/manuals/mentor-01-login.png" caption="מסך הכניסה לפורטל" />
          <Tip text="רק משתמשים שהוזמנו על ידי מנהלי התוכנית יכולים להתחבר. אם נתקלתם בבעיה, פנו ל-ofektech.innovation@gmail.com" />
        </section>

        {/* Section 2 */}
        <section>
          <SectionTitle num={2} title="סיור היכרות (אונבורדינג)" />
          <p className="text-gray-600 mb-4">
            בכניסה הראשונה לפורטל, תעברו סיור קצר שמסביר את הכלים העומדים לרשותכם. הסיור כולל 3 מסכים:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
            <li><strong>ברוכים הבאים</strong> — הסבר כללי על הפורטל</li>
            <li><strong>החניכים שלך</strong> — איך לעקוב אחרי ההתקדמות של המיזמים</li>
            <li><strong>משוב מובנה</strong> — איך לתת משוב אחרי כל פגישה</li>
          </ol>
          <Screenshot src="/manuals/mentor-02-onboarding.png" caption="המסך הראשון בסיור ההיכרות" />
          <Tip text="ניתן לדלג על הסיור, אבל מומלץ לעבור אותו כדי להכיר את הכלים." />
        </section>

        {/* Section 3 */}
        <section>
          <SectionTitle num={3} title="הדשבורד שלי" />
          <p className="text-gray-600 mb-4">
            לאחר ההתחברות, תגיעו לדשבורד הראשי שמציג את כל המיזמים המשובצים אליכם.
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">מה תראו בדשבורד:</h3>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>שורת נתונים</strong> — מספר מיזמים, פגישות ומשובים</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>כרטיסי מיזם</strong> — לכל מיזם: שם, חברי צוות, התקדמות במשימות ובמדריך, תאריך פגישה אחרונה</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>כפתורי פעולה</strong> — צפייה בפרטים, הוספת משוב, הוספת משימה</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>פרטי קשר</strong> — מספרי טלפון ואימייל של צוות OfekTech</span></li>
          </ul>
          <Screenshot src="/manuals/mentor-03-dashboard.png" caption="הדשבורד הראשי — סקירת כל המיזמים שלך" />
        </section>

        {/* Section 4 */}
        <section>
          <SectionTitle num={4} title="צפייה בפרטי מיזם" />
          <p className="text-gray-600 mb-4">
            לחיצה על ״צפייה בפרטים״ בכרטיס מיזם תפתח דף מפורט עם כל המידע על המיזם.
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">מה תראו בדף המיזם:</h3>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>משימות</strong> — רשימת המשימות הפתוחות וההשלמות של הצוות</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>מדריך התוכנית</strong> — מה היזמים כתבו בכל אחד מ-13 הפרקים</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>היסטוריית משובים</strong> — כל המשובים שניתנו בפגישות קודמות</span></li>
          </ul>
          <Screenshot src="/manuals/mentor-04-venture-detail.png" caption="דף פרטי מיזם — משימות, מדריך ומשובים" />
          <Tip text="כל משוב שתיתנו נגיש ליזמים ולמנהלי התוכנית — שקיפות מלאה." />
        </section>

        {/* Section 5 */}
        <section>
          <SectionTitle num={5} title="הוספת משוב על פגישה" />
          <p className="text-gray-600 mb-6">
            אחרי כל פגישה עם מיזם, לחצו על ״הוסף משוב״ בכרטיס המיזם. תפתח טופס בן 3 שלבים:
          </p>

          <StepTitle num={1} title="פרטי הפגישה" />
          <p className="text-gray-600 mb-4">בחרו את המיזם (אם לא נבחר אוטומטית) ואת תאריך הפגישה.</p>
          <Screenshot src="/manuals/mentor-05-feedback-step1.png" caption="שלב 1 — בחירת מיזם ותאריך" />

          <StepTitle num={2} title="דירוג" />
          <p className="text-gray-600 mb-2">דרגו את היזם/ית ב-5 קריטריונים:</p>
          <ul className="space-y-1 text-gray-600 mb-4 mr-4">
            <li><strong>מיקוד</strong> — האם היזם/ית מרוכז/ת ומכוון/ת למטרה?</li>
            <li><strong>התקדמות</strong> — כמה התקדם/ה מאז הפגישה האחרונה?</li>
            <li><strong>מוכנות</strong> — האם הגיע/ה מוכן/ה לפגישה?</li>
            <li><strong>יוזמה</strong> — כמה יוזמה מגלה?</li>
            <li><strong>יישום</strong> — כמה מהמשימות יושמו?</li>
          </ul>
          <Screenshot src="/manuals/mentor-06-feedback-step2.png" caption="שלב 2 — דירוג ב-5 קריטריונים" />

          <StepTitle num={3} title="משוב כתוב" />
          <p className="text-gray-600 mb-4">כתבו משוב חופשי — תובנות, המלצות, נקודות לשיפור.</p>
          <Screenshot src="/manuals/mentor-07-feedback-step3.png" caption="שלב 3 — משוב כתוב חופשי" />

          <Tip text="אחרי שליחת המשוב, היזמים ומנהלי התוכנית יקבלו התראה ואימייל." />
        </section>

        {/* Section 6 */}
        <section>
          <SectionTitle num={6} title="הוספת משימות למיזם" />
          <p className="text-gray-600 mb-4">
            ניתן להוסיף משימות ליזמים ישירות מהדשבורד. לחצו על ״+ הוסף משימה למיזם״ בכרטיס המיזם.
          </p>
          <h3 className="text-lg font-semibold text-[#1a2744] mb-3">פרטי המשימה:</h3>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>תיאור</strong> — מה צריך לעשות</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>דדליין</strong> — תאריך יעד (אופציונלי)</span></li>
            <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-1">✦</span><span><strong>אחראי</strong> — מנטור, המיזם, או צוות</span></li>
          </ul>
          <Screenshot src="/manuals/mentor-08-add-task.png" caption="טופס הוספת משימה למיזם" />
          <p className="text-gray-600 mt-4">
            המשימה תופיע ברשימת המשימות של המיזם, והיזמים יקבלו התראה על משימה חדשה.
          </p>
          <Tip text="השתמשו במשימות כדי לתעד החלטות מפגישות ולוודא מעקב." />
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
