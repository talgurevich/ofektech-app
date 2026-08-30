// Single source of truth for the Demo Day judges' scorecard.
// Used by the public form, the submit API, and the admin results page.
//
// These are the pre-demo criteria minus "נראות מוצר". They are deliberately a
// COPY of PRE_DEMO_AXES rather than a filtered import of it: these criteria decide
// the Demo Day winner, so the wording must stay frozen even if the pre-demo survey
// is later reworded — otherwise stored results stop matching the labels they are
// displayed under.

export const DEMO_DAY_TOPIC_KEYS = [
  // ציר עסקי
  "business_potential",
  "customer_validation",
  "strategic_partnerships",
  // ציר מוצרי
  "mvp_progress",
  "target_customer_fit",
  // ציר יזמי
  "presentation_look",
  "story",
  "team",
] as const;

export type DemoDayTopicKey = (typeof DEMO_DAY_TOPIC_KEYS)[number];

export type DemoDayTopic = {
  key: DemoDayTopicKey;
  label: string;
  hint?: string;
};

export type DemoDayAxis = {
  key: string;
  title: string;
  topics: DemoDayTopic[];
};

export const DEMO_DAY_AXES: DemoDayAxis[] = [
  {
    key: "business",
    title: "ציר עסקי",
    topics: [
      { key: "business_potential", label: "פוטנציאל עסקי" },
      {
        key: "customer_validation",
        label: "מידת ולידציה שבוצעה מול לקוחות",
      },
      {
        key: "strategic_partnerships",
        label: "מידת זיהוי ויצירת מגעים ראשוניים לבניית שותפויות אסטרטגיות",
      },
    ],
  },
  {
    key: "product",
    title: "ציר מוצרי",
    topics: [
      {
        key: "mvp_progress",
        label: "מידת התקדמות מרעיון ועד MVP",
        hint: "5 = MVP עובד, 1 = רעיון בלבד",
      },
      { key: "target_customer_fit", label: "האם מותאם ללקוח מטרה" },
    ],
  },
  {
    key: "entrepreneurial",
    title: "ציר יזמי",
    topics: [
      { key: "presentation_look", label: "נראות מצגת" },
      { key: "story", label: "סיפור" },
      { key: "team", label: "צוות" },
    ],
  },
];

export const DEMO_DAY_TOPICS: DemoDayTopic[] = DEMO_DAY_AXES.flatMap(
  (a) => a.topics
);

export const DEMO_DAY_TOPIC_LABELS: Record<DemoDayTopicKey, string> =
  Object.fromEntries(DEMO_DAY_TOPICS.map((t) => [t.key, t.label])) as Record<
    DemoDayTopicKey,
    string
  >;

export function ratingColumn(key: DemoDayTopicKey) {
  return `${key}_rating` as const;
}

export type DemoDayRatingColumn = ReturnType<typeof ratingColumn>;

/**
 * Identity key for a typed-in judge name: lowercased, trimmed, inner whitespace
 * collapsed. Must match the value stored in demo_day_scores.judge_name_key.
 */
export function judgeNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
