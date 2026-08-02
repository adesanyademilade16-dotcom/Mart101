import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, ShieldCheck, Eye, Flag, ArrowRight } from "lucide-react";
import LazyImage from "@/components/LazyImage";
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import VerifiedBadge from "@/components/VerifiedBadge";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import InstallAppButton from "@/components/InstallAppButton";

interface RecentProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  seller_id: string;
  seller_name?: string;
  seller_verified?: boolean;
}

const trustSignals = [
  { icon: ShieldCheck, title: "Verified Sellers", desc: "Every seller is verified to ensure safe and trusted transactions on campus." },
  { icon: Eye, title: "Admin Monitoring", desc: "Our admin team actively monitors listings to keep the marketplace clean and reliable." },
  { icon: Flag, title: "Report System", desc: "Easily report suspicious listings or sellers — we act fast to protect the community." },
];

const SplashScreen = () => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, image_url, seller_id")
        .order("created_at", { ascending: false })
        .limit(8);

      if (!products || products.length === 0) { setRecentProducts([]); return; }

      const sellerIds = [...new Set(products.map((p) => p.seller_id))];
      const { data: profiles } = await supabase
        .rpc("get_seller_public_info", { seller_ids: sellerIds });

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      setRecentProducts(products.map((p) => ({
        ...p,
        seller_name: profileMap.get(p.seller_id)?.full_name,
        seller_verified: profileMap.get(p.seller_id)?.verified ?? false,
      })));
    };
    fetchRecent();
  }, []);

  if (!showContent) {
    return (
      <div className="fixed inset-0 gradient-splash flex flex-col items-center justify-center overflow-hidden">
        <div className="animate-fade-in">
          <BrandLogo size="xl" showGlow />
        </div>
        <h1 className="animate-fade-in-up animate-delay-300 text-5xl font-cursive text-gold mt-8 drop-shadow-lg">MART101</h1>
        <p className="animate-fade-in-up animate-delay-600 text-primary-foreground text-lg mt-3 tracking-wide font-light">The Ultimate Campus Marketplace</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-navy py-14 px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BrandLogo size="lg" />
            <span className="font-cursive text-4xl text-gold">MART101</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-3">
            Buy and Sell Easily in OOU
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-4">
            MART101 is OOU's dedicated student marketplace, making it easy to buy, sell, and discover great deals within a trusted campus community.
          </p>
          <p className="text-primary-foreground/60 text-sm max-w-lg mx-auto mb-6">
            Find what you need, sell what you don't, and connect with trusted OOU students in one secure campus marketplace.
          </p>
          <button onClick={() => navigate("/marketplace")} className="bg-secondary text-secondary-foreground font-semibold px-8 py-3 rounded-full hover:bg-secondary/90 transition-colors text-lg">
            Explore Marketplace
          </button>
          <div className="flex justify-center">
            <InstallAppButton />
          </div>
        </section>

        {/* Trust Signals */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why OOU Students Trust MART101</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {trustSignals.map((s) => (
              <div key={s.title} className="bg-card rounded-xl p-6 text-center shadow-sm border border-border/50">
                <div className="bg-secondary/15 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recently Added */}
        {recentProducts.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">Recently Added</h2>
              <Link to="/marketplace" className="text-sm text-secondary hover:underline font-medium">View all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
              {recentProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group min-w-[160px] max-w-[200px] flex-shrink-0 snap-start bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-border/50 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="aspect-square overflow-hidden">
                    {product.image_url ? (
                      <LazyImage src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" wrapperClassName="w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="font-medium text-foreground text-sm leading-tight truncate">{product.name}</h3>
                    <p className="text-secondary font-bold text-sm mt-1">₦{Number(product.price).toLocaleString()}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                      {product.seller_name || "Seller"}
                      {product.seller_verified && <VerifiedBadge />}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* About Snippet */}
        <section className="bg-muted/40 py-12 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Marketplace for OOU Students</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
               Built exclusively for OOU students, MART101 provides a trusted platform for campus commerce and student-to-student connections.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm mb-6">
              Uni life at Olabisi Onabanjo University is easier with MART101. Students across all campus and faculties use our platform to <Link to="/marketplace" className="text-secondary font-medium hover:underline">buy and sell in OOU</Link> from lecture materials to personal items. Explore the <Link to="/marketplace" className="text-secondary font-medium hover:underline">OOU marketplace</Link> today.
            </p>
            <Link to="/about" className="inline-flex items-center gap-1 text-secondary font-semibold hover:underline">
              Learn more about us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
};

export default SplashScreen;
