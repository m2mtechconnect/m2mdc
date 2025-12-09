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
        style={{ backgroundColor: bgColor || "#F59E0B" }}
        className="text-white font-semibold"
      >
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
