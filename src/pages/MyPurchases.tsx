import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Camera, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import ConfirmModal from "@/components/ConfirmModal";

const CLOUDINARY_CLOUD_NAME = "oxt5nzu7";
const CLOUDINARY_UPLOAD_PRESET = "mart101_avatars";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

interface OrderRow {
  id: string;
  product_name: string;
  product_image_url: string | null;
  seller_id: string;
  total_paid: number;
  status: string;
  proof_image_url: string | null;
  auto_release_at: string | null;
  dispute_reason: string | null;
  seller_name?: string;
}

const MyPurchases = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const sellerIds = [...new Set(data.map((o) => o.seller_id))];
        const { data: sellerArr } = await supabase.rpc("get_seller_public_info", { seller_ids: sellerIds });
        const sellerMap = new Map((sellerArr || []).map((s: any) => [s.user_id, s.full_name]));
        setOrders(data.map((o) => ({ ...o, seller_name: sellerMap.get(o.seller_id) || "Seller" })));
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleProofUpload = async (orderId: string, file: File) => {
    setUploadingFor(orderId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const { error } = await supabase.from("orders").update({ proof_image_url: data.secure_url }).eq("id", orderId);
      if (error) throw error;

      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, proof_image_url: data.secure_url } : o));
      toast({ title: "Photo added" });
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploadingFor(null);
    }
  };

  const handleConfirmReceived = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order?.proof_image_url) {
      toast({ title: "Add a photo first", description: "Upload a photo with the item before confirming.", variant: "destructive" });
      setConfirmingId(null);
      return;
    }
    const { error } = await supabase.from("orders").update({ status: "released" }).eq("id", orderId);
    if (error) {
      toast({ title: "Could not confirm", description: "Please try again.", variant: "destructive" });
      return;
    }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "released" } : o));
    toast({ title: "Thanks for confirming!", description: "The seller will be paid out shortly." });
    setConfirmingId(null);
  };

  const handleSubmitDispute = async () => {
    if (!disputeId) return;
    if (!disputeReason.trim()) {
      toast({ title: "Tell us what went wrong", variant: "destructive" });
      return;
    }
    setSubmittingDispute(true);
    const { error } = await supabase.from("orders").update({ status: "disputed", dispute_reason: disputeReason.trim() }).eq("id", disputeId);
    setSubmittingDispute(false);
    if (error) {
      toast({ title: "Could not submit", description: "Please try again.", variant: "destructive" });
      return;
    }
    setOrders((prev) => prev.map((o) => o.id === disputeId ? { ...o, status: "disputed" } : o));
    toast({ title: "Reported to admin", description: "We'll look into this and get back to you." });
    setDisputeId(null);
    setDisputeReason("");
  };

  const daysLeft = (autoReleaseAt: string | null) => {
    if (!autoReleaseAt) return null;
    return Math.max(0, Math.ceil((new Date(autoReleaseAt).getTime() - Date.now()) / 86400000));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-navy sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Link to="/marketplace" className="flex items-center gap-2">
            <BrandLogo size="md" />
            <span className="font-cursive text-2xl text-gold">MART101</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">My Purchases</h1>

        {orders.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">You haven't bought anything through Mart101 Pay yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-border rounded-xl p-4">
                <div className="flex gap-3">
                  {order.product_image_url ? (
                    <img src={order.product_image_url} alt={order.product_name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{order.product_name}</p>
                    <p className="text-sm text-muted-foreground">Sold by {order.seller_name}</p>
                    <p className="text-sm font-semibold text-secondary">₦{Number(order.total_paid).toLocaleString()}</p>
                  </div>
                  <div>
                    {order.status === "pending_payment" && <span className="text-xs font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">Payment awaiting confirmation</span>}
                    {order.status === "paid_held" && <span className="text-xs font-medium bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">Awaiting pickup</span>}
                    {order.status === "released" && <span className="text-xs font-medium bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full">Completed</span>}
                    {order.status === "disputed" && <span className="text-xs font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">Refund requested</span>}
                    {order.status === "refunded" && <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">Refunded</span>}
                  </div>
                </div>

                {order.status === "paid_held" && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {daysLeft(order.auto_release_at) !== null && (
                      <p className="text-xs text-muted-foreground">
                        {daysLeft(order.auto_release_at)} day(s) left to confirm or report an issue — after that it auto-releases to the seller.
                      </p>
                    )}
                    <input
                      ref={(el) => (fileInputRefs.current[order.id] = el)}
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleProofUpload(order.id, file); e.target.value = ""; }}
                    />
                    {order.proof_image_url ? (
                      <img src={order.proof_image_url} alt="Proof of receipt" className="w-20 h-20 rounded-lg object-cover" />
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[order.id]?.click()} disabled={uploadingFor === order.id}>
                        <Camera className="w-4 h-4 mr-2" />
                        {uploadingFor === order.id ? "Uploading..." : "Add photo with item"}
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => setConfirmingId(order.id)}>Confirm Received</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => setDisputeId(order.id)}>
                        <ShieldAlert className="w-4 h-4 mr-1" /> Report Issue
                      </Button>
                    </div>
                  </div>
                )}

                {order.status === "disputed" && order.dispute_reason && (
                  <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">Your note: "{order.dispute_reason}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={!!confirmingId}
        onOpenChange={(open) => { if (!open) setConfirmingId(null); }}
        title="Confirm you received this item"
        description="This releases payment to the seller and can't be undone. Only confirm if you're satisfied with the item."
        confirmLabel="Yes, I received it"
        onConfirm={() => confirmingId && handleConfirmReceived(confirmingId)}
      />

      {disputeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-foreground mb-2">What went wrong?</h3>
            <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="e.g. Item wasn't as described, seller never showed up..." className="mb-4" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDisputeId(null); setDisputeReason(""); }}>Cancel</Button>
              <Button className="flex-1" onClick={handleSubmitDispute} disabled={submittingDispute}>{submittingDispute ? "Submitting..." : "Submit"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPurchases;
