import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = {
  api: { bodyParser: false },
};

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";

function getRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: any) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-paystack-signature"];

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const reference = event?.data?.reference;

  if (event.event === "charge.success" && reference) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, total_paid, paystack_reference")
      .eq("id", reference)
      .maybeSingle();

    const paidAmountKobo = Number(event.data.amount);
    const expectedAmountKobo = order ? Math.round(Number(order.total_paid) * 100) : -1;
    const referenceMatches = !!order && (order.paystack_reference || order.id) === reference;
    const validCurrency = event.data.currency === "NGN";

    if (order && referenceMatches && Number.isFinite(paidAmountKobo) && paidAmountKobo === expectedAmountKobo && validCurrency) {
      if (order.status === "pending_payment") {
        const now = new Date();
        const { data: updated, error: updateError } = await supabase
          .from("orders")
          .update({ status: "paid_held", paid_at: now.toISOString() })
          .eq("id", order.id)
          .eq("status", "pending_payment")
          .select("id")
          .maybeSingle();
        if (updateError) console.error("[payments/webhook] Could not record successful payment:", updateError.message);
      }

      // The database function checks the final order status and counts each order once.
      const { data: stockConfirmed, error: stockError } = await supabase.rpc(
        "confirm_product_stock_sale",
        { p_order_id: order.id }
      );
      if (stockError || stockConfirmed !== true) {
        console.error("[payments/webhook] Payment confirmed but stock needs admin review:", {
          orderId: order.id,
          message: stockError?.message || "Stock reservation expired or unavailable",
        });
      }
    }
  }

  if ((event.event === "charge.failed" || event.event === "transaction.failed") && reference) {
    const { data: failedOrder } = await supabase
      .from("orders")
      .select("id,status,paystack_reference")
      .eq("id", reference)
      .maybeSingle();

    // A signed failure event is useful, but verify Paystack's current transaction
    // state before releasing inventory in case events arrive late or out of order.
    if (failedOrder?.status === "pending_payment" && process.env.PAYSTACK_SECRET_KEY) {
      try {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, Accept: "application/json" } }
        );
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const tx = verifyData?.data;
          const referenceMatches = tx?.reference === (failedOrder.paystack_reference || failedOrder.id);
          if (verifyData?.status && referenceMatches && (tx.status === "failed" || tx.status === "abandoned")) {
            await supabase.rpc("release_product_stock_reservation", { p_order_id: failedOrder.id });
          }
        }
      } catch (error: any) {
        console.error("[payments/webhook] Failed transaction recheck deferred:", error?.message || "Unknown error");
      }
    }
  }

  return res.status(200).json({ received: true });
}
