import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Wallet, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SellerOrder {
  id: string;
  product_name: string | null;
  seller_payout: number | null;
  status: string;
  created_at: string | null;
}

interface SellerPayout {
  id: string;
  order_id: string;
  amount: number;
  transfer_reference: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paid_at: string;
  proof_image_url: string | null;
}

const SellerPayoutPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [sellerFavorOrderIds, setSellerFavorOrderIds] = useState<string[]>([]);
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setOrders([]);
      setPayouts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [ordersResult, disputesResult, payoutsResult] = await Promise.all([
      supabase.from("orders")
        .select("id,product_name,seller_payout,status,created_at")
        .eq("seller_id", session.user.id)
        .in("status", ["released", "disputed"])
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("order_disputes")
        .select("order_id")
        .eq("seller_id", session.user.id)
        .eq("status", "resolved")
        .eq("resolution", "seller_favor"),
      supabase.from("seller_payouts")
        .select("id,order_id,amount,transfer_reference,bank_name,account_number,account_name,paid_at,proof_image_url")
        .eq("seller_id", session.user.id)
        .order("paid_at", { ascending: false })
        .limit(500),
    ]);

    const firstError = ordersResult.error || disputesResult.error || payoutsResult.error;
    if (firstError) {
      toast({ title: "Could not load payout information", description: firstError.message, variant: "destructive" });
    }
    setOrders((ordersResult.data || []) as SellerOrder[]);
    setSellerFavorOrderIds((disputesResult.data || []).map((item: any) => item.order_id));
    setPayouts((payoutsResult.data || []) as SellerPayout[]);
    setLoading(false);
    setRefreshing(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const paidOrderIds = useMemo(() => new Set(payouts.map((item) => item.order_id)), [payouts]);
  const sellerFavorIds = useMemo(() => new Set(sellerFavorOrderIds), [sellerFavorOrderIds]);
  const eligibleOrders = useMemo(() => orders.filter((order) => {
    const eligible = order.status === "released" || (order.status === "disputed" && sellerFavorIds.has(order.id));
    return eligible && !paidOrderIds.has(order.id);
  }), [orders, sellerFavorIds, paidOrderIds]);
  const pendingTotal = eligibleOrders.reduce((sum, order) => sum + Number(order.seller_payout || 0), 0);
  const paidTotal = payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

  if (loading) return <div className="glass-card p-5 mb-6 text-sm text-muted-foreground">Loading seller payout summary…</div>;

  return (
    <section className="glass-card p-5 mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Wallet className="w-5 h-5 text-secondary" /> Seller Payouts</h3>
          <p className="text-xs text-muted-foreground mt-1">Track amounts MART101 owes you and transfers already recorded.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Awaiting manual payout</p>
          <p className="text-xl font-bold mt-1">₦{pendingTotal.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{eligibleOrders.length} eligible order{eligibleOrders.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Payouts recorded</p>
          <p className="text-xl font-bold mt-1">₦{paidTotal.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{payouts.length} recorded transfer{payouts.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Eligible orders awaiting transfer</h4>
        {eligibleOrders.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">No confirmed orders are currently awaiting seller payout. Disputed orders remain excluded unless the admin resolves the case in the seller's favour.</p>
        ) : (
          <div className="space-y-2">
            {eligibleOrders.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{order.product_name || "Purchase"}</p><p className="text-[11px] text-muted-foreground break-all">Order {order.id}</p></div>
                <p className="font-semibold text-sm">₦{Number(order.seller_payout || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Payout history</h4>
        {payouts.length === 0 ? <p className="text-xs text-muted-foreground">No seller payouts have been recorded yet.</p> : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <div key={payout.id} className="rounded-lg border border-border p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-foreground">₦{Number(payout.amount).toLocaleString()}</span><span className="text-emerald-600 font-medium">Paid</span></div>
                <p className="text-muted-foreground">{new Date(payout.paid_at).toLocaleString()}</p>
                <p className="break-all">Transfer reference: {payout.transfer_reference}</p>
                <p className="text-muted-foreground">{payout.bank_name} · {payout.account_number} · {payout.account_name}</p>
                {payout.proof_image_url && <a className="text-secondary underline" href={payout.proof_image_url} target="_blank" rel="noreferrer">View transfer evidence</a>}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">MART101 receives buyer payments and manually transfers seller payouts. This page records transfers after they have actually been made; it does not initiate bank payments.</p>
    </section>
  );
};

export default SellerPayoutPanel;
