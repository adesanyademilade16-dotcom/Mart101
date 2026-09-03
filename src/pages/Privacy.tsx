import { useSEO } from "@/hooks/useSEO";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

const Privacy = () => (
  useSEO({
  title: "Privacy Policy",
  description: "Read how MART101 collects, uses, and protects your personal information.",
  path: "/privacy",
});
  <div className="min-h-screen bg-background flex flex-col">
    <AppHeader />
    <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy – MART101</h1>
      <div className="glass-card p-6 space-y-4 text-foreground/90 leading-relaxed">
        <ul className="list-disc pl-5 space-y-3">
          <li>We collect basic user information such as name, email, and phone number during registration.</li>
          <li>Information is used solely to operate the marketplace and improve the user experience.</li>
          <li>We do not sell or share user data with third parties.</li>
          <li>WhatsApp numbers are visible on product listings for contact purposes between buyers and sellers.</li>
          <li>Admin may review posted content for moderation and community safety.</li>
        </ul>
        <div className="pt-4 border-t border-border text-sm text-muted-foreground space-y-1">
          <p><strong>Effective Date:</strong> February 2026</p>
          <p>For privacy concerns: <a href="mailto:campusmart101@gmail.com" className="text-secondary hover:underline">campusmart101@gmail.com</a></p>
        </div>
      </div>
    </main>
    <AppFooter />
  </div>
);

export default Privacy;
