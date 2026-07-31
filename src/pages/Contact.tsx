import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <AppHeader />
    <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-2">Contact MART101</h1>
      <p className="text-muted-foreground mb-8">
        For inquiries, partnerships, support, or campus collaboration, reach out to us.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="https://wa.me/2349131778249" target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full h-14 text-base font-semibold bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-primary-foreground gap-2">
            <MessageCircle className="w-5 h-5" />
            +234 913 177 8249
          </Button>
        </a>
        <a href="mailto:campusmart101@gmail.com" className="block">
          <Button variant="secondary" className="w-full h-14 text-base font-semibold gap-2">
            <Mail className="w-5 h-5" />
            campusmart101@gmail.com
          </Button>
        </a>
      </div>
    </main>
    <AppFooter />
  </div>
);

export default Contact;
