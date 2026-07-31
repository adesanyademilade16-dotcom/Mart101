import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Search, Flag } from "lucide-react";
import LazyImage from "@/components/LazyImage";
import ConditionBadge from "@/components/ConditionBadge";
import PaymentBadge from "@/components/PaymentBadge";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppHeader from "@/components/AppHeader";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/categories";
import { PRODUCT_CONDITIONS } from "@/lib/conditions";
import ConfirmModal from "@/components/ConfirmModal";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  seller_id: string;
  category: string;
  condition: string;
  payment_type: string;
  flagged: boolean;
  profiles?: {
    full_name: string;
    whatsapp_number: string;
    verified?: boolean;
  };
}

const Marketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [conditionFilter, setConditionFilter] = useState("All");
  const { toast } = useToast();
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const sellerIds = [...new Set(productsData.map((p) => p.seller_id))];
      const { data: profilesData } = await supabase
        .rpc("get_seller_public_info", { seller_ids: sellerIds });

      const profileMap = new Map((profilesData || []).map((p) => [p.user_id, p]));

      const merged = productsData.map((p) => ({
        ...p,
        profiles: profileMap.get(p.seller_id) || undefined,
      }));

      setProducts(merged as any);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const handleReportClick = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setReportTarget({ id: product.id, name: product.name });
  };

  const confirmReport = async () => {
    if (!reportTarget) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Please log in to report a product", variant: "destructive" });
      setReportTarget(null);
      return;
    }
    const { error } = await supabase.from("product_reports").insert({
      product_id: reportTarget.id,
      reporter_id: session.user.id,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already reported", description: "You have already reported this product." });
      } else {
        toast({ title: "Error reporting product", variant: "destructive" });
      }
    } else {
      toast({ title: "Product reported", description: "An admin will review this listing." });
    }
    setReportTarget(null);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
    const matchesCondition = conditionFilter === "All" || p.condition === conditionFilter;
    return matchesSearch && matchesCategory && matchesCondition;
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Intro + Search & Filter */}
      <section className="bg-navy pb-6 pt-4">
        <h1 className="sr-only">OOU Student Marketplace</h1>
        <p className="text-primary-foreground/70 text-sm text-center max-w-lg mx-auto px-4 pb-3">
          Browse items listed by students of Olabisi Onabanjo University (OOU). Buy and sell within campus easily.
        </p>
        <div className="max-w-2xl mx-auto px-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search products or sellers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-full bg-background/95 border-secondary/30 text-foreground shadow-lg"
            />
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-background/95 border-secondary/30 rounded-full h-10 flex-1">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="bg-background/95 border-secondary/30 rounded-full h-10 flex-1">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Items</SelectItem>
                {PRODUCT_CONDITIONS.map((cond) => (
                  <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Products grid */}
      <main className="container mx-auto px-3 py-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse bg-muted rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No products yet</h2>
            <p className="text-muted-foreground mb-6">Be the first to list a product!</p>
            <Link to="/signup">
              <Button variant="secondary" size="lg" className="font-semibold">Start Selling</Button>
            </Link>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No results found</h2>
            <p className="text-muted-foreground">Try a different search term or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
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
                  <p className="text-secondary font-bold text-base mt-1.5">₦{Number(product.price).toLocaleString()}</p>
                  <ConditionBadge condition={product.condition || "Brand New"} className="mt-1" />
                  <PaymentBadge paymentType={product.payment_type || "Pay on Delivery"} className="mt-1" />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <Link to={`/seller/${product.seller_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-secondary transition-colors hover:underline">
                        {product.profiles?.full_name || "Seller"}
                      </Link>
                      {product.profiles?.verified && <VerifiedBadge />}
                    </p>
                    <button
                      onClick={(e) => handleReportClick(e, product)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Report product"
                      aria-label={`Report ${product.name}`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={!!reportTarget}
        onOpenChange={(open) => { if (!open) setReportTarget(null); }}
        title="Report Product"
        description={`Are you sure you want to report "${reportTarget?.name}"? False reports may lead to restrictions.`}
        confirmLabel="Confirm Report"
        variant="destructive"
        onConfirm={confirmReport}
      />
    </div>
  );
};

export default Marketplace;
