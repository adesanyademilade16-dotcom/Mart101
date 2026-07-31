import { cn } from "@/lib/utils";
import { isUsedCondition } from "@/lib/conditions";

interface ConditionBadgeProps {
  condition: string;
  className?: string;
}

const ConditionBadge = ({ condition, className }: ConditionBadgeProps) => {
  const used = isUsedCondition(condition);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        used ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700",
        className
      )}
    >
      {condition}
    </span>
  );
};

export default ConditionBadge;
