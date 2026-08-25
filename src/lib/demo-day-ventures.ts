// Not every venture row in the active cohort is pitching at Demo Day. These are
// real rows other parts of the portal reference, so they are filtered out of the
// judging views rather than deleted: judges shouldn't see them in the dropdown,
// and they shouldn't sit in the leaderboard and completeness grid as permanently
// unscored.

// Placeholder rows named with bare numbers ("10", "11", "2", "6").
const NUMERIC_NAME = /^\d+$/;

// Named rows that aren't part of the judging.
const EXCLUDED_VENTURE_NAMES = new Set(["מתנדב-נת", "Polynate"]);

export function isJudgeableVenture(name: string) {
  const trimmed = name.trim();
  if (NUMERIC_NAME.test(trimmed)) return false;
  if (EXCLUDED_VENTURE_NAMES.has(trimmed)) return false;
  return true;
}
