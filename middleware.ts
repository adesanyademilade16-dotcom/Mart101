import { rewrite, next } from "@vercel/edge";

export const config = {
  matcher: ["/product/:path*", "/seller/:path*"],
};

const BOT_PATTERN = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|Googlebot|Applebot|redditbot/i;

export default function middleware(request: Request) {
const userAgent = request.headers.get("user-agent") || "";
if (!BOT_PATTERN.test(userAgent)) {
return next();
}

const url = new URL(request.url);
const segments = url.pathname.split("/").filter(Boolean);
const [type, id] = segments;

if ((type === "product" || type === "seller") && id) {
return rewrite(new URL(/api/share/${type}/${id}, request.url));
}

return next();
}
