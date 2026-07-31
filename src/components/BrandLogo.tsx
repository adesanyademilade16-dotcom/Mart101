import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showGlow?: boolean;
  className?: string;
}

const SIZES: Record<string, string> = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-24 w-24",
  xl: "h-40 w-40",
};

const BrandLogo = ({ size = "md", showGlow = false, className }: BrandLogoProps) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full gradient-splash overflow-hidden",
        SIZES[size],
        showGlow && "glow-gold",
        className
      )}
    >
      <img
        src="/logo.png"
        alt="MART101"
        className="h-[62%] w-[62%] object-contain"
      />
    </div>
  );
};

export default BrandLogo;
