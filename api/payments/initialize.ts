import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";
const SITE_URL = "https://mart101.vercel.app";
const PLATFORM_COMMISSION_RATE = 0;

function calculatePaystackFee(amount: number) {
  let fee = amount * 0.015;
  if (amount >= 2500) fee += 100;
  if (fee > 2000) fee = 2000;
  return Math.round(fee);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not logged in" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  const product_id = body?.product_id;
  console.log("initialize.ts received product_id:", product_id, "raw body type:", typeof req.body);

  if (!product_id) return res.status(400).json({ error: "Missing product_id" });

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid session" });

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, price, seller_id, image_url, flagged, payment_type, delivery_timeframe, stock_quantity, quantity_sold")
    .eq("id", product_id)
    .maybeSingle();

  if (productError || !product) {
    console.log("Product lookup failed for id:", product_id, "error:", productError);
    return res.status(404).json({ error: "Product not found" });
  }
  if (product.seller_id === user.id) return res.status(400).json({ error: "You can't buy your own listing" });

  // Enforce the same checkout eligibility rules used by the product page.
  const { data: sellerProfile, error: sellerError } = await supabase
    .from("profiles")
    .select("payment_status, suspended")
    .eq("user_id", product.seller_id)
    .maybeSingle();

  if (sellerError || !sellerProfile) {
    return res.status(409).json({ error: "Seller eligibility could not be confirmed. Please try again later." });
  }
  if (sellerProfile.suspended) {
    return res.status(403).json({ error: "This seller's account is currently restricted, so checkout is unavailable." });
  }
  if (sellerProfile.payment_status !== "approved") {
    return res.status(403).json({ error: "This seller has not been approved for MART101 Pay yet." });
  }
  if (product.flagged) {
    return res.status(403).json({ error: "This listing is under review and cannot accept protected payments." });
  }
  if (product.payment_type === "Pre-order") {
    return res.status(403).json({ error: "Pre-order listings do not support MART101 Pay checkout." });
  }
  if (!product.delivery_timeframe) {
    return res.status(403).json({ error: "The seller has not set a delivery timeframe. MART101 Pay is unavailable." });
  }
  if (!["Same day", "1–3 days"].includes(String(product.delivery_timeframe).trim())) {
    return res.status(403).json({ error: `MART101 Pay is limited to delivery within 3 days. This seller selected ${product.delivery_timeframe}.` });
  }
  if (product.stock_quantity == null) {
    return res.status(409).json({ error: "The seller has not set the available stock quantity for this item." });
  }
  if (Number(product.stock_quantity) - Number(product.quantity_sold || 0) <= 0) {
    return res.status(409).json({ error: "This item is sold out." });
  }
  if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
    return res.status(409).json({ error: "This listing has an invalid price and cannot be purchased." });
  }

  // Avoid creating another order when this buyer already has an active or
  // completed order for this product. A database uniqueness constraint is
  // still required to make this race-proof under simultaneous requests.
  const { data: existingOrders, error: existingOrderError } = await supabase
    .from("orders")
    .select("id,status")
    .eq("product_id", product.id)
    .eq("buyer_id", user.id)
    .in("status", ["pending_payment", "paid_held", "released", "disputed"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (existingOrderError) {
    return res.status(500).json({ error: "Could not check your existing purchase. Please try again." });
  }

  let blockingOrder: { id: string; status: string } | null = null;
  for (const candidate of existingOrders || []) {
    if (candidate.status === "pending_payment") {
      const { data: reservation, error: reservationError } = await supabase
        .from("product_stock_reservations")
        .select("status")
        .eq("order_id", candidate.id)
        .maybeSingle();
      if (reservationError) {
        return res.status(500).json({ error: "Could not check your previous payment attempt. Please try again." });
      }
      // A verified failed/abandoned checkout has a released reservation and
      // should not prevent the buyer from trying again.
      if (reservation?.status === "released") continue;
    }
    blockingOrder = candidate;
    break;
  }

  if (blockingOrder) {
    return res.status(409).json({
      error: blockingOrder.status === "pending_payment"
        ? "You already have a payment attempt for this item. Check My Purchases before trying again."
        : "You already have an order for this item. View My Purchases for its status.",
      code: "EXISTING_ORDER",
      order_id: blockingOrder.id,
      order_status: blockingOrder.status,
    });
  }

  const deliveryFee = 0;
  const subtotal = Number(product.price) + deliveryFee;
  const paystackFee = calculatePaystackFee(subtotal);
  const totalPaid = subtotal + paystackFee;
  const platformCommission = Math.round(subtotal * PLATFORM_COMMISSION_RATE);
  const sellerPayout = subtotal - platformCommission;

  const { data: order, error: orderError } = await supabase
    .from("orders")
        .insert({
      product_id: product.id,
      product_name: product.name,
      product_image_url: product.image_url,
      buyer_id: user.id,
      seller_id: product.seller_id,
      item_amount: product.price,
      delivery_fee: deliveryFee,
      paystack_fee: paystackFee,
      platform_commission: platformCommission,
      total_paid: totalPaid,
      seller_payout: sellerPayout,
      status: "pending_payment",
      inventory_managed: true,
    })
    .select()
    .single();

  if (orderError || !order) return res.status(500).json({ error: "Could not create order" });

  // Reserve one unit atomically before opening Paystack so simultaneous buyers
  // cannot both check out the final item. The reservation expires after 24 hours.
  const { data: reserved, error: reserveError } = await supabase.rpc("reserve_product_stock", {
    p_order_id: order.id,
    p_product_id: product.id,
  });
  if (reserveError || reserved !== true) {
    await supabase.from("orders").delete().eq("id", order.id).eq("status", "pending_payment");
    return res.status(409).json({ error: "This item is no longer available in the requested quantity. Please refresh the listing." });
  }

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: Math.round(totalPaid * 100),
      reference: order.id,
      callback_url: `${SITE_URL}/product/${product.id}`,
      metadata: { order_id: order.id, product_name: product.name },
    }),
  });

  const paystackData = await paystackRes.json();
  if (!paystackData.status || !paystackData.data?.authorization_url) {
    // The payment session was not created, so do not leave a dead pending order
    // that blocks the buyer from trying again. This does not touch RLS policies.
    await supabase.rpc("release_product_stock_reservation", { p_order_id: order.id });
    await supabase.from("orders").delete().eq("id", order.id).eq("status", "pending_payment");
    return res.status(502).json({ error: "Paystack initialization failed" });
  }

  await supabase.from("orders").update({ paystack_reference: order.id }).eq("id", order.id);

  return res.status(200).json({ authorization_url: paystackData.data.authorization_url });
}
