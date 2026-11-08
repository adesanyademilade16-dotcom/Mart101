import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "Invalid JSON body" }); }
  }

  const productId = body?.product_id;
  if (typeof productId !== "string" || !productId) {
    return res.status(400).json({ error: "A product_id is required" });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: "Eligibility check is not configured" });

  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,seller_id,flagged,payment_type,price,delivery_timeframe,stock_quantity,quantity_sold")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) return res.status(404).json({ eligible: false, code: "PRODUCT_UNAVAILABLE", reason: "This listing is no longer available." });

  const { data: seller, error: sellerError } = await supabase
    .from("profiles")
    .select("payment_status,suspended")
    .eq("user_id", product.seller_id)
    .maybeSingle();

  if (sellerError || !seller) return res.status(503).json({ eligible: false, code: "SELLER_CHECK_FAILED", reason: "Seller eligibility is temporarily unavailable. Please try again." });

  const { data: activeReservations, error: reservationError } = await supabase
    .from("product_stock_reservations")
    .select("id")
    .eq("product_id", productId)
    .eq("status", "reserved");
  if (reservationError) {
    return res.status(503).json({ eligible: false, code: "STOCK_CHECK_FAILED", reason: "Reserved stock could not be confirmed. Please try again." });
  }
  const reservedCount = (activeReservations || []).length;

  let code = "ELIGIBLE";
  let reason = "Buyers can use MART101 Pay for this listing.";
  if (seller.suspended) {
    code = "SELLER_RESTRICTED";
    reason = "The seller's account is currently restricted. Protected checkout is unavailable.";
  } else if (seller.payment_status !== "approved") {
    code = "SELLER_NOT_APPROVED";
    reason = seller.payment_status === "pending"
      ? "The seller's MART101 Pay application is awaiting admin approval."
      : seller.payment_status === "rejected"
        ? "The seller's MART101 Pay application was not approved."
        : "The seller must be approved for MART101 Pay before buyers can check out.";
  } else if (product.flagged) {
    code = "LISTING_UNDER_REVIEW";
    reason = "This listing is under review and cannot accept protected payments.";
  } else if (product.payment_type === "Pre-order") {
    code = "PREORDER_NOT_SUPPORTED";
    reason = "Pre-order listings do not support MART101 Pay checkout. Contact the seller for arrangements.";
  } else if (!product.delivery_timeframe) {
    code = "DELIVERY_TIME_MISSING";
    reason = "The seller must set an expected delivery time before MART101 Pay can be used.";
  } else if (!["Same day", "1–3 days"].includes(String(product.delivery_timeframe).trim())) {
    code = "DELIVERY_OVER_3_DAYS";
    reason = `MART101 Pay is unavailable because the seller's expected delivery time is ${product.delivery_timeframe}. Protected checkout is limited to deliveries within 3 days.`;
  } else if (product.stock_quantity == null) {
    code = "STOCK_NOT_SET";
    reason = "The seller has not updated the available quantity for this listing yet.";
  } else if (Number(product.stock_quantity) - Number(product.quantity_sold || 0) - reservedCount <= 0) {
    code = "SOLD_OUT";
    reason = "This item is sold out. Please check with the seller for availability.";
  } else if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
    code = "INVALID_PRICE";
    reason = "This listing has an invalid price and cannot be purchased.";
  }

  return res.status(200).json({ eligible: code === "ELIGIBLE", code, reason });
}
