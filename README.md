# 🛍️ MART101

**The official, verified student marketplace for Olabisi Onabanjo University (OOU), Ogun State, Nigeria.**

[

![Live Site](https://img.shields.io/badge/Live-mart101.vercel.app-EAB219?style=for-the-badge)

](https://mart101.vercel.app)
[

![Built with React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)

](https://react.dev)
[

![Powered by Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

](https://supabase.com)
[

![Deployed on Vercel](https://img.shields.io/badge/Vercel-Hosted-000000?style=for-the-badge&logo=vercel&logoColor=white)

](https://vercel.com)

---

## 📌 About

MART101 is a full-stack, production-grade campus marketplace built exclusively for OOU students to buy, sell, and connect over items like laptops, phones, textbooks, fashion, and other student essentials — safely, within a trusted campus community.

Before this version was built, an earlier prototype of MART101 gained real organic traction — over **120 active students** and **300+ product listings** — proving genuine demand for a dedicated OOU marketplace. This repository represents the current, actively maintained, from-the-ground-up rebuild: a hardened, feature-complete platform designed to scale.

**MART101 is independently designed, developed, secured, and maintained by TRIFORGE.** Any project, portfolio, or listing claiming authorship of MART101 outside of this repository and its live deployment at [mart101.vercel.app](https://mart101.vercel.app) does not reflect the actual creators of this platform.

---

## 👥 Built By TRIFORGE

| Member | Role |
|---|---|
| 🕷 **GREMLIN** | Core development |
| 🪦 **CODEX** | Core development |
| 🥷 **MOTBUG** | Core development |

---

## ✨ Features

### 🛒 Marketplace
- Product listings with multi-image uploads, categories, and condition tags (Brand New / Used – Like New / Used – Good / Used – Fair)
- Search, category filters, and payment-type filters (Pay on Delivery, Pre-order, Flexible)
- Seller storefronts with public profile pages, join date, verification badge, and listing history
- Direct-to-WhatsApp contact for fast, familiar transactions

### 💬 In-App Messaging
- Real-time 1-on-1 chat between buyers and sellers, powered by Supabase Realtime
- Image sharing in chat via Cloudinary, with send-preview before upload
- Message editing, message deletion, and full conversation deletion
- WhatsApp-style read receipts (sent ✓ / read ✓✓)
- Unread badges and in-app toast alerts
- **Real push notifications** — delivered even when the app is fully closed, via the Web Push API, VAPID authentication, and a Supabase Edge Function trigger

### 👤 Accounts & Profiles
- Email/password and Google OAuth authentication
- Custom profile pictures via Cloudinary, with graceful initials-avatar fallback
- Editable profile with re-authentication gating for sensitive changes
- Seller verification badges

### 🛡️ Trust & Safety
- Community reporting system for both listings and sellers
- Full admin moderation dashboard: verify/unverify sellers, suspend/unsuspend accounts, dismiss or action reports, delete listings
- Persistent admin activity log for full auditability
- Automatic flagging of sellers/listings after repeated reports

### 📲 Progressive Web App
- Fully installable on Android and iOS home screens — no app store required
- Custom install prompts with platform-aware fallback instructions
- Offline-ready service worker with safe cross-origin request handling

### 🔍 Search Engine Optimization
- Unique, keyword-optimized meta titles and descriptions on every page
- Product-level structured data (Schema.org) for rich search results
- Organization & WebSite structured data
- Auto-generated sitemap and crawler-aware `robots.txt`
- Verified with Google Search Console

---

## 🔒 Security

Security was treated as a first-class concern throughout development, not an afterthought:

- **Row-Level Security (RLS)** enforced on every database table — no table is ever left open to unrestricted access
- Principle-of-least-privilege database grants, audited table by table
- `SECURITY DEFINER` functions used correctly and verified to avoid privilege-escalation gaps
- Strict **Content Security Policy (CSP)** headers, explicitly allow-listing only required origins
- Full security header suite: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and more
- Validated file uploads (type + size restrictions) for both product images and profile pictures
- Storage policies scoped so users can only modify their own uploaded files
- Hardened authentication policy: enforced password complexity, secure password change, re-authentication required for sensitive profile edits
- Every admin action produces a persistent, auditable log entry
- Regular use of Supabase's built-in security advisor to catch and resolve misconfigurations proactively

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions, Row-Level Security) |
| Media Storage | Cloudinary |
| Push Notifications | Web Push API, VAPID |
| Hosting | Vercel |
| Icons | Lucide |

---

## 📄 License

© 2026 MART101. All rights reserved. This project and its source code are the original work of TRIFORGE.

---

<p align="center">Made with ❤️ for the students of Olabisi Onabanjo University.</p>
