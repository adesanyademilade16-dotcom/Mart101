import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_P-DxPIQjWBTuCy3VhTwE2Q_OygxTVZV";
const SITE_URL = "https://mart101.vercel.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-banner.png`;

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req: any, res: any) {
  const { id } = req.query;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, price, description, image_url")
    .eq("id", id)
    .maybeSingle();

  const pageUrl = `${SITE_URL}/product/${id}`;
  
  // Fallbacks if product isn't found
  const title = product ? `${product.name} - ₦${Number(product.price).toLocaleString()} | MART101` : "MART101 Listing";
  const description = product
    ? (product.description || `${product.name} available on MART101.`).slice(0, 160)
    : "View this listing on MART101, OOU's student marketplace.";
  
  // Ensure we use the product's image if available, otherwise fallback
  const image = product?.image_url && product.image_url.trim() !== "" ? product.image_url : DEFAULT_IMAGE;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  
  <!-- Open Graph / WhatsApp Meta Tags -->
  <meta property="og:site_name" content="MART101" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="website" />

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- Redirect for Humans -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a>...</p>
  <script>window.location.replace(${JSON.stringify(pageUrl)});</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
  res.status(200).send(html);
}
