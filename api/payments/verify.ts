
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://ututplfwuwwkbcrrjydw.supabase.co";

const AUTO_RELEASE_DAYS = 3;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || token === authHeader.trim()) {
    return res.status(401).json({
      error: "Not logged in",
    });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        error: "Invalid JSON body",
      });
    }
  }

  const orderId = body?.order_id;

  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderId
    )
  ) {
    return res.status(400).json({
      error: "A valid order_id is required",
    });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;

  if (!serviceKey || !paystackKey) {
    console.error(
      "[payments/verify] Required server configuration is missing"
    );

    return res.status(500).json({
      error: "Payment verification is not configured",
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Authenticate the actual buyer using their access token.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: "Invalid session",
      });
    }

    // Never verify an order belonging to another buyer.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id,buyer_id,status,total_paid,paystack_reference,paid_at,auto_release_at"
      )
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (orderError) {
      console.error("[payments/verify] Order lookup failed:", {
        code: orderError.code,
        message: orderError.message,
      });

      return res.status(500).json({
        error: "Could not retrieve the order",
      });
    }

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    // Make retries safe for orders already confirmed.
    if (order.status !== "pending_payment") {
      return res.status(200).json({
        status: order.status,
      });
    }

    const reference = order.paystack_reference || order.id;
    const expectedAmount = Number(order.total_paid);

    if (
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0 ||
      !reference
    ) {
      return res.status(409).json({
        error: "The order has invalid payment details",
      });
    }

    // Verify the transaction directly with Paystack.
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!verifyRes.ok) {
      console.error("[payments/verify] Paystack verification failed:", {
        httpStatus: verifyRes.status,
        orderId: order.id,
      });

      return res.status(502).json({
        error: "Could not verify the payment with Paystack",
      });
    }

    const verifyData = await verifyRes.json();
    const tx = verifyData?.data;

    if (!verifyData?.status || !tx) {
      return res.status(200).json({
        status: "pending_payment",
        message: "Payment is not yet confirmed",
      });
    }

    // Paystack reports amounts in the smallest currency unit.
    const expectedKobo = Math.round(expectedAmount * 100);

    if (
      tx.status !== "success" ||
      tx.reference !== reference ||
      Number(tx.amount) !== expectedKobo ||
      tx.currency !== "NGN"
    ) {
      console.warn("[payments/verify] Payment details did not match:", {
        orderId: order.id,
        transactionStatus: tx.status,
        referenceMatched: tx.reference === reference,
        currencyMatched: tx.currency === "NGN",
        amountMatched: Number(tx.amount) === expectedKobo,
      });

      return res.status(409).json({
        error: "Payment details do not match this order",
      });
    }

    const paidAt = new Date();
    const autoReleaseAt = new Date(
      paidAt.getTime() +
        AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000
    );

    // Attempt the guarded status transition.
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid_held",
        paid_at: paidAt.toISOString(),
        auto_release_at: autoReleaseAt.toISOString(),
      })
      .eq("id", order.id)
      .eq("buyer_id", user.id)
      .eq("status", "pending_payment")
      .select("id,status")
      .maybeSingle();

    if (updateError) {
      // Log the actual database error, but never expose secrets.
      console.error("[payments/verify] Order update failed:", {
        orderId: order.id,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });

      return res.status(500).json({
        error: "Payment was verified but could not be recorded",
        code: "ORDER_UPDATE_FAILED",
      });
    }

    // Another request may have confirmed the order concurrently.
    if (!updated) {
      const { data: latestOrder, error: latestError } =
        await supabase
          .from("orders")
          .select("status")
          .eq("id", order.id)
          .eq("buyer_id", user.id)
          .maybeSingle();

      if (latestError || !latestOrder) {
        return res.status(500).json({
          error: "Could not confirm the final order status",
        });
      }

      if (latestOrder.status !== "pending_payment") {
        return res.status(200).json({
          status: latestOrder.status,
        });
      }

      return res.status(409).json({
        error: "The order has not been updated. Please contact support.",
      });
    }

    return res.status(200).json({
      status: updated.status,
    });
  } catch (error: any) {
    console.error("[payments/verify] Unexpected error:", {
      message:
        typeof error?.message === "string"
          ? error.message
          : "Unknown server error",
    });

    return res.status(500).json({
      error: "An unexpected payment verification error occurred",
    });
  }
}
