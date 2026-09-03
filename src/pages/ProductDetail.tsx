import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, ShoppingBag, Flag, AlertTriangle } from "lucide-react";
import LazyImage from "@/components/LazyImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import ConditionBadge from "@/components/ConditionBadge";
import PaymentBadge from "@/components/PaymentBadge";
import PaymentTrustMessage from "@/components/PaymentTrustMessage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { formatNigerianWhatsapp } from "@/lib/formatWhatsapp";
import { useToast } from "@/hooks/use-toast";
import ConfirmModal from "@/components/ConfirmModal";
import MessageSellerButton from "@/components/MessageSellerButton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

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
  delivery_timeframe: string | null;
  defects_description: string | null;
  extra_image_urls: string[] | null;
  flagged: boolean;
  profiles?: {
    full_name: string;
    whatsapp_number: string;
    verified?: boolean;
    user_id?: string;
  };
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { toast } = useToast();

  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs: string[] = [];
    if (product.image_url) imgs.push(product.image_url);
    if (product.extra_image_urls) imgs.push(...product.extra_image_urls);
    return imgs;
  }, [product]);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        const { data: profileArr } = await supabase
          .rpc("get_seller_public_info", { seller_ids: [data.seller_id] });
        const profile = profileArr?.[0] || null;

        setProduct({
          ...data,
          profiles: profile || undefined,
        } as Product);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  useSEO(
    product
      ? {
          title: `${product.name} - ₦${Number(product.price).toLocaleString()}`,
          description: (product.description || `${product.name} available on MART101, OOU's student marketplace.`).slice(0, 160),
          path: `/product/${product.id}`,
          image: product.image_url || undefined,
          structuredData: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description || product.name,
            image: product.image_url ? [product.image_url] : undefined,
            offers: {
              "@type": "Offer",
              priceCurrency: "NGN",
              price: product.price,
              availability: "https://schema.org/InStock",
              url: `https://mart101.vercel.app/product/${product.id}`,
            },
          },
        }
      : {
          title: "Product",
          description: "View this listing on MART101.",
          path: `/product/${id}`,
        }
  );

  const handleBuy = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setShowAuthPrompt(true);
      return;
    }
    if (!product?.profiles?.whatsapp_number) {
      toast({ title: "Seller contact unavailable", variant: "destructive" });
      return;
    }
    const phone = formatNigerianWhatsapp(product.profiles.whatsapp_number);
    const message = encodeURIComponent(
      `Hello, I am interested in buying your ${product.name} listed on MART101.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-foreground font-semibold">Product not found</p>
        <Link to="/marketplace">
          <Button variant="secondary">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-navy sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/marketplace" className="flex items-center gap-2">
            <BrandLogo size="md" />
            <span className="font-cursive text-2xl text-gold">MART101</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-3">
            {allImages.length > 0 ? (
              <Carousel
                className="w-full"
                opts={{ loop: true }}
                setApi={(api) => {
                  api?.on("select", () => {
                    setCurrentSlide(api.selectedScrollSnap());
                  });
                }}
              >
                <CarouselContent>
                  {allImages.map((url, i) => (
                    <CarouselItem key={i}>
                      <div className="aspect-square rounded-2xl overflow-hidden">
                        <LazyImage
                          src={url}
                          alt={`${product.name} ${i + 1}`}
                          className="w-full h-full object-cover"
                          wrapperClassName="w-full h-full rounded-2xl"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {allImages.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2 bg-background/80 border-border" />
                    <CarouselNext className="right-2 bg-background/80 border-border" />
                    <div className="flex justify-center gap-1.5 mt-3">
                      {allImages.map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i === currentSlide ? "bg-secondary" : "bg-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </Carousel>
            ) : (
              <div className="aspect-square bg-muted flex items-center justify-center rounded-2xl">
                <ShoppingBag className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-3xl font-bold text-secondary">
                ₦{Number(product.price).toLocaleString()}
              </p>
              <ConditionBadge condition={product.condition || "Brand New"} />
              <PaymentBadge paymentType={product.payment_type || "Pay on Delivery"} />
            </div>
            <p className="text-muted-foreground text-sm mt-2 flex items-center gap-1">
              Sold by{" "}
              <Link to={`/seller/${product.seller_id}`} className="font-semibold text-foreground hover:text-secondary transition-colors hover:underline">
                {product.profiles?.full_name || "Seller"}
              </Link>
              {product.profiles?.verified && <VerifiedBadge />}
            </p>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Description</h2>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {product.description || "No description provided."}
              </div>
            </div>

            {product.defects_description && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold text-foreground mb-1">Known Issues / Defects</h2>
                <p className="text-muted-foreground whitespace-pre-line text-sm">{product.defects_description}</p>
              </div>
            )}

            {product.category && (
              <span className="inline-block mt-3 text-xs font-medium bg-secondary/10 text-secondary px-3 py-1 rounded-full">
                {product.category}
              </span>
            )}

            {product.delivery_timeframe && (
              <p className="text-sm text-muted-foreground mt-2">
               Delivery timeframe: <span className="font-medium text-foreground">{product.delivery_timeframe}</span>
              </p>
            )}

            <div className="mt-4">
              <PaymentTrustMessage paymentType={product.payment_type || "Pay on Delivery"} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <MessageSellerButton
                sellerId={product.seller_id}
                productId={product.id}
                className="w-full font-semibold text-base h-14"
              />
              <Button
                onClick={handleBuy}
                variant="secondary"
                className="w-full font-semibold text-base h-14"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setShowReport(true)}
            >
              <Flag className="w-4 h-4 mr-2" />
               Report Product
            </Button>

            <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              Always meet on campus when possible and be cautious with advance payments.
            </p>
          </div>
        </div>
      </main>

      <ConfirmModal
        open={showReport}
        onOpenChange={setShowReport}
        title="Report Product"
        description="Are you sure you want to report this item? False reports may lead to restrictions."
        confirmLabel="Report"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast({ title: "Please log in to report", variant: "destructive" });
            return;
          }
          const { error } = await supabase.from("product_reports").insert({
            product_id: product.id,
            reporter_id: session.user.id,
            report_type: "item",
            seller_id: product.seller_id,
            seller_name: product.profiles?.full_name || "Unknown",
            item_name: product.name,
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
        }}
      />

      <ConfirmModal
        open={showAuthPrompt}
        onOpenChange={setShowAuthPrompt}
        title="Sign in to continue"
        description="Create an account or sign in to view seller contact info and buy this item."
        confirmLabel="Sign In"
        cancelLabel="Cancel"
        onConfirm={() => navigate("/login")}
      />
    </div>
  );
};

export default ProductDetail;
