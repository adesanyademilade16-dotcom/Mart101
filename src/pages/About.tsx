import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Zap, Shield, Upload, ShieldCheck } from "lucide-react";

const whyBlocks = [
  { icon: Zap, title: "Fast & Direct", desc: "Buyers connect directly via WhatsApp — no middleman." },
  { icon: Shield, title: "Campus Safe", desc: "Student-focused listings only, keeping it relevant." },
  { icon: Upload, title: "Simple", desc: "Easy product upload and seamless browsing experience." },
  { icon: ShieldCheck, title: "Secure", desc: "Admin monitoring and community reporting system." },
];

const team = ["GREMLIN", "CODEX", "MOTBUG"];

const About = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-navy text-primary-foreground py-16 px-4 text-center">
          <h1 className="text-4xl font-bold mb-2">About MART101</h1>
          <p className="text-gold font-cursive text-xl mb-4">Built by students, for students.</p>
          <p className="max-w-xl mx-auto text-primary-foreground/80 leading-relaxed">
            MART101 is the leading OOU marketplace — a campus buy and sell platform built for Olabisi Onabanjo University students. Join thousands of students across Nigeria who trust MART101 for safe, fast campus trading.
          </p>
        </section>

        {/* Campus Context */}
        <section className="container mx-auto px-4 pt-10 pb-4 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Buy and Sell on Campus in Nigeria</h2>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Campus life at Olabisi Onabanjo University can be expensive and hectic. MART101 helps OOU students sell what they no longer need and find affordable items — right from their hostel or department. Whether it's textbooks, gadgets, fashion, or daily essentials, MART101 is the go-to student marketplace for OOU.
          </p>
        </section>

        {/* Mission */}
        <section className="container mx-auto px-4 py-10 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
          <div className="glass-card p-8">
            <p className="text-foreground/80 leading-relaxed text-lg">
              Our mission is to make campus trading <strong className="text-secondary">simple, fast, and secure</strong> by connecting students directly through WhatsApp — eliminating stress and making transactions easier than ever.
            </p>
          </div>
        </section>

        {/* Why MART101 */}
        <section className="bg-muted/40 py-14 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Why MART101?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {whyBlocks.map((b) => (
                <div key={b.title} className="glass-card p-6 flex items-start gap-4">
                  <div className="bg-secondary/15 rounded-xl p-3 shrink-0">
                    <b.icon className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{b.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="container mx-auto px-4 py-14 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Built by TRIFORGE</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xl mx-auto mb-14">
            MART101 is proudly developed and maintained by TRIFORGE a team passionate about building practical technology solutions for students.
          </p>

          <div className="flex flex-col items-center">
            {/* Root node */}
            <div className="glass-card px-8 py-5 rounded-2xl shadow-lg flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-secondary/15 flex items-center justify-center mb-2">
                <span className="text-secondary font-bold text-lg">🕸</span>
              </div>
              <span className="font-bold text-foreground text-lg tracking-wide">TRIFORGE</span>
            </div>

            {/* Trunk line down from root */}
            <div className="w-px h-8 bg-border" />

            {/* Horizontal connector bar */}
            <div className="relative w-full max-w-md">
              <div className="absolute top-0 left-[16.66%] right-[16.66%] h-px bg-border" />
            </div>

            {/* Branches */}
            <div className="flex justify-center gap-12 sm:gap-16 w-full max-w-md">
              {team.map((name) => (
                <div key={name} className="flex flex-col items-center">
                  <div className="w-px h-8 bg-border" />
                  <div className="glass-card px-5 py-4 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center mx-auto mb-2">
                      <span className="text-secondary font-bold text-sm">{name[0]}</span>
                    </div>
                    <span className="font-semibold text-foreground text-sm tracking-wide whitespace-nowrap">
                      {name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
};

export default About;
