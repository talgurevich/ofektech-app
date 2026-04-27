import { cn } from "@/lib/utils";

interface Props {
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number;
  tone?: "green" | "navy" | "gray";
  className?: string;
}

const TONE_BG: Record<NonNullable<Props["tone"]>, string> = {
  green: "bg-[#22c55e]/15 text-[#22c55e]",
  navy: "bg-[#1a2744]/10 text-[#1a2744]",
  gray: "bg-gray-100 text-gray-500",
};

export function ProfileAvatar({
  fullName,
  email,
  avatarUrl,
  size = 36,
  tone = "green",
  className,
}: Props) {
  const initial = ((fullName?.trim() || email?.trim() || "?")[0] || "?").toUpperCase();
  const dim = `${size}px`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName || email || ""}
        loading="lazy"
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: dim, height: dim }}
      />
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded-full font-bold",
        TONE_BG[tone],
        className
      )}
      style={{ width: dim, height: dim, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </div>
  );
}
