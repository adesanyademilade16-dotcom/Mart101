import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2, Ban, Flag, ShoppingBag, BadgeCheck, FlagOff,
  ShieldCheck, ShieldOff, Users, FileText, Activity, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ConfirmModal from "@/components/ConfirmModal";
import { sanitizeError } from "@/lib/errors";

/* ───────── Types ───────── */

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  condition: string;
  flagged: boolean;
  payment_type: string;
  delivery_timeframe: string | null;
  image_url: string | null;
  seller_id: string;
  seller_name?: string;
  seller_verified?: boolean;
  seller_suspended?: boolean;
}

interface SellerRow {
  user_id: string;
  full_name: string;
  email: string;
  department: string;
  verified: boolean;
  suspended: boolean;
  created_at: string;
  report_count: number;
}

interface ReportRow {
  id: string;
  product_id: string | null;
  reporter_id: string;
  reason: string | null;
  created_at: string;
  status: string;
  report_type: string;
  seller_id: string | null;
  seller_name: string | null;
  item_name: string | null;
  product_name?: string;
}

interface ActivityRow {
  id: string;
  action_type: string;
  admin_name: string;
  details: string | null;
  created_at: string;
}

type ConfirmAction =
  | { type: "delete"; productId: string; productName: string }
  | { type: "suspend"; sellerId: string; sellerName: string }
  | { type: "unsuspend"; sellerId: string; sellerName: string }
  | { type: "verify"; sellerId: string; sellerName: string; currently: boolean }
  | { type: "unflag"; productId: string; productName: string }
  | { type: "dismiss_report"; reportId: string }
  | { type: "action_report"; reportId: string; productId: string; productName: string; sellerId: string; sellerName: string }
  | { type: "suspend_from_report"; reportId: string; sellerId: string; sellerName: string };

/* ───────── Constants ───────── */

const CONDITION_COLORS: Record<string, string> = {
  "Brand New": "hsl(142, 71%, 45%)",
  "Used – Like New": "hsl(217, 91%, 60%)",
  "Used – Good": "hsl(38, 92%, 50%)",
  "Used – Fair": "hsl(0, 84%, 60%)",
};


const ACTION_LABELS: Record<string, string> = {
  verify: "Verified seller",
  unverify: "Removed verification",
  suspend: "Suspended seller",
  unsuspend: "Unsuspended seller",
  delete_product: "Deleted product",
  dismiss_report: "Dismissed report",
  action_report: "Actioned report",
  unflag: "Unflagged product",
};

