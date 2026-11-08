import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";
const MAX_PRICE = 1000000;
const CATEGORIES = ["Electronics", "Fashion", "Books", "Gadgets", "Hostel Essentials", "Services", "Past Questions", "Accommodation", "Tutorials", "Digital Services", "Others"];
const CONDITIONS = ["Brand New", "Used – Like New", "Used – Good", "Used – Fair"];
const PAYMENT_TYPES = ["Pay on Delivery", "Pre-order", "Flexible"];
const DELIVERY_TIMES = ["Same day", "1–3 days", "3–7 days", "1–2 weeks"];

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not logged in" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); } }

  const id = String(body?.product_id || "");
  const name = String(body?.name || "").trim();
  const description = String(body?.description || "").trim();
  const price = Number(body?.price);
  const category = String(body?.category || "");
  const condition = String(body?.condition || "");
  const payment_type = String(body?.payment_type || "");
  const delivery_timeframe = String(body?.delivery_timeframe || "");
  const defects_description = String(body?.defects_description || "").trim();
  const image_url = body?.image_url == null ? null : String(body.image_url);
  const extra_image_urls = Array.isArray(body?.extra_image_urls) ? body.extra_image_urls.map(String).slice(0, 4) : [];

  if (!id || name.length < 2 || name.length > 100 || description.length < 10 || description.length > 2000 || !Number.isFinite(price) || price <= 0 || price > MAX_PRICE || !CATEGORIES.includes(category) || !CONDITIONS.includes(condition) || !PAYMENT_TYPES.includes(payment_type) || !DELIVERY_TIMES.includes(delivery_timeframe) || (image_url && !image_url.startsWith("https://")) || extra_image_urls.some((url: string) => !url.startsWith("https://"))) {
    return res.status(400).json({ error: "Please check the product details and try again." });
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid session" });

  const { data: product, error: productError } = await supabase.from("products").select("id,seller_id,quantity_sold,stock_quantity").eq("id", id).maybeSingle();
  if (productError || !product) return res.status(404).json({ error: "Product not found" });
  if (product.seller_id !== user.id) return res.status(403).json({ error: "You can only edit your own listings." });
  const { data: profile } = await supabase.from("profiles").select("suspended").eq("user_id", user.id).maybeSingle();
  if (profile?.suspended) return res.status(403).json({ error: "Your account is restricted from editing listings." });

  const { data, error } = await supabase.from("products").update({
    name, price, description, category, condition, payment_type, delivery_timeframe,
    defects_description: condition.startsWith("Used") ? (defects_description || null) : null,
    image_url, extra_image_urls: extra_image_urls.length ? extra_image_urls : null,
  }).eq("id", id).eq("seller_id", user.id).select("*").single();
  if (error) return res.status(500).json({ error: "The listing could not be updated. Please try again." });
  return res.status(200).json({ product: data });
}
