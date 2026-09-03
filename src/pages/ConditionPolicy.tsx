import { useSEO } from "@/hooks/useSEO";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { ShieldCheck, PackageCheck, AlertTriangle, Eye, MessageCircle, Ban, Trash2, UserX, Sparkles, RefreshCw } from "lucide-react";

const conditions = [
  { label: "Brand New", icon: Sparkles, desc: "Unused, sealed or unboxed, in original condition" },
  { label: "Used – Like New", icon: PackageCheck, desc: "Barely used, no visible wear or defects" },
  { label: "Used – Good", icon: RefreshCw, desc: "Gently used with minor signs of wear" },
  { label: "Used – Fair", icon: AlertTriangle, desc: "Noticeably used, functional with visible wear" },
];

const buyerTips = [
  { icon: Eye, text: "Review product images and descriptions carefully" },
  { icon: PackageCheck, text: "Inspect items before payment" },
  { icon: MessageCircle, text: "Communicate with sellers before completing transactions" },
];

const violations = [
  { icon: Trash2, text: "Item removal" },
  { icon: UserX, text: "Account suspension" },
  { icon: Ban, text: "Permanent ban" },
];

const ConditionPolicy = () => (
  useSEO({
  title: "Product Condition Policy",
  description: "Understand MART101's item condition categories — Brand New, Used Like New, Used Good, and Used Fair.",
  path: "/condition-policy",
});
  <div className="min-h-screen bg-background flex flex-col">
    <AppHeader />
    <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="w-8 h-8 text-secondary" />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Product Condition &amp; Second-Hand Policy</h1>
      </div>
      <p className="text-muted-foreground mb-8 text-sm">Ensuring transparency and trust across MART101</p>

      <div className="space-y-8">
        {/* Intro */}
        <section className="glass-card p-6">
          <p className="text-foreground/90 leading-relaxed">
            MART101 allows both <strong>brand new</strong> and <strong>used (second-hand)</strong> items to be listed on the platform. Sellers must accurately select the correct condition when uploading an item.
          </p>
        </section>

        {/* Conditions */}
        <section className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Item Condition Categories</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {conditions.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <Icon className="w-5 h-5 mt-0.5 shrink-0 text-secondary" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Used item rules */}
        <section className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Rules for Used Items</h2>
          <ul className="space-y-2 text-foreground/90 text-sm list-disc pl-5">
            <li>Minimum of <strong>1 clear, real image</strong> required — maximum of <strong>4 images</strong></li>
            <li>Sellers must <strong>honestly describe any defects or wear</strong></li>
          </ul>
        </section>

        {/* Buyer tips */}
        <section className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Buyer Responsibilities</h2>
          <p className="text-sm text-muted-foreground mb-3">Buyers are advised to:</p>
          <div className="space-y-3">
            {buyerTips.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-secondary" />
                  <span className="text-sm text-foreground/90">{t.text}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="glass-card p-6 border-l-4 border-secondary">
          <p className="text-sm text-foreground/90 leading-relaxed">
            MART101 operates as a <strong>peer-to-peer marketplace</strong> and does not directly inspect items. Responsibility for item condition lies with the seller.
          </p>
        </section>

        {/* Violations */}
        <section className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Misrepresentation Consequences</h2>
          <p className="text-sm text-muted-foreground mb-3">Misrepresentation of item condition may result in:</p>
          <div className="space-y-3">
            {violations.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-destructive" />
                  <span className="text-sm text-foreground/90 font-medium">{v.text}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Goal */}
        <section className="text-center py-4">
          <p className="text-sm font-medium text-muted-foreground italic">
            Our goal: Maintain a transparent, trustworthy, and professional marketplace.
          </p>
        </section>

        {/* Footer info */}
        <div className="border-t border-border pt-4 text-sm text-muted-foreground space-y-1">
          <p><strong>Effective Date:</strong> February 2026</p>
          <p>Questions? <a href="mailto:campusmart101@gmail.com" className="text-secondary hover:underline">campusmart101@gmail.com</a></p>
        </div>
      </div>
    </main>
    <AppFooter />
  </div>
);

export default ConditionPolicy;
