import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";

// Vercel Cron calls this endpoint daily. It verifies the actual Paystack
// transaction before releasing any old reservation; age alone is never enough.
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!serviceKey || !paystackKey) {
    return res.status(500).json({ error: "Payment reconciliation is not configured" });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: reservations, error: reservationError } = await supabase
    .from("product_stock_reservations")
    .select("order_id, expires_at")
    .eq("status", "reserved")
    .lt("expires_at", new Date().toISOString())
    .limit(100);

  if (reservationError) {
    console.error("[payments/reconcile] Reservation lookup failed:", reservationError.message);
    return res.status(500).json({ error: "Could not retrieve reservations" });
  }

  let confirmed = 0;
  let released = 0;
  let deferred = 0;

  for (const reservation of reservations || []) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,status,total_paid,paystack_reference")
      .eq("id", reservation.order_id)
      .maybeSingle();

    if (orderError || !order) { deferred++; continue; }

    if (["paid_held", "released", "disputed"].includes(order.status)) {
      const { data: stockDone, error: stockError } = await supabase.rpc(
        "confirm_product_stock_sale", { p_order_id: order.id }
      );
      if (!stockError && stockDone === true) confirmed++;
      else deferred++;
      continue;
    }

    if (order.status !== "pending_payment") { deferred++; continue; }

    const reference = order.paystack_reference || order.id;
    let verifyResponse: Response;
    try {
      verifyResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paystackKey}`, Accept: "application/json" } }
      );
    } catch {
      deferred++;
      continue;
    }

    if (!verifyResponse.ok) {
      // A 404 or any other HTTP error is not a verified terminal transaction
      // status. Keep the reservation until Paystack returns an explicit
      // failed/abandoned status; this avoids releasing stock during delays.
      deferred++;
      continue;
    }
    const verifyData = await verifyResponse.json();
    const tx = verifyData?.data;
    if (!verifyData?.status || !tx) { deferred++; continue; }

    if (tx.status === "success") {
      const expectedKobo = Math.round(Number(order.total_paid) * 100);
      if (tx.reference !== reference || Number(tx.amount) !== expectedKobo || tx.currency !== "NGN") {
        console.error("[payments/reconcile] Successful transaction did not match order:", order.id);
        deferred++;
        continue;
      }

      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({ status: "paid_held", paid_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("status", "pending_payment")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("[payments/reconcile] Could not record successful payment:", updateError.message);
        deferred++;
        continue;
      }

      // If another webhook/verification request won the race, the guarded update
      // returns no row; the stock RPC checks the current persisted order status.
      const { data: stockDone, error: stockError } = await supabase.rpc(
        "confirm_product_stock_sale", { p_order_id: order.id }
      );
      if (!stockError && stockDone === true && (updated || stockDone)) confirmed++;
      else deferred++;
      continue;
    }

    // Only explicit terminal failure statuses release stock. Pending, unknown,
    // unavailable, and not-found transactions remain reserved for safety.
    if (tx.status === "failed" || tx.status === "abandoned") {
      const { data: didRelease, error: releaseError } = await supabase.rpc(
        "release_product_stock_reservation", { p_order_id: order.id }
      );
      if (!releaseError && didRelease === true) released++;
      else deferred++;
    } else {
      deferred++;
    }
  }

  return res.status(200).json({ checked: reservations?.length || 0, confirmed, released, deferred });
}
