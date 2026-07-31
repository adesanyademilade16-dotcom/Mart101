# Mart101 — final assets batch (PWA + favicon + OG image)

Everything here is built from your two real uploads (the transparent bag logo
and the MART101 poster) — cropped, resized, and composited, not AI-generated
art. The MART101 wordmark in og-banner.png is a real crop straight from your
poster, so it's pixel-accurate to your actual branding.

## Upload these

- `public/og-banner.png` — 1200×630, used for link previews (WhatsApp, etc.)
- `public/icon-192.png`, `public/icon-512.png` — PWA install icons
- `public/apple-touch-icon.png` — iOS home screen icon
- `public/favicon.ico`, `public/favicon-32x32.png`, `public/favicon-16x16.png` — browser tab icons
- `public/logo.png` — clean transparent logo, this is what `BrandLogo.tsx` displays in the header/footer
- `public/manifest.json` — PWA config
- `public/sw.js` — minimal service worker (install support only, no offline caching yet)
- `index.html` — REPLACES your current one. Adds every favicon/PWA/OG tag in one place.

## After uploading

- Vercel auto-deploys on push, as usual
- Test PWA install: open the live site on your phone, you should get an install
  prompt (or Chrome's menu → "Add to Home screen" / "Install app")
- Test OG preview: paste your Vercel link into a WhatsApp chat — the banner
  should now show up instead of a blank/generic preview
- The `<InstallAppButton />` on your splash screen should now actually appear
  and work, since `sw.js` finally exists for it to register

## One thing to keep honest
The OG banner and icons are compositions of your real assets on a gradient
background — solid and usable, but not a from-scratch professional redesign.
If you want that later, Canva's free OG-image templates or a design tool are
the right next step, not something I can generate here.
