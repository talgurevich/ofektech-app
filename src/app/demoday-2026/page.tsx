import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Clock, Trophy, Lightbulb } from "lucide-react";

export const metadata = {
  title: "Demo Day 2026 — OfekTech",
  description:
    "בואו לחגוג את סיום המחזור השני של OfekTech — הצגת המיזמים מול פאנל שופטים, הכרזת המיזמים הזוכים והענקת פרסי הגמר. 9.9.2026, PwC תל אביב.",
  openGraph: {
    title: "OfekTech Demo Day — 9.9.2026",
    description:
      "בוגרי המחזור השני של תוכנית OfekTech מציגים את המיזמים שלהם. PwC תל אביב, 17:00.",
  },
};

const SCHEDULE: Array<{ time: string; title: string; body?: React.ReactNode }> = [
  { time: "17:00–17:30", title: "התכנסות וכיבוד" },
  {
    time: "17:30–18:00",
    title: "ברכות",
    body: (
      <ul className="space-y-1.5 text-[15px] text-gray-700">
        <li>
          <strong className="text-[#1a2744]">רם רוטברג</strong> — מנכ&quot;ל מפליגים אל האופק
        </li>
        <li>
          <strong className="text-[#1a2744]">מיכאל מזרחי</strong> — מנהל אגף יזמים
          ומשקיעים, חטיבת ההזנק, רשות החדשנות
        </li>
        <li>
          <strong className="text-[#1a2744]">אתי אילן</strong> — מנהלת תוכנית OfekTech
        </li>
        <li>
          <strong className="text-[#1a2744]">יעל לובן</strong> — מלווה מקצועי ומנכ&quot;ל
          Nortech
        </li>
      </ul>
    ),
  },
  {
    time: "18:00–20:30",
    title: "PITCH TIME",
    body: <p className="text-gray-700">הצגת המיזמים מול פאנל שופטים</p>,
  },
  {
    time: "20:30–21:00",
    title: "הכרזת המיזמים הזוכים",
    body: <p className="text-gray-700">הענקת פרסי הגמר והרמת כוסית</p>,
  },
];

const SPONSORS: Array<{ src: string; alt: string; scale?: string }> = [
  { src: "/partners/seedbiz-new.png", alt: "Seedbiz" },
  { src: "/partners/pwc-new.png", alt: "PwC", scale: "scale-[1.75]" },
  { src: "/partners/sfa-new.png", alt: "SFA" },
];

const PARTNERS = [
  { src: "/partners/seedbiz-new.png", alt: "Seedbiz" },
  { src: "/partners/sfa-new.png", alt: "SFA" },
  { src: "/partners/pwc-new.png", alt: "PwC" },
  { src: "/partners/nortech-new.png", alt: "Nortech Platform" },
  { src: "/partners/israel-innovation-authority-new.webp", alt: "רשות החדשנות" },
  { src: "/partners/hype-new.jpg", alt: "HYPE Sports Innovation" },
];

