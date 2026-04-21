import { Globe, Linkedin } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white/50 py-4 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          OfekTech — יזמות, חדשנות וטכנולוגיה
          <span className="mx-2 text-gray-300">·</span>
          <span className="text-gray-400">v{APP_VERSION}</span>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://www.ofektech.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#22c55e] transition-colors"
          >
            <Globe className="size-3.5" />
            www.ofektech.org
          </a>
          <a
            href="https://www.linkedin.com/company/%D7%9E%D7%A1%D7%A2-%D7%90%D7%9C-%D7%94%D7%90%D7%95%D7%A4%D7%A7-%D7%AA%D7%9B%D7%A0%D7%99%D7%AA/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0077b5] transition-colors"
          >
            <Linkedin className="size-3.5" />
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}

export function LoginFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-white/10 py-4 px-6 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          OfekTech — יזמות, חדשנות וטכנולוגיה
          <span className="mx-2 text-gray-600">·</span>
          <span className="text-gray-500">v{APP_VERSION}</span>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://www.ofektech.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#22c55e] transition-colors"
          >
            <Globe className="size-3.5" />
            www.ofektech.org
          </a>
          <a
            href="https://www.linkedin.com/company/%D7%9E%D7%A1%D7%A2-%D7%90%D7%9C-%D7%94%D7%90%D7%95%D7%A4%D7%A7-%D7%AA%D7%9B%D7%A0%D7%99%D7%AA/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0077b5] transition-colors"
          >
            <Linkedin className="size-3.5" />
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
