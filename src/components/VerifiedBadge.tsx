import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
}

const VerifiedBadge = ({ className }: VerifiedBadgeProps) => {
  return (
    <BadgeCheck
      className={cn("h-4 w-4 text-gold fill-gold/20 inline-block", className)}
      aria-label="Verified seller"
    />
  );
};

export default VerifiedBadge;
