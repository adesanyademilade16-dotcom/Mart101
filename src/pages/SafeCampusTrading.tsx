import { useSEO } from "@/hooks/useSEO";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Shield, MapPin, Eye, MessageCircle, Clock, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const tips = [
  {
    icon: MapPin,
    title: "Meet in Public Spaces",
    desc: "Always arrange to meet at busy, well-lit locations around OOU like the Main Campus Gate, the University Library, or popular cafeterias. Avoid isolated areas, especially after dark.",
  },
  {
    icon: Users,
    title: "Bring a Friend",
    desc: "If possible, take someone with you when meeting a buyer or seller for the first time. There is safety in numbers, and it also helps you stay calm during the exchange.",
  },
  {
    icon: Eye,
    title: "Inspect Items Before Paying",
    desc: "Check the condition and authenticity of any item before handing over cash. Test electronics, confirm book editions, and verify sizes for clothing and accessories.",
  },
  {
    icon: MessageCircle,
    title: "Keep Conversations on MART101",
    desc: "Use the WhatsApp chat linked through MART101 so there is a record of your conversation. Avoid switching to private calls or unlinked social media chats before you trust the other party.",
  },
  {
    icon: Clock,
    title: "Meet During Daylight Hours",
    desc: "Schedule trades between morning and early evening. Daytime meetings at the Main Campus Gate or central faculty blocks are safer and easier to navigate.",
  },
  {
    icon: CheckCircle,
    title: "Trust Verified Sellers",
    desc: "Look for trust signals on MART101 like Verified Sellers and Admin Monitoring. These badges mean the account has passed basic checks and is actively watched for fair trading behavior.",
  },
  {
    icon: AlertTriangle,
    title: "Report Suspicious Behavior",
    desc: "If someone refuses to meet in public, pressures you for payment upfront, or lists items at unrealistic prices, report them immediately using the Report button on their listing or profile.",
  },
  {
    icon: Shield,
    title: "Use Pay on Delivery When Possible",
    desc: "For higher-value items, choose Pay on Delivery so you only pay after inspecting the item. This protects both buyers and sellers from disputes about condition or non-payment.",
  },
];

const redFlags = [
  "Refuses to meet on campus or in a public OOU area",
  "Asks for full payment before showing the item",
  "Switches to a different phone number or identity suddenly",
  "Prices that seem too good to be true",
  "Pushes you to meet late at night or off-campus",
];

const SafeCampusTrading = () => {
  useSEO({
  title: "Safe Campus Trading Tips for OOU Students",
  description: "Practical tips for buying and selling safely on campus at Olabisi Onabanjo University.",
  path: "/blog/safe-campus-trading-oou",
});
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-navy text-primary-foreground py-16 px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Safe Campus Trading Guide for OOU Students</h1>
          <p className="text-gold font-cursive text-lg mb-4">Protect yourself while buying and selling at Olabisi Onabanjo University.</p>
          <p className="max-w-2xl mx-auto text-primary-foreground/80 leading-relaxed text-sm sm:text-base">
            MART101 is built to make campus trading easy, but your safety comes first. Follow these practical tips when meeting buyers or sellers around OOU.
          </p>
        </section>

        {/* Intro */}
        <section className="container mx-auto px-4 pt-10 pb-4 max-w-3xl">
          <div className="glass-card p-6 sm:p-8">
            <p className="text-foreground/80 leading-relaxed text-sm sm:text-base">
              Buying and selling on campus should feel convenient, not risky. At <strong>Olabisi Onabanjo University</strong>, thousands of students use MART101 to trade textbooks, gadgets, fashion, and everyday essentials. This guide shows you how to stay safe while getting the best deals — whether you are a first-year student in Ago-Iwoye or a returning student restocking for the semester.
            </p>
          </div>
        </section>

        {/* Safety Tips Grid */}
        <section className="container mx-auto px-4 py-10 max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Essential Safety Tips for OOU Students</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tips.map((t) => (
              <div key={t.title} className="glass-card p-6 flex items-start gap-4">
                <div className="bg-secondary/15 rounded-xl p-3 shrink-0">
                  <t.icon className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{t.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Red Flags */}
        <section className="bg-muted/40 py-14 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Red Flags to Watch Out For</h2>
            <div className="glass-card p-6 sm:p-8">
              <ul className="space-y-4">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-3 text-foreground/80 text-sm sm:text-base">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* MART101 Trust Signals */}
        <section className="container mx-auto px-4 py-14 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">How MART101 Keeps You Safe</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto text-sm sm:text-base">
            Our platform is designed specifically for OOU students. We do not just connect buyers and sellers — we actively work to create a secure trading environment.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="glass-card p-6">
              <CheckCircle className="w-8 h-8 text-secondary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Verified Sellers</h3>
              <p className="text-muted-foreground text-sm">Sellers go through basic checks so you know who you are trading with.</p>
            </div>
            <div className="glass-card p-6">
              <Eye className="w-8 h-8 text-secondary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Admin Monitoring</h3>
              <p className="text-muted-foreground text-sm">Our team reviews reports and takes action against suspicious accounts quickly.</p>
            </div>
            <div className="glass-card p-6">
              <Shield className="w-8 h-8 text-secondary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Community Reporting</h3>
              <p className="text-muted-foreground text-sm">Students can flag listings or users, creating a self-policing marketplace.</p>
            </div>
          </div>
        </section>

        {/* Best Meetup Spots */}
        <section className="bg-muted/40 py-14 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Best Public Meetup Spots Around OOU</h2>
            <div className="glass-card p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-secondary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Main Campus Gate</h3>
                  <p className="text-muted-foreground text-sm">Highly visible, busy throughout the day, and easy to find. Ideal for first-time trades.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-secondary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">University Library</h3>
                  <p className="text-muted-foreground text-sm">Quiet but public. Great for inspecting textbooks, gadgets, or study materials without pressure.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-secondary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Faculty Common Areas</h3>
                  <p className="text-muted-foreground text-sm">Open spaces near lecture halls are familiar to most students and usually have foot traffic between classes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-secondary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Student Cafeterias & Kiosks</h3>
                  <p className="text-muted-foreground text-sm">Casual atmosphere, seating available, and easy to grab a drink while you inspect items.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-14 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Trade Safely on Campus?</h2>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base">
            Join thousands of OOU students already buying and selling securely on MART101.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/marketplace">
              <Button className="h-12 px-8 text-base font-semibold">Browse Marketplace</Button>
            </Link>
            <Link to="/signup">
              <Button variant="secondary" className="h-12 px-8 text-base font-semibold">Create an Account</Button>
            </Link>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
};

export default SafeCampusTrading;
