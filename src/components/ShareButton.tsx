import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
}

const ShareButton = ({ url, title, text, className }: ShareButtonProps) => {
  const handleShare = async () => {
    const shareData = { title, text: text || title, url };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User closed the share sheet without picking anything — no error needed.
      }
      return;
    }

    // Desktop browsers without the native share sheet: open WhatsApp Web directly.
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text || title}\n${url}`)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Button onClick={handleShare} variant="outline" size="icon" className={className} aria-label="Share">
      <Share2 className="w-4 h-4" />
    </Button>
  );
};

export default ShareButton;
