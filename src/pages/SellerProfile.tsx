import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, MessageCircle, Flag, CalendarDays, Package } from "lucide-react";
import LazyImage from "@/components/LazyImage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatNigerianWhatsapp } from "@/lib/formatWhatsapp";
import AppHeader from "@/components/AppHeader";
import VerifiedBadge from "@/components/VerifiedBadge";
import ConfirmModal from "@/components/ConfirmModal";

interface SellerData {
  user_id: string;
  full_name: string;
  whatsapp_number: string;
  department: string;
  level: string;
  verified: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category: string;
}

const SellerProfile = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const { toast } = useToast();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!sellerId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      const { data: profileArr } = await supabase
        .rpc("get_seller_public_info", { seller_ids: [sellerId] });
      const profile = profileArr?.[0] || null;

      if (profile) setSeller(profile as SellerData);

      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, description, image_url, category")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      setProducts(prods || []);
      setLoading(false);
    };
    fetchSeller();
  }, [sellerId]);

  const handleContact = () => {
    if (!seller) return;
    const phone = formatNigerianWhatsapp(seller.whatsapp_number);
    const message = encodeURIComponent("Hello! I found your profile on MART101 and I'm interested in your products.");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const handleReportConfirm = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Please log in to report", variant: "destructive" });
      return;
    }
    if (!seller) return;
    const { error } = await supabase.from("product_reports").insert({
      reporter_id: session.user.id,
      report_type: "seller",
      seller_id: seller.user_id,
      seller_name: seller.full_name,
      product_id: null,
      item_name: null,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already reported", description: "You have already reported this seller." });
      } else {
        toast({ title: "Error reporting seller", variant: "destructive" });
      }
    } else {
      toast({ title: "Seller reported", description: "An admin will review this seller." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xl text-foreground font-semibold">Sign in to view this seller</p>
        <p className="text-muted-foreground text-sm max-w-sm">
          Create an account or sign in to view seller info and contact them.
        </p>
        <div className="flex gap-3">
          <Link to="/login"><Button variant="secondary">Sign In</Button></Link>
          <Link to="/marketplace"><Button variant="outline">Back to Marketplace</Button></Link>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-foreground font-semibold">Seller not found</p>
        <Link to="/marketplace"><Button variant="secondary">Back to Marketplace</Button></Link>
      </div>
    );
  }

  const joinDate = new Date(seller.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>

        {/* Seller Card */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-2xl font-bold shrink-0">
              {seller.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{seller.full_name}</h1>
                {seller.verified && <VerifiedBadge className="w-5 h-5" />}
              </div>
              <p className="text-muted-foreground text-sm">{seller.department} · Level {seller.level}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Joined {joinDate}</span>
                <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {products.length} item{products.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button onClick={handleContact} variant="secondary" className="font-semibold flex-1 sm:flex-none">
              <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
            </Button>
            <Button onClick={() => setShowReportConfirm(true)} variant="outline" className="flex-1 sm:flex-none">
              <Flag className="w-4 h-4 mr-1.5" /> Report
            </Button>
          </div>
        </div>

        {/* Seller Products */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Products by {seller.full_name}</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">This seller has no products yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-border/50 transition-all duration-200 hover:-translate-y-0.5">
                <div className="aspect-square overflow-hidden">
                  {product.image_url ? (
                    <LazyImage src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" wrapperClassName="w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-foreground text-sm leading-tight truncate">{product.name}</h3>
                  <p className="text-secondary font-bold text-base mt-1">₦{Number(product.price).toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={showReportConfirm}
        onOpenChange={setShowReportConfirm}
        title="Report Seller"
        description="Are you sure you want to report this seller?"
        confirmLabel="Report"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleReportConfirm}
      />
    </div>
  );
};

export default SellerProfile;
