"use client";

import { useEffect, useState } from "react";
import { formatRelativeHe } from "@/lib/utils";
import { GitCommit, GitBranch, ExternalLink, Sparkles, Loader2 } from "lucide-react";

const REPO = "talgurevich/ofektech-app";
const ENDPOINT = `https://api.github.com/repos/${REPO}/commits?per_page=12`;
// Re-fetch while the page is open: every 4 hours.
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;

type CommitDto = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  author: { login: string; avatar_url: string } | null;
};

function commitSubject(message: string): string {
  return message.split("\n")[0].trim();
}

function commitBody(message: string): string {
  const [, ...rest] = message.split("\n");
  return rest
    .filter((l) => !/^\s*Co-Authored-By/i.test(l))
    .join("\n")
    .trim();
}

export function DevActivityFeed() {
  const [commits, setCommits] = useState<CommitDto[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(ENDPOINT, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) {
          if (!cancelled) {
            setCommits([]);
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as CommitDto[];
        if (!cancelled) {
          setCommits(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCommits([]);
          setLoading(false);
        }
      }
    }

    load();
    const timer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-l from-[#0b1428] via-[#11203d] to-[#1a2744] p-8 text-center">
        <Loader2 className="mx-auto size-5 animate-spin text-white/40" />
      </div>
    );
  }

  if (!commits || commits.length === 0) return null;

  const latest = commits[0];
  const latestRelative = formatRelativeHe(latest.commit.author.date);

  return (
    <div
      className="rounded-2xl bg-gradient-to-l from-[#0b1428] via-[#11203d] to-[#1a2744] text-white shadow-lg overflow-hidden"
      dir="rtl"
    >
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#22c55e]" />
            <h3 className="text-base font-semibold">פעילות פיתוח אחרונה</h3>
          </div>
          <a
            href={`https://github.com/${REPO}/commits/main`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#22c55e] transition-colors"
          >
            <GitBranch className="size-3.5" />
            <span dir="ltr">{REPO}</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
        <p className="text-xs text-white/60 mt-1">
          {commits.length} עדכונים אחרונים — מתעדכן כל כמה שעות. השינוי האחרון{" "}
          {latestRelative}.
        </p>
      </div>

      <div className="p-5">
        <ol className="relative border-r border-white/10 pr-4 space-y-3 max-h-[420px] overflow-y-auto">
          {commits.map((c) => {
            const subject = commitSubject(c.commit.message);
            const body = commitBody(c.commit.message);
            const when = formatRelativeHe(c.commit.author.date);
            const sha = c.sha.slice(0, 7);
            return (
              <li key={c.sha} className="relative pl-1 group">
                <span className="absolute -right-[21px] top-1 flex size-4 items-center justify-center rounded-full bg-[#22c55e]/20 ring-2 ring-[#1a2744]">
                  <GitCommit className="size-2.5 text-[#22c55e]" />
                </span>
                <a
                  href={c.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
                >
                  <p className="text-sm font-medium text-white leading-snug">
                    {subject}
                  </p>
                  {body && (
                    <p className="mt-1 text-xs text-white/60 leading-relaxed line-clamp-2 whitespace-pre-line">
                      {body}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/40">
                    <span dir="ltr" className="font-mono">
                      {sha}
                    </span>
                    <span>•</span>
                    <span>{when}</span>
                    {c.author?.login && (
                      <>
                        <span>•</span>
                        <span dir="ltr">@{c.author.login}</span>
                      </>
                    )}
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
