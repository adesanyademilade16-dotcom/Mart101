import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_P-DxPIQjWBTuCy3VhTwE2Q_OygxTVZV";
const SITE_URL = "https://mart101.vercel.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-banner.png`;

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Ensure the image/avatar is an absolute, publicly-reachable https URL.
function absoluteImage(raw: string | undefined | null): string {
  if (!raw || raw.trim() === "") return DEFAULT_IMAGE;
  const url = raw.trim();
  // Relative Supabase Storage path -> full public URL
  if (url.startsWith("/")) return `${SUPABASE_URL}/storage/v1/object/public/${url.replace(/^\//, "")}`;
  return url;
}

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  if (!id) {
    res.setHeader("Location", SITE_URL);
    return res.status(302).end();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Fetch seller public info using your RPC function
  const { data: sellerArr } = await supabase
    .rpc("get_seller_public_info", { seller_ids: [id] });
  const seller = sellerArr?.[0];

  const pageUrl = `${SITE_URL}/seller/${id}`;
  const title = seller ? `${seller.full_name} on MART101` : "Seller Profile | MART101";
  const description = seller
    ? `View products listed by ${seller.full_name} on MART101, OOU's trusted student marketplace.`
    : "View this seller's profile and listings on MART101.";

  let image = absoluteImage(seller?.avatar_url);

  // If it's a Supabase public-storage avatar, resize it to a clean 1200x630 card format
  if (image.includes(`${SUPABASE_URL}/storage/v1/object/public/`) || image.startsWith(`${SUPABASE_URL}/storage/`)) {
    image = image.replace("/object/public/", "/render/image/public/") + "?width=1200&height=630&resize=cover&quality=80";
  }

  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  const isBot = /bot|facebookexternalhit|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot/i.test(userAgent);

  // If it's a normal human user, instantly redirect them with a 302
  if (!isBot) {
    res.setHeader("Location", pageUrl);
    return res.status(302).end();
  }

  // If it's a bot/crawler, serve the Open Graph metadata HTML
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="MART101" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  return res.status(200).send(html);
}
