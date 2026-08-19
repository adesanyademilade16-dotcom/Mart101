import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

const isInStandaloneMode = () =>
  ("standalone" in window.navigator && (window.navigator as any).standalone) ||
  window.matchMedia("(display-mode: standalone)").matches;

const InstallAppButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Already installed? Don't show anything.
  if (isInStandaloneMode()) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    // No native prompt available yet (iOS, or Chrome hasn't offered it) — show manual steps
    setShowInstructions(true);
  };

  return (
    <>
      <Button
        onClick={handleInstall}
        className="gap-2 bg-gold text-navy hover:bg-gold/90 font-semibold px-6 py-3 rounded-full text-base"
      >
        <Download className="h-5 w-5" />
        Download App
      </Button>

      {showInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-4" onClick={() => setShowInstructions(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowInstructions(false)} className="absolute top-3 right-3 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-lg text-foreground mb-3">Install MART101</h3>
            {isIos() ? (
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> icon in Safari's toolbar</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right corner</li>
              </ol>
            ) : (
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Tap the <strong>⋮ menu</strong> (three dots) in the top right of Chrome</li>
                <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                <li>Tap <strong>"Install"</strong> or <strong>"Add"</strong> to confirm</li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;
