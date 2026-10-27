import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not logged in" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON body" }); }
  }
  const orderId = body?.order_id;
  if (!orderId || typeof orderId !== "string") return res.status(400).json({ error: "Missing order_id" });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: "Payment verification is not configured" });
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid session" });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,buyer_id,status,total_paid,paystack_reference")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (orderError || !order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "pending_payment") return res.status(200).json({ status: order.status });

  const reference = order.paystack_reference || order.id;
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.status || !verifyData.data) {
    return res.status(200).json({ status: "pending_payment", message: "Payment is not yet confirmed" });
  }

  const tx = verifyData.data;
  const expectedKobo = Math.round(Number(order.total_paid) * 100);
  if (tx.status !== "success" || tx.reference !== reference || Number(tx.amount) !== expectedKobo || (tx.currency && tx.currency !== "NGN")) {
    return res.status(409).json({ error: "Payment details do not match this order" });
  }

  const now = new Date();
  const autoRelease = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid_held", paid_at: now.toISOString(), auto_release_at: autoRelease.toISOString() })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("status")
    .maybeSingle();

  if (updateError) return res.status(500).json({ error: "Verified payment could not be recorded" });
  return res.status(200).json({ status: updated?.status || "paid_held" });
}
