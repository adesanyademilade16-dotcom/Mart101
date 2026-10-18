import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";
const SITE_URL = "https://mart101.vercel.app";
const PLATFORM_COMMISSION_RATE = 0; // 0% for launch — change this single number later

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

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid session" });

  const { product_id } = req.body;
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, price, seller_id")
    .eq("id", product_id)
    .maybeSingle();

  if (productError || !product) return res.status(404).json({ error: "Product not found" });
  if (product.seller_id === user.id) return res.status(400).json({ error: "You can't buy your own listing" });

  const deliveryFee = 0; // placeholder until seller-set delivery fee UI exists
  const subtotal = Number(product.price) + deliveryFee;
  const paystackFee = calculatePaystackFee(subtotal);
  const totalPaid = subtotal + paystackFee;
  const platformCommission = Math.round(subtotal * PLATFORM_COMMISSION_RATE);
  const sellerPayout = subtotal - platformCommission;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: product.id,
      buyer_id: user.id,
      seller_id: product.seller_id,
      item_amount: product.price,
      delivery_fee: deliveryFee,
      paystack_fee: paystackFee,
      platform_commission: platformCommission,
      total_paid: totalPaid,
      seller_payout: sellerPayout,
      status: "pending_payment",
    })
    .select()
    .single();

  if (orderError || !order) return res.status(500).json({ error: "Could not create order" });

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: Math.round(totalPaid * 100), // Paystack expects kobo
      reference: order.id,
      callback_url: `${SITE_URL}/product/${product.id}`,
      metadata: { order_id: order.id, product_name: product.name },
    }),
  });

  const paystackData = await paystackRes.json();
  if (!paystackData.status) {
    return res.status(500).json({ error: "Paystack initialization failed" });
  }

  await supabase.from("orders").update({ paystack_reference: order.id }).eq("id", order.id);

  return res.status(200).json({ authorization_url: paystackData.data.authorization_url });
         }
