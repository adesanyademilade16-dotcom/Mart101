import { cn } from "@/lib/utils";

interface PaymentBadgeProps {
  paymentType: string;
  className?: string;
}

const PaymentBadge = ({ paymentType, className }: PaymentBadgeProps) => {
  const isFlexible = paymentType.toLowerCase().includes("flexible");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        isFlexible ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700",
        className
      )}
    >
      {paymentType}
    </span>
  );
};

export default PaymentBadge;
