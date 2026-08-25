// Who may see the Demo Day judging results.
//
// The admin layout only checks profiles.role = 'admin', which would let ANY admin
// account read the scores. The results are Tal's alone, so this adds a second gate
// on top of it. Kept in an env var (comma-separated) rather than hardcoded so the
// list can change without a deploy.
//
// DEMO_DAY_RESULTS_EMAILS=tal.gurevich@gmail.com

const FALLBACK_EMAILS = ["tal.gurevich@gmail.com"];

function allowedEmails() {
  const raw = process.env.DEMO_DAY_RESULTS_EMAILS?.trim();
  const list = raw
    ? raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : FALLBACK_EMAILS;
  return new Set(list);
}

export function canViewDemoDayResults(email: string | null | undefined) {
  if (!email) return false;
  return allowedEmails().has(email.trim().toLowerCase());
}
