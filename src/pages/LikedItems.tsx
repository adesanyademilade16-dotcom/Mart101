import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import LazyImage from "@/components/LazyImage";
import ConditionBadge from "@/components/ConditionBadge";
import PaymentBadge from "@/components/PaymentBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import LikeButton from "@/components/LikeButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

interface LikedProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  seller_id: string;
  condition: string;
  payment_type: string;
  seller_name?: string;
  seller_verified?: boolean;
}

const LikedItems = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<LikedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Liked Items",
    description: "Products you've liked on MART101.",
    path: "/liked",
    noindex: true,
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: likes } = await supabase
        .from("product_likes")
        .select("product_id, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!likes || likes.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const ids = likes.map((l) => l.product_id as string);
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .in("id", ids);

      const sellerIds = [...new Set((productsData || []).map((p: any) => p.seller_id as string))];
      const { data: profiles } = sellerIds.length
        ? await supabase.rpc("get_seller_public_info", { seller_ids: sellerIds })
        : { data: [] };
      const profileMap = new Map<string, any>(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      // Keep the order the user liked them in (most recently liked first)
      const productMap = new Map<string, any>(
        (productsData || []).map((p: any) => [p.id, p])
      );
      const ordered: LikedProduct[] = ids
        .map((id) => productMap.get(id))
        .filter(Boolean)
        .map((p: any) => ({
          ...p,
          seller_name: profileMap.get(p.seller_id)?.full_name,
          seller_verified: profileMap.get(p.seller_id)?.verified ?? false,
        }));

      setProducts(ordered);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-3 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Heart className="w-6 h-6 text-destructive fill-destructive" /> Liked Items
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {products.length} saved item{products.length !== 1 ? "s" : ""}
        </p>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No liked items yet</h2>
            <p className="text-muted-foreground mb-6">Tap the heart on any product to save it here.</p>
            <Link to="/marketplace">
              <Button variant="secondary" size="lg" className="font-semibold">Browse Marketplace</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-border/50 transition-all duration-200 hover:-translate-y-0.5 relative"
              >
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
                  {product.description && (
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2 leading-snug">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-secondary font-bold text-base">₦{Number(product.price).toLocaleString()}</p>
                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <LikeButton productId={product.id} className="text-xs" />
                    </div>
                  </div>
                  <ConditionBadge condition={product.condition || "Brand New"} className="mt-1" />
                  <PaymentBadge paymentType={product.payment_type || "Pay on Delivery"} className="mt-1" />
                  <p className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
                    <Link to={`/seller/${product.seller_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-secondary transition-colors hover:underline">
                      {product.seller_name || "Seller"}
                    </Link>
                    {product.seller_verified && <VerifiedBadge />}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LikedItems;
