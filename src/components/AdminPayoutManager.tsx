import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock, RefreshCw, Upload, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CLOUDINARY_CLOUD_NAME = "oxt5nzu7";
const CLOUDINARY_UPLOAD_PRESET = "mart101_avatars";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

interface SellerProfile {
  user_id: string;
  full_name: string;
  email: string;
  payment_status?: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
}

interface PayoutOrder {
  id: string;
  product_name: string | null;
  buyer_id: string;
  seller_id: string;
  seller_payout: number | null;
  status: string;
  paid_at: string | null;
  created_at: string | null;
}

interface PayoutRecord {
  id: string;
  order_id: string;
  seller_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  transfer_reference: string;
  proof_image_url: string | null;
  notes: string | null;
  paid_at: string;
}

interface AdminPayoutManagerProps {
  sellers: SellerProfile[];
  onPayoutRecorded?: (details: string, sellerId: string) => Promise<void>;
}

const AdminPayoutManager = ({ sellers, onPayoutRecorded }: AdminPayoutManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<PayoutOrder[]>([]);
  const [sellerFavorOrderIds, setSellerFavorOrderIds] = useState<string[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [transferRefs, setTransferRefs] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const [ordersResult, disputesResult, payoutsResult] = await Promise.all([
      supabase.from("orders")
        .select("id,product_name,buyer_id,seller_id,seller_payout,status,paid_at,created_at")
        .in("status", ["released", "disputed"])
        .order("paid_at", { ascending: false })
        .limit(1000),
      supabase.from("order_disputes")
        .select("order_id")
        .eq("status", "resolved")
        .eq("resolution", "seller_favor"),
      supabase.from("seller_payouts")
        .select("id,order_id,seller_id,amount,bank_name,account_number,account_name,transfer_reference,proof_image_url,notes,paid_at")
        .order("paid_at", { ascending: false })
        .limit(1000),
    ]);

    const error = ordersResult.error || disputesResult.error || payoutsResult.error;
    if (error) toast({ title: "Could not load payout records", description: error.message, variant: "destructive" });
    setOrders((ordersResult.data || []) as PayoutOrder[]);
    setSellerFavorOrderIds((disputesResult.data || []).map((item: any) => item.order_id));
    setPayouts((payoutsResult.data || []) as PayoutRecord[]);
    setLoading(false);
    setRefreshing(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const sellerMap = useMemo(() => new Map(sellers.map((seller) => [seller.user_id, seller])), [sellers]);
  const sellerFavorIds = useMemo(() => new Set(sellerFavorOrderIds), [sellerFavorOrderIds]);
  const paidOrderIds = useMemo(() => new Set(payouts.map((payout) => payout.order_id)), [payouts]);
  const eligibleOrders = useMemo(() => orders.filter((order) => {
    const eligible = order.status === "released" || (order.status === "disputed" && sellerFavorIds.has(order.id));
    return eligible && !paidOrderIds.has(order.id);
  }), [orders, sellerFavorIds, paidOrderIds]);
  const eligibleTotal = eligibleOrders.reduce((sum, order) => sum + Number(order.seller_payout || 0), 0);
  const paidTotal = payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

  const uploadProof = async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file for transfer evidence.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Transfer evidence must be smaller than 10 MB.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `Cloudinary upload failed (${response.status}).`);
    const url = payload?.secure_url;
    if (typeof url !== "string" || !url.startsWith(`https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`)) {
      throw new Error("Cloudinary did not return a valid evidence image URL.");
    }
    return url;
  };

  const recordPayout = async (order: PayoutOrder) => {
    const seller = sellerMap.get(order.seller_id);
    const reference = (transferRefs[order.id] || "").trim();
    if (!reference) {
      toast({ title: "Transfer reference required", description: "Enter the bank transfer reference before recording this payout.", variant: "destructive" });
      return;
    }
    if (!seller || seller.payment_status !== "approved" || !seller.bank_name || !seller.account_number || !seller.account_name) {
      toast({ title: "Seller bank details not approved", description: "Review and approve the seller's bank details before recording a payout.", variant: "destructive" });
      return;
    }
    if (!order.seller_payout || Number(order.seller_payout) <= 0) {
      toast({ title: "Invalid seller payout", description: "This order does not have a valid seller payout amount.", variant: "destructive" });
      return;
    }

    setSavingOrderId(order.id);
    try {
      let proofUrl: string | null = null;
      if (proofFiles[order.id]) proofUrl = await uploadProof(proofFiles[order.id] as File);

      const { data, error } = await supabase.from("seller_payouts").insert({
        order_id: order.id,
        transfer_reference: reference,
        proof_image_url: proofUrl,
        notes: (notes[order.id] || "").trim() || null,
      }).select("id,order_id,seller_id,amount,bank_name,account_number,account_name,transfer_reference,proof_image_url,notes,paid_at").single();
      if (error) throw new Error(error.message);

      const payout = data as PayoutRecord;
      setPayouts((previous) => [payout, ...previous]);
      setTransferRefs((previous) => ({ ...previous, [order.id]: "" }));
      setNotes((previous) => ({ ...previous, [order.id]: "" }));
      setProofFiles((previous) => ({ ...previous, [order.id]: null }));
      await onPayoutRecorded?.(`Recorded manual payout of ₦${Number(payout.amount).toLocaleString()} for order ${order.id}. Transfer reference: ${payout.transfer_reference}.`, payout.seller_id);
      toast({ title: "Seller payout recorded", description: "The manual transfer has been added to the permanent payout history." });
    } catch (error) {
      toast({ title: "Could not record payout", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSavingOrderId(null);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground">Loading seller payout records…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Wallet className="w-5 h-5" /> Seller Payout Management</h2><p className="text-sm text-muted-foreground">Record manual bank transfers only after they have actually been completed.</p></div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Eligible unpaid amount</p><p className="text-2xl font-bold mt-1">₦{eligibleTotal.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{eligibleOrders.length} orders awaiting payout</p></div>
        <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Payouts recorded</p><p className="text-2xl font-bold mt-1">₦{paidTotal.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{payouts.length} completed records</p></div>
        <div className="rounded-xl border border-border p-4 col-span-2 xl:col-span-1"><p className="text-xs text-muted-foreground">Important</p><p className="text-sm mt-1">MART101 pays sellers manually from the owner's bank account. This tool records a completed transfer; it does not initiate one.</p></div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><h3 className="font-semibold">Eligible orders awaiting payout</h3></div>
        {eligibleOrders.length === 0 ? <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">No orders are currently eligible for seller payout.</div> : eligibleOrders.map((order) => {
          const seller = sellerMap.get(order.seller_id);
          const bankReady = !!seller && seller.payment_status === "approved" && !!seller.bank_name && !!seller.account_number && !!seller.account_name;
          const amountReady = Number(order.seller_payout || 0) > 0;
          const busy = savingOrderId === order.id;
          return (
            <div key={order.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold">{order.product_name || "Purchase"}</p><p className="text-xs text-muted-foreground break-all">Order {order.id}</p><p className="text-xs text-muted-foreground">Seller: {seller?.full_name || order.seller_id} {seller?.email ? `· ${seller.email}` : ""}</p></div>
                <div className="text-right"><p className="text-lg font-bold">₦{Number(order.seller_payout || 0).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Seller payout amount</p></div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <p className="font-semibold">Approved payout destination</p>
                <p>{seller?.bank_name || "Bank details missing"}</p><p>{seller?.account_number || "Account number missing"}</p><p>{seller?.account_name || "Account name missing"}</p>
                {!bankReady && <p className="text-amber-600 pt-1">Payout blocked until seller bank details are complete and approved.</p>}
                {!amountReady && <p className="text-destructive pt-1">This order has no valid seller payout amount.</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={transferRefs[order.id] || ""} onChange={(event) => setTransferRefs((previous) => ({ ...previous, [order.id]: event.target.value }))} placeholder="Bank transfer reference *" aria-label={`Transfer reference for ${order.id}`} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
                <input value={notes[order.id] || ""} onChange={(event) => setNotes((previous) => ({ ...previous, [order.id]: event.target.value }))} placeholder="Admin note (optional)" aria-label={`Payout note for ${order.id}`} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-xs hover:bg-accent">
                <Upload className="w-4 h-4" /> {proofFiles[order.id]?.name || "Attach transfer evidence (optional)"}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => setProofFiles((previous) => ({ ...previous, [order.id]: event.target.files?.[0] || null }))} />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">Only record after the bank transfer is successful.</p>
                <Button size="sm" onClick={() => void recordPayout(order)} disabled={busy || !bankReady || !amountReady || !transferRefs[order.id]?.trim()}>{busy ? "Recording…" : "Record transfer as paid"}</Button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><h3 className="font-semibold">Completed payout history</h3></div>
        {payouts.length === 0 ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No payouts have been recorded yet.</p> : (
          <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Seller / order</th><th className="p-3">Amount</th><th className="p-3">Destination</th><th className="p-3">Transfer reference</th><th className="p-3">Paid at</th><th className="p-3">Evidence</th></tr></thead><tbody>
            {payouts.map((payout) => { const seller = sellerMap.get(payout.seller_id); return <tr key={payout.id} className="border-t border-border align-top"><td className="p-3 min-w-48"><p className="font-medium">{seller?.full_name || payout.seller_id}</p><p className="text-xs text-muted-foreground break-all">{payout.order_id}</p></td><td className="p-3 whitespace-nowrap font-semibold">₦{Number(payout.amount).toLocaleString()}</td><td className="p-3 min-w-40 text-xs"><p>{payout.bank_name}</p><p>{payout.account_number}</p><p>{payout.account_name}</p></td><td className="p-3 min-w-36 text-xs break-all">{payout.transfer_reference}{payout.notes && <p className="text-muted-foreground mt-1">{payout.notes}</p>}</td><td className="p-3 whitespace-nowrap text-xs">{new Date(payout.paid_at).toLocaleString()}</td><td className="p-3 text-xs">{payout.proof_image_url ? <a href={payout.proof_image_url} target="_blank" rel="noreferrer" className="text-secondary underline">View proof</a> : "—"}</td></tr>; })}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
};

export default AdminPayoutManager;
