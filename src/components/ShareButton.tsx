import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
}

// Turn the in-app SPA link into the bot-friendly share route so WhatsApp
// scrapes the OG metadata; the serverless function 302-redirects humans
// back to the SPA.
function toShareUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl, window.location.origin);
    // /seller/:id -> /share/seller/:id, /product/:id -> /share/product/:id
    u.pathname = u.pathname.replace(/^\/(seller|product)\//, "/share/$1/");
    return u.toString();
  } catch {
    return rawUrl;
  }
}

const ShareButton = ({ url, title, text, className }: ShareButtonProps) => {
  const handleShare = async () => {
    const shareUrl = toShareUrl(url);
    const shareData = { title, text: text || title, url: shareUrl };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User closed the share sheet without picking anything — no error needed.
      }
      return;
    }

    // Desktop browsers without the native share sheet: open WhatsApp Web directly.
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text || title}\n${shareUrl}`)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Button onClick={handleShare} variant="outline" size="icon" className={className} aria-label="Share">
      <Share2 className="w-4 h-4" />
    </Button>
  );
};

export default ShareButton;
