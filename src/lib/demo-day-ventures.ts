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

// Demo Day pitch order. The dropdown follows the running order of the event so a
// judge can just pick the next one down the list instead of hunting alphabetically.
// Matched case-insensitively against ventures.name; anything not listed here
// (a venture added late, a leftover test row) sorts to the end by name.
const VENTURE_ORDER = [
  "Supporta",
  "ReexaMine",
  "Anlys",
  "Chakrapulse",
  "TrITop",
  "Bond",
  "PiFox",
  "PROJECT TEMP",
  "TeachMe",
  "מסע להחלים",
];

const ORDER_INDEX = new Map(
  VENTURE_ORDER.map((name, i) => [name.trim().toLowerCase(), i])
);

function orderIndex(name: string) {
  return ORDER_INDEX.get(name.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
}

/** Sort comparator putting ventures in pitch order, unlisted ones last by name. */
export function byPitchOrder<T extends { name: string }>(a: T, b: T) {
  const d = orderIndex(a.name) - orderIndex(b.name);
  return d !== 0 ? d : a.name.localeCompare(b.name, "he");
}
