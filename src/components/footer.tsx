import Link from "next/link";
import { Globe, Linkedin } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

const ORG_LINKS = [
  { href: "https://www.ofektech.org", label: "ofektech.org", icon: Globe },
  { href: "https://www.masaelhaofek.org", label: "masaelhaofek.org", icon: Globe },
  {
    href: "https://www.linkedin.com/company/%D7%9E%D7%A1%D7%A2-%D7%90%D7%9C-%D7%94%D7%90%D7%95%D7%A4%D7%A7-%D7%AA%D7%9B%D7%A0%D7%99%D7%AA/",
    label: "LinkedIn",
    icon: Linkedin,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white/50 py-5 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            OfekTech — יזמות, חדשנות וטכנולוגיה
            <span className="mx-2 text-gray-300">·</span>
            <span className="text-gray-400">v{APP_VERSION}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {ORG_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#22c55e] transition-colors"
                >
                  <Icon className="size-3.5" />
                  {l.label}
                </a>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <p className="text-[11px] text-gray-400">
            נבנה בחיבה על ידי{" "}
            <a
              href="https://www.errn.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[#22c55e] transition-colors"
            >
              errn.io
            </a>
          </p>
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <Link href="/terms" className="hover:text-[#22c55e] transition-colors">
              תקנון שימוש
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/privacy" className="hover:text-[#22c55e] transition-colors">
              מדיניות פרטיות
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LoginFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-white/10 py-5 px-6 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            OfekTech — יזמות, חדשנות וטכנולוגיה
            <span className="mx-2 text-gray-600">·</span>
            <span className="text-gray-500">v{APP_VERSION}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {ORG_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#22c55e] transition-colors"
                >
                  <Icon className="size-3.5" />
                  {l.label}
                </a>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/10 pt-3">
          <p className="text-[11px] text-gray-500">
            נבנה בחיבה על ידי{" "}
            <a
              href="https://www.errn.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#22c55e] transition-colors"
            >
              errn.io
            </a>
          </p>
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <Link href="/terms" className="hover:text-[#22c55e] transition-colors">
              תקנון שימוש
            </Link>
            <span className="text-gray-600">·</span>
            <Link href="/privacy" className="hover:text-[#22c55e] transition-colors">
              מדיניות פרטיות
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