/* ───────── Component ───────── */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [adminUserId, setAdminUserId] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [conditionData, setConditionData] = useState<{ name: string; value: number }[]>([]);
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [reportTypeFilter, setReportTypeFilter] = useState("All");

  useLayoutEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/marketplace", { replace: true });
  }, [isAdmin, adminLoading, navigate]);

  const logAction = useCallback(async (actionType: string, details: string, targetUserId?: string, targetProductId?: string) => {
    const entry = {
      action_type: actionType,
      admin_user_id: adminUserId,
      admin_name: adminName,
      details,
      target_user_id: targetUserId || null,
      target_product_id: targetProductId || null,
    };
    await supabase.from("admin_activity_log").insert(entry);
    setActivityLog((prev) => [{ id: crypto.randomUUID(), ...entry, created_at: new Date().toISOString() } as ActivityRow, ...prev]);
  }, [adminUserId, adminName]);

  useEffect(() => {
    if (!isAdmin) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.id) {
        setAdminUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", session.user.id)
          .single();
        setAdminName(profile?.full_name || "Admin");
      }
    });

    const fetchAll = async () => {
      const [
        { data: productsData },
        { data: profilesData, count: usersCount },
        { data: reportsData },
        { data: logData },
      ] = await Promise.all([
        supabase.from("products").select("*").order("flagged", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*", { count: "exact" }),
        supabase.from("product_reports").select("*").order("created_at", { ascending: false }),
        supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      setTotalUsers(usersCount ?? 0);
      setActivityLog((logData || []) as ActivityRow[]);

      const allProfiles = profilesData || [];
      const profileMap = new Map(allProfiles.map((p) => [p.user_id, p]));

      // Products enriched with seller info
      if (productsData) {
        const condMap: Record<string, number> = {};
        productsData.forEach((p) => { condMap[p.condition] = (condMap[p.condition] || 0) + 1; });
        setConditionData(Object.entries(condMap).map(([name, value]) => ({ name, value })));

        setProducts(
          productsData.map((p) => ({
            ...p,
            seller_name: profileMap.get(p.seller_id)?.full_name || "Unknown",
            seller_verified: profileMap.get(p.seller_id)?.verified ?? false,
            seller_suspended: profileMap.get(p.seller_id)?.suspended ?? false,
          }))
        );
      }

      // Build seller map from products
      const productSellerMap = new Map((productsData || []).map((p) => [p.id, p.seller_id]));

      // Reports count per seller
      const reportCountMap: Record<string, number> = {};
      (reportsData || []).forEach((r: any) => {
        const sellerId = r.seller_id || productSellerMap.get(r.product_id);
        if (sellerId) reportCountMap[sellerId] = (reportCountMap[sellerId] || 0) + 1;
      });

      setSellers(
        allProfiles.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          department: p.department,
          verified: p.verified,
          suspended: p.suspended,
          created_at: p.created_at,
          report_count: reportCountMap[p.user_id] || 0,
        }))
      );

      // Reports enriched
      const productNameMap = new Map((productsData || []).map((p) => [p.id, p.name]));
      setReports(
        (reportsData || []).map((r: any) => ({
          ...r,
          status: r.status || "pending",
          report_type: r.report_type || "item",
          product_name: r.item_name || productNameMap.get(r.product_id) || (r.report_type === "seller" ? "—" : "Unknown"),
          seller_name: r.seller_name || profileMap.get(r.seller_id || productSellerMap.get(r.product_id) || "")?.full_name || "Unknown",
          seller_id: r.seller_id || productSellerMap.get(r.product_id) || undefined,
        }))
      );

      setLoading(false);
    };
    fetchAll();
  }, [isAdmin]);

  /* ───────── Actions ───────── */

  const executeConfirm = async () => {
    if (!confirm) return;
    switch (confirm.type) {
      case "delete": {
        const { error } = await supabase.from("products").delete().eq("id", confirm.productId);
        if (!error) {
          setProducts((prev) => prev.filter((p) => p.id !== confirm.productId));
          await logAction("delete_product", `Deleted "${confirm.productName}"`, undefined, confirm.productId);
          toast({ title: "Product deleted" });
        }
        break;
      }
      case "suspend": {
        const { error } = await supabase.from("profiles").update({ suspended: true }).eq("user_id", confirm.sellerId);
        if (!error) {
          setSellers((prev) => prev.map((s) => s.user_id === confirm.sellerId ? { ...s, suspended: true } : s));
          setProducts((prev) => prev.map((p) => p.seller_id === confirm.sellerId ? { ...p, seller_suspended: true } : p));
          await logAction("suspend", `Suspended "${confirm.sellerName}"`, confirm.sellerId);
          toast({ title: "Seller suspended" });
        } else toast({ title: "Error", description: sanitizeError(error), variant: "destructive" });
        break;
      }
      case "unsuspend": {
        const { error } = await supabase.from("profiles").update({ suspended: false }).eq("user_id", confirm.sellerId);
        if (!error) {
          setSellers((prev) => prev.map((s) => s.user_id === confirm.sellerId ? { ...s, suspended: false } : s));
          setProducts((prev) => prev.map((p) => p.seller_id === confirm.sellerId ? { ...p, seller_suspended: false } : p));
          await logAction("unsuspend", `Unsuspended "${confirm.sellerName}"`, confirm.sellerId);
          toast({ title: "Seller unsuspended" });
        } else toast({ title: "Error", description: sanitizeError(error), variant: "destructive" });
        break;
      }
      case "verify": {
        const newVal = !confirm.currently;
        const { error } = await supabase.from("profiles").update({ verified: newVal }).eq("user_id", confirm.sellerId);
        if (!error) {
          setSellers((prev) => prev.map((s) => s.user_id === confirm.sellerId ? { ...s, verified: newVal } : s));
          setProducts((prev) => prev.map((p) => p.seller_id === confirm.sellerId ? { ...p, seller_verified: newVal } : p));
          await logAction(newVal ? "verify" : "unverify", `${newVal ? "Verified" : "Unverified"} "${confirm.sellerName}"`, confirm.sellerId);
          toast({ title: newVal ? "Seller verified ✓" : "Verification removed" });
        } else toast({ title: "Error", description: sanitizeError(error), variant: "destructive" });
        break;
      }
      case "unflag": {
        const { error } = await supabase.from("products").update({ flagged: false }).eq("id", confirm.productId);
        if (!error) {
          setProducts((prev) => prev.map((p) => p.id === confirm.productId ? { ...p, flagged: false } : p));
          await logAction("unflag", `Unflagged "${confirm.productName}"`, undefined, confirm.productId);
          toast({ title: "Product unflagged" });
        }
        break;
      }
      case "dismiss_report": {
        const { error } = await supabase.from("product_reports").update({ status: "dismissed" }).eq("id", confirm.reportId);
        if (!error) {
          setReports((prev) => prev.map((r) => r.id === confirm.reportId ? { ...r, status: "dismissed" } : r));
          await logAction("dismiss_report", `Dismissed report ${confirm.reportId}`);
          toast({ title: "Report dismissed" });
        }
        break;
      }
      case "action_report": {
        // Delete the product and mark report as actioned
        await supabase.from("products").delete().eq("id", confirm.productId);
        await supabase.from("product_reports").update({ status: "actioned" }).eq("id", confirm.reportId);
        setProducts((prev) => prev.filter((p) => p.id !== confirm.productId));
        setReports((prev) => prev.map((r) => r.id === confirm.reportId ? { ...r, status: "actioned" } : r));
        await logAction("action_report", `Deleted "${confirm.productName}" from report, seller: "${confirm.sellerName}"`, confirm.sellerId, confirm.productId);
        toast({ title: "Listing deleted & report actioned" });
        break;
      }
      case "suspend_from_report": {
        const { error } = await supabase.from("profiles").update({ suspended: true }).eq("user_id", confirm.sellerId);
        if (!error) {
          setSellers((prev) => prev.map((s) => s.user_id === confirm.sellerId ? { ...s, suspended: true } : s));
          setProducts((prev) => prev.map((p) => p.seller_id === confirm.sellerId ? { ...p, seller_suspended: true } : p));
          await supabase.from("product_reports").update({ status: "actioned" }).eq("id", confirm.reportId);
          setReports((prev) => prev.map((r) => r.id === confirm.reportId ? { ...r, status: "actioned" } : r));
          await logAction("suspend", `Suspended "${confirm.sellerName}" from seller report`, confirm.sellerId);
          toast({ title: "Seller suspended & report actioned" });
        } else toast({ title: "Error", description: sanitizeError(error), variant: "destructive" });
        break;
      }
    }
    setConfirm(null);
  };

  const getModalProps = () => {
    if (!confirm) return { title: "", description: "", confirmLabel: "", variant: "default" as const };
    switch (confirm.type) {
      case "delete":
        return { title: "Delete Product", description: `Delete "${confirm.productName}"? This cannot be undone.`, confirmLabel: "Delete", variant: "destructive" as const };
      case "suspend":
        return { title: "Suspend Seller", description: `Suspend "${confirm.sellerName}"? They won't be able to log in or upload.`, confirmLabel: "Suspend", variant: "destructive" as const };
      case "unsuspend":
        return { title: "Unsuspend Seller", description: `Restore access for "${confirm.sellerName}"?`, confirmLabel: "Unsuspend", variant: "default" as const };
      case "verify":
        return confirm.currently
          ? { title: "Remove Verification", description: `Remove badge from "${confirm.sellerName}"?`, confirmLabel: "Remove", variant: "default" as const }
          : { title: "Verify Seller", description: `Mark "${confirm.sellerName}" as verified?`, confirmLabel: "Verify", variant: "default" as const };
      case "unflag":
        return { title: "Unflag Product", description: `Restore "${confirm.productName}" to active status?`, confirmLabel: "Unflag", variant: "default" as const };
      case "dismiss_report":
        return { title: "Dismiss Report", description: "Dismiss this report? No action will be taken.", confirmLabel: "Dismiss", variant: "default" as const };
      case "action_report":
        return { title: "Delete Listing", description: `Delete "${confirm.productName}" and mark report as actioned?`, confirmLabel: "Delete Listing", variant: "destructive" as const };
      case "suspend_from_report":
        return { title: "Suspend Seller", description: `Suspend "${confirm.sellerName}" and mark report as actioned?`, confirmLabel: "Suspend", variant: "destructive" as const };
    }
  };

  /* ───────── Render helpers ───────── */

  const sellerStatusBadge = (seller: { verified: boolean; suspended: boolean; report_count?: number }) => {
    if (seller.suspended) return <Badge variant="destructive" className="text-xs">Suspended</Badge>;
    if (seller.verified) return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-xs">Verified</Badge>;
    return <Badge variant="secondary" className="text-xs">Active</Badge>;
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const modalProps = getModalProps();
  const overviewData = [
    { name: "Students", count: totalUsers },
    { name: "Listings", count: products.length },
  ];
  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-foreground mb-1">Welcome {adminName} 👋</h1>
        <p className="text-muted-foreground mb-6">Admin Control Panel</p>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <ShoppingBag className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="sellers" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <Users className="w-4 h-4" /> Sellers
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 relative">
              <FileText className="w-4 h-4" /> Reports
              {pendingReports.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-bold">
                  {pendingReports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <Activity className="w-4 h-4" /> Log
            </TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-lg">Users vs Listings</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={overviewData} barSize={48}>
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        <Cell fill="hsl(var(--secondary))" />
                        <Cell fill="hsl(var(--primary))" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-lg">Condition Distribution</CardTitle></CardHeader>
                <CardContent>
                  {conditionData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-16 text-sm">No products yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={conditionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.replace("Used – ", "")} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {conditionData.map((entry) => (
                            <Cell key={entry.name} fill={CONDITION_COLORS[entry.name] || "hsl(var(--muted))"} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Products table */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-foreground">All Listings</h3>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Payment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Payment Types</SelectItem>
                  <SelectItem value="Pay on Delivery">Pay on Delivery</SelectItem>
                  <SelectItem value="Pre-order">Pre-order</SelectItem>
                  <SelectItem value="Flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const filtered = paymentFilter === "All" ? products : products.filter(p => p.payment_type === paymentFilter);
              return filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No products found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 px-2 font-semibold text-foreground">Product</th>
                      <th className="py-3 px-2 font-semibold text-foreground hidden sm:table-cell">Seller</th>
                      <th className="py-3 px-2 font-semibold text-foreground hidden md:table-cell">Category</th>
                      <th className="py-3 px-2 font-semibold text-foreground">Price</th>
                      <th className="py-3 px-2 font-semibold text-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product) => (
                      <tr key={product.id} className={`border-b border-border/50 ${product.flagged ? "bg-destructive/10" : ""}`}>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {product.flagged && <Flag className="w-4 h-4 text-destructive shrink-0" />}
                            <span className="truncate max-w-[150px]">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell">
                          <span className="text-muted-foreground flex items-center gap-1">
                            {product.seller_name}
                            {product.seller_verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />}
                            {product.seller_suspended && <Ban className="w-3.5 h-3.5 text-destructive" />}
                          </span>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">{product.category}</td>
                        <td className="py-3 px-2 font-semibold text-secondary">₦{Number(product.price).toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            {product.flagged && (
                              <Button variant="ghost" size="icon" onClick={() => setConfirm({ type: "unflag", productId: product.id, productName: product.name })} className="text-emerald-500 hover:text-emerald-600 h-8 w-8" title="Unflag">
                                <FlagOff className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setConfirm({ type: "delete", productId: product.id, productName: product.name })} className="text-destructive hover:text-destructive h-8 w-8" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            })()}
          </TabsContent>

          {/* ═══ SELLERS TAB ═══ */}
          <TabsContent value="sellers" className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Manage Sellers</h2>
            {sellers.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No sellers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 px-2 font-semibold text-foreground">Name</th>
                      <th className="py-3 px-2 font-semibold text-foreground hidden sm:table-cell">Department</th>
                      <th className="py-3 px-2 font-semibold text-foreground">Status</th>
                      <th className="py-3 px-2 font-semibold text-foreground hidden md:table-cell">Reports</th>
                      <th className="py-3 px-2 font-semibold text-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((seller) => (
                      <tr key={seller.user_id} className={`border-b border-border/50 ${seller.suspended ? "bg-destructive/5" : seller.report_count >= 3 ? "bg-amber-500/10" : ""}`}>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {seller.report_count >= 3 && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                            <span className="font-medium">{seller.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">{seller.department}</td>
                        <td className="py-3 px-2">{sellerStatusBadge(seller)}</td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <span className={`font-semibold ${seller.report_count >= 3 ? "text-amber-500" : "text-muted-foreground"}`}>
                            {seller.report_count}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            {/* Verify / Unverify */}
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setConfirm({ type: "verify", sellerId: seller.user_id, sellerName: seller.full_name, currently: seller.verified })}
                              className={`h-8 w-8 ${seller.verified ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500"}`}
                              title={seller.verified ? "Remove verification" : "Verify seller"}
                            >
                              {seller.verified ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                            </Button>
                            {/* Suspend / Unsuspend */}
                            {seller.suspended ? (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setConfirm({ type: "unsuspend", sellerId: seller.user_id, sellerName: seller.full_name })}
                                className="text-emerald-500 hover:text-emerald-600 h-8 w-8"
                                title="Unsuspend seller"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setConfirm({ type: "suspend", sellerId: seller.user_id, sellerName: seller.full_name })}
                                className="text-destructive hover:text-destructive h-8 w-8"
                                title="Suspend seller"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ═══ REPORTS TAB ═══ */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Reports ({pendingReports.length} pending)</h2>
              <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Reports</SelectItem>
                  <SelectItem value="item">Item Reports</SelectItem>
                  <SelectItem value="seller">Seller Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const filtered = reportTypeFilter === "All" ? reports : reports.filter(r => r.report_type === reportTypeFilter);
              return filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No reports found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 px-2 font-semibold text-foreground">Type</th>
                      <th className="py-3 px-2 font-semibold text-foreground">Item</th>
                      <th className="py-3 px-2 font-semibold text-foreground hidden sm:table-cell">Seller</th>
                      <th className="py-3 px-2 font-semibold text-foreground hidden md:table-cell">Reason</th>
                      <th className="py-3 px-2 font-semibold text-foreground">Status</th>
                      <th className="py-3 px-2 font-semibold text-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((report) => (
                      <tr key={report.id} className={`border-b border-border/50 ${report.status === "pending" ? "" : "opacity-60"}`}>
                        <td className="py-3 px-2">
                          <Badge variant={report.report_type === "seller" ? "secondary" : "outline"} className="text-xs capitalize">
                            {report.report_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <span className="truncate max-w-[120px] block">{report.product_name}</span>
                          <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">{report.seller_name || "—"}</td>
                        <td className="py-3 px-2 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{report.reason || "No reason given"}</td>
                        <td className="py-3 px-2">
                          {report.status === "pending" && <Badge variant="outline" className="border-amber-500 text-amber-500 text-xs">Pending</Badge>}
                          {report.status === "dismissed" && <Badge variant="secondary" className="text-xs">Dismissed</Badge>}
                          {report.status === "actioned" && <Badge variant="destructive" className="text-xs">Actioned</Badge>}
                        </td>
                        <td className="py-3 px-2">
                          {report.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: "dismiss_report", reportId: report.id })} className="text-muted-foreground h-8 text-xs">
                                Dismiss
                              </Button>
                              {report.report_type === "item" && report.product_id && (
                                <Button variant="ghost" size="sm" onClick={() => setConfirm({
                                  type: "action_report",
                                  reportId: report.id,
                                  productId: report.product_id!,
                                  productName: report.product_name || "Unknown",
                                  sellerId: report.seller_id || "",
                                  sellerName: report.seller_name || "Unknown",
                                })} className="text-destructive h-8 text-xs">
                                  Delete Listing
                                </Button>
                              )}
                              {report.report_type === "seller" && report.seller_id && (
                                <Button variant="ghost" size="sm" onClick={() => setConfirm({
                                  type: "suspend_from_report",
                                  reportId: report.id,
                                  sellerId: report.seller_id!,
                                  sellerName: report.seller_name || "Unknown",
                                })} className="text-destructive h-8 text-xs">
                                  Suspend Seller
                                </Button>
                              )}
                              {report.seller_id && report.report_type === "item" && (
                                <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: "suspend", sellerId: report.seller_id!, sellerName: report.seller_name || "Unknown" })} className="text-orange-500 h-8 text-xs">
                                  Suspend
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            })()}
          </TabsContent>

          {/* ═══ ACTIVITY LOG TAB ═══ */}
          <TabsContent value="activity" className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Activity Log</h2>
            {activityLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{entry.admin_name}</span>{" "}
                        <span className="text-muted-foreground">{ACTION_LABELS[entry.action_type] || entry.action_type}</span>
                      </p>
                      {entry.details && <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.details}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-1">{new Date(entry.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <ConfirmModal
        open={!!confirm}
        onOpenChange={(open) => { if (!open) setConfirm(null); }}
        title={modalProps.title}
        description={modalProps.description}
        confirmLabel={modalProps.confirmLabel}
        variant={modalProps.variant}
        onConfirm={executeConfirm}
      />
    </div>
  );
};

export default AdminDashboard;
