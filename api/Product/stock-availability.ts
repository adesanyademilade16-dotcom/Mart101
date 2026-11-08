import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "Invalid JSON body" }); }
  }

  const ids = Array.isArray(body?.product_ids)
    ? [...new Set(body.product_ids.filter((id: unknown) => typeof id === "string" && id.length > 0))]
    : [];
  if (!ids.length || ids.length > 100) {
    return res.status(400).json({ error: "Provide between 1 and 100 product IDs" });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: "Stock availability is not configured" });

  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id,stock_quantity,quantity_sold")
    .in("id", ids);
  if (productsError) return res.status(503).json({ error: "Could not load stock information" });

  const validIds = (products || []).map((product) => product.id);
  const reservedByProduct: Record<string, number> = {};
  if (validIds.length) {
    for (let offset = 0; ; offset += 1000) {
      const { data: reservations, error: reservationError } = await supabase
        .from("product_stock_reservations")
        .select("product_id")
        .in("product_id", validIds)
        .eq("status", "reserved")
        .range(offset, offset + 999);
      if (reservationError) return res.status(503).json({ error: "Could not confirm reserved stock" });
      (reservations || []).forEach((reservation) => {
        reservedByProduct[reservation.product_id] = (reservedByProduct[reservation.product_id] || 0) + 1;
      });
      if (!reservations || reservations.length < 1000) break;
    }
  }

  const stock = (products || []).map((product) => {
    const sold = Number(product.quantity_sold || 0);
    const reserved = reservedByProduct[product.id] || 0;
    const available = product.stock_quantity == null
      ? null
      : Math.max(0, Number(product.stock_quantity) - sold - reserved);
    return { product_id: product.id, stock_quantity: product.stock_quantity, quantity_sold: sold, quantity_reserved: reserved, quantity_available: available };
  });

  return res.status(200).json({ stock });
}
