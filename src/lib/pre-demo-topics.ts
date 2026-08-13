// Single source of truth for the pre-demo survey structure.
// Used by the public form, the submit API, and the feedback display cards.

export const PRE_DEMO_TOPIC_KEYS = [
  // ציר עסקי
  "business_potential",
  "customer_validation",
  "strategic_partnerships",
  // ציר מוצרי
  "mvp_progress",
  "target_customer_fit",
  // ציר יזמי
  "presentation_look",
  "product_look",
  "story",
  "team",
] as const;

export type PreDemoTopicKey = (typeof PRE_DEMO_TOPIC_KEYS)[number];

export type PreDemoTopic = {
  key: PreDemoTopicKey;
  label: string;
  hint?: string;
};

export type PreDemoAxis = {
  key: string;
  title: string;
  topics: PreDemoTopic[];
};

export const PRE_DEMO_AXES: PreDemoAxis[] = [
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
        label: "מידת שותפויות אסטרטגיות שנבנו סביב המיזם",
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
      { key: "product_look", label: "נראות מוצר" },
      { key: "story", label: "סיפור" },
      { key: "team", label: "צוות" },
    ],
  },
];

export function ratingColumn(key: PreDemoTopicKey) {
  return `${key}_rating` as const;
}

export const PRE_DEMO_ROLE_OPTIONS = [
  { value: "mentor", label: "מנטור" },
  { value: "professional_mentor", label: "מנטור מקצועי" },
  { value: "investor", label: "משקיע" },
  { value: "peer", label: "יזם עמית" },
  { value: "staff", label: "צוות OfekTech" },
  { value: "other", label: "אחר" },
];

export const PRE_DEMO_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  PRE_DEMO_ROLE_OPTIONS.map((r) => [r.value, r.label])
);
