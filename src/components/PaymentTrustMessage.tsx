import { Info } from "lucide-react";

interface PaymentTrustMessageProps {
  paymentType: string;
}

const PaymentTrustMessage = ({ paymentType }: PaymentTrustMessageProps) => {
  const isFlexible = paymentType.toLowerCase().includes("flexible");

  const message = isFlexible
    ? "This seller allows both Pay on Delivery and Pre-order options. You can choose the method you are most comfortable with."
    : `This seller requires ${paymentType}.`;

  return (
    <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-800">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
};

export default PaymentTrustMessage;
