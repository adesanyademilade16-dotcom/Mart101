import AppHeader from "@/components/AppHeader";
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "How do I sell an item?",
    a: "Create an account, go to your dashboard, and click \"Add Product.\"",
  },
  {
    q: "How do I contact a seller?",
    a: "Click the WhatsApp button on the product page to chat directly with the seller.",
  },
  {
    q: "Is MART101 free to use?",
    a: "Yes, it is currently free for students.",
  },
  {
    q: "How do I report a scam or issue?",
    a: "Use the WhatsApp support button below or contact our support email.",
  },
];

const Help = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Need Help?</h1>
        <p className="text-muted-foreground mb-8">
          If you have questions, need assistance, or want to report an issue, we're here to help.
        </p>

        {/* Support options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* WhatsApp */}
          <a
            href="https://wa.me/2349131778249"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full h-14 text-base font-semibold bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-primary-foreground gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat on WhatsApp
            </Button>
          </a>

          {/* Email */}
          <a href="mailto:Gremdev01@gmail.com" className="block">
            <Button variant="secondary" className="w-full h-14 text-base font-semibold gap-2">
              <Mail className="w-5 h-5" />
              Gremdev01@gmail.com
            </Button>
          </a>
        </div>

        {/* FAQ */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
        <div className="glass-card p-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
};

export default Help;
