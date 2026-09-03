import { useSEO } from "@/hooks/useSEO";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

const Terms = () => (
  useSEO({
  title: "Terms of Service",
  description: "Read MART101's terms of service governing use of the OOU student marketplace.",
  path: "/terms",
});
  <div className="min-h-screen bg-background flex flex-col">
    <AppHeader />
    <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-6">Terms of Service – MART101</h1>
      <div className="glass-card p-6 space-y-4 text-foreground/90 leading-relaxed">
        <ul className="list-disc pl-5 space-y-3">
          <li>MART101 is a student marketplace platform that connects buyers and sellers within the campus community.</li>
          <li>We do not handle payments. All transactions happen directly between buyers and sellers.</li>
          <li>Users must post only campus-related items. Irrelevant or inappropriate listings are not permitted.</li>
          <li>Admin reserves the right to remove any listing that violates our guidelines.</li>
          <li>Fraudulent or inappropriate listings may result in account suspension.</li>
          <li>MART101 is not responsible for disputes between buyers and sellers.</li>
        </ul>
        <div className="pt-4 border-t border-border text-sm text-muted-foreground space-y-1">
          <p><strong>Effective Date:</strong> February 2026</p>
          <p>For inquiries: <a href="mailto:campusmart101@gmail.com" className="text-secondary hover:underline">campusmart101@gmail.com</a></p>
        </div>
      </div>
    </main>
    <AppFooter />
  </div>
);

export default Terms;