export default function DemoDay2026Page() {
  return (
    <main className="min-h-screen bg-[#f4f6f9] text-gray-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0d1730] text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/demoday-hero.jpg)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-[#0d1730]/60 to-[#0d1730]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-6 pt-10 pb-16 md:pt-14 md:pb-20">
          {/* Logo — top-left */}
          <div className="flex justify-start" dir="ltr">
            <div className="inline-flex items-center rounded-xl bg-white/95 px-3 py-2 shadow-md ring-1 ring-white/40">
              <Image
                src="/partners/ofektech-logo.png"
                alt="OfekTech"
                width={200}
                height={62}
                priority
                className="h-10 w-auto md:h-12"
              />
            </div>
          </div>

          {/* Date + title */}
          <div className="mt-10 md:mt-14 text-left" dir="ltr">
            <p className="text-5xl md:text-7xl font-extrabold tracking-tight">
              9<span className="text-[#22c55e]">.</span>9
              <span className="text-[#22c55e]">.</span>2026
            </p>
            <h1 className="mt-2 text-6xl md:text-8xl font-black leading-none tracking-tight">
              <span className="text-[#22c55e]">DEMO</span>
              <span className="text-white">DAY</span>
            </h1>
          </div>

          {/* Event bar */}
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl bg-white/5 px-5 py-4 ring-1 ring-white/10 backdrop-blur">
            <div className="flex items-center gap-2 text-[20px] font-semibold">
              <Calendar className="size-5 text-[#22c55e]" />
              <span>רביעי</span>
            </div>
            <div className="flex items-center gap-2 text-[20px] font-semibold">
              <Clock className="size-5 text-[#22c55e]" />
              <span>17:00</span>
            </div>
            <div className="flex items-center gap-2 text-[20px]">
              <MapPin className="size-5 text-[#22c55e]" />
              <span className="font-semibold">PwC</span>
              <span className="text-white/80">· דרך מנחם בגין 146, תל אביב-יפו</span>
            </div>
          </div>
        </div>
      </section>

      {/* Intro + CTA chips */}
      <section className="bg-gradient-to-b from-[#16a34a] via-[#15803d] to-[#14532d] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <h2 className="text-center text-2xl md:text-3xl font-bold text-white">
          בוגרי המחזור השני של תוכנית{" "}
          <span className="text-[#bbf7d0]">OFEKTECH</span>
        </h2>
        <p className="mt-6 text-[16px] leading-8 text-white/90 text-center">
          OfekTech היא התוכנית הטכנולוגית של &quot;מסע אל האופק&quot;, הבלעדית
          לבוגרות ובוגרי התוכנית — צעירים וצעירות לאחר שירות צבאי או לאומי.
          <br />
          במשך 16 שבועות לא לומדים על יזמות. עושים יזמות. כל יזם.ית עובד.ת צעד
          אחר צעד על הרעיון שלו, מהרגע הראשון ועד שהוא הופך למוצר מוחשי, עם
          ליווי מקצועי בכל החזיתות.
        </p>
        <p className="mt-6 text-center text-[17px] font-semibold text-white">
          בואו לקחת חלק ברגע השיא ולראות את הדרך שהיזמים עברו מהרעיון ועד לבמה.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "הכירו את היזמים", href: "https://www.ofektech.org/%D7%94%D7%99%D7%96%D7%9E%D7%99%D7%9D" },
            { label: "הכירו את המנטורים", href: "https://www.ofektech.org/#mentors" },
            { label: "עוד על התוכנית", href: "https://www.ofektech.org" },
          ].map((chip) => (
            <a
              key={chip.label}
              href={chip.href}
              className="rounded-xl border border-[#1a2744]/10 bg-white px-4 py-3 text-center text-[15px] font-semibold text-[#1a2744] shadow-sm transition hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              {chip.label}
            </a>
          ))}
        </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="mx-auto max-w-3xl px-6 pt-16 md:pt-20 pb-14">
        <h3 className="mb-6 text-2xl font-bold text-[#1a2744]">בתוכנית</h3>
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {SCHEDULE.map((row, i) => (
            <div
              key={row.time}
              className={`flex flex-col md:flex-row md:items-start gap-3 md:gap-6 p-5 md:p-6 ${
                i !== SCHEDULE.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <div className="md:w-40 shrink-0">
                <div className="inline-flex items-center rounded-lg bg-[#1a2744] px-3 py-1.5 text-sm font-bold text-white">
                  {row.time}
                </div>
              </div>
              <div className="min-w-0 flex-1 border-r-2 border-[#22c55e] pr-4">
                <p
                  className={`text-lg font-bold ${
                    row.title === "PITCH TIME"
                      ? "text-[#22c55e] tracking-wide"
                      : "text-[#1a2744]"
                  }`}
                >
                  {row.title}
                </p>
                {row.body ? <div className="mt-2">{row.body}</div> : null}
              </div>
            </div>
          ))}
        </div>

        {/* Sponsors row */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            הזוכים מקבלים חבילת הזנקה מלאה לסטארט-אפ לשירותים מקצועיים בחסות
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {SPONSORS.map((s) => (
              <div key={s.alt} className="relative h-20 w-44">
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  className={`object-contain ${s.scale ?? ""}`}
                  sizes="180px"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prize podium */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid grid-cols-3 gap-3 md:gap-6 items-end">
          {/* 2nd */}
          <PrizeCard
            place={2}
            amount="50,000"
            heightClass="h-40 md:h-48"
            bgClass="bg-white"
            textClass="text-[#1a2744]"
          />
          {/* 1st */}
          <div className="relative">
            <Trophy className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 size-10 text-amber-500" />
            <PrizeCard
              place={1}
              amount="100,000"
              heightClass="h-52 md:h-64"
              bgClass="bg-gradient-to-b from-[#22c55e] to-[#16a34a]"
              textClass="text-white"
              elevated
            />
          </div>
          {/* 3rd */}
          <PrizeCard
            place={3}
            amount="35,000"
            heightClass="h-32 md:h-40"
            bgClass="bg-white"
            textClass="text-[#1a2744]"
          />
        </div>
      </section>

      {/* Registration CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-16 text-center">
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSdykf-sQK3Y8vD88ReMhCG9g0E94LCNkW5a5tbU2u2Wqu0u0g/viewform"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1a2744] px-10 py-5 text-lg font-bold text-white shadow-lg transition hover:bg-[#22c55e]"
        >
          להרשמה מראש לחץ כאן
        </a>
      </section>

      {/* Partners strip */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="mb-6 text-center text-sm font-semibold tracking-wide text-gray-500">
            שותפים
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {PARTNERS.map((p) => (
              <div key={p.alt} className="relative h-12 w-28">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  className="object-contain"
                  sizes="120px"
                />
              </div>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

function PrizeCard({
  place,
  amount,
  heightClass,
  bgClass,
  textClass,
  elevated = false,
}: {
  place: number;
  amount: string;
  heightClass: string;
  bgClass: string;
  textClass: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={`${bgClass} ${textClass} ${heightClass} rounded-2xl border border-gray-100 shadow-sm ${
        elevated ? "shadow-xl ring-2 ring-[#22c55e]/40" : ""
      } flex flex-col items-center justify-center px-3 py-4`}
    >
      <div className="text-5xl md:text-6xl font-black leading-none">{place}</div>
      <div className="mt-3 text-xs md:text-sm opacity-80">בשווי כולל של</div>
      <div className="mt-1 text-xl md:text-2xl font-extrabold">₪{amount}</div>
    </div>
  );
}
