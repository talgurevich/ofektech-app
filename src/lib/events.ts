const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const EMOJI: Record<string, string> = {
  login: "🔑",
  onboarding: "🎓",
  checkin: "📋",
  guide: "📖",
  guide_complete: "🎉",
  task_created: "📝",
  task_completed: "✅",
  lecture_feedback: "🎤",
  mentor_feedback: "⭐",
  mentor_task: "📌",
  user_invited: "✉️",
  user_deleted: "🗑️",
  lecture: "📚",
  venture: "🚀",
  assignment: "🤝",
  error: "🚨",
  feed_pin: "📌",
  feed_unpin: "📍",
  feed_moderation: "🛡️",
  bulk_task: "📤",
  lecture_resource: "📎",
};

export async function trackEvent({
  type,
  actor,
  description,
}: {
  type: string;
  actor?: string;
  description: string;
}) {
  if (!SLACK_WEBHOOK_URL) return;

  const emoji = EMOJI[type] || "📣";
  const actorText = actor ? ` — *${actor}*` : "";
  const text = `${emoji} ${description}${actorText}`;

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Silently fail — don't break the app if Slack is down
  }
}
