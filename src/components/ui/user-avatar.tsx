import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  profileImageUrl?: string | null;
  initials?: string | null;
  bgColor?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function readableForeground(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#111827";
  const int = parseInt(m[1], 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWhite = 1.05 / (lum + 0.05);
  return contrastWhite >= 4.5 ? "#ffffff" : "#111827";
}

/** Darkens a colour until white text on it reaches WCAG AA (4.5:1). */
export function accessibleAvatarBackground(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#B45309";
  let [r, g, b] = [0, 1, 2].map((i) => parseInt(m[1].slice(i * 2, i * 2 + 2), 16));
  const contrast = () => {
    const [lr, lg, lb] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const lum = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    return 1.05 / (lum + 0.05);
  };
  let guard = 0;
  while (contrast() < 4.5 && guard < 40) {
    r = Math.round(r * 0.9);
    g = Math.round(g * 0.9);
    b = Math.round(b * 0.9);
    guard += 1;
  }
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function UserAvatar({
  profileImageUrl,
  initials = "?",
  bgColor = "#F59E0B",
  size = "md",
  className,
}: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {profileImageUrl && (
        <AvatarImage src={profileImageUrl} alt="Profile" />
      )}
      <AvatarFallback
        style={{ backgroundColor: accessibleAvatarBackground(bgColor || "#F59E0B") }}
        className="font-semibold text-white"
      >
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
