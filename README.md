# Mart101 — components batch (final one)

Upload these into your existing repo, same folder structure:

- src/lib/utils.ts (new — required by every ui component)
- src/components/ui/*.tsx (11 files — button, input, label, textarea, select,
  tooltip, tabs, accordion, badge, card, carousel, toast, toaster, sonner)
- src/hooks/use-toast.ts
- src/components/*.tsx (11 files — BrandLogo, AppHeader, AppFooter,
  ConditionBadge, PaymentBadge, VerifiedBadge, ConfirmModal, LazyImage,
  GoogleSignInButton, InstallAppButton, PaymentTrustMessage)
- package.json — REPLACES the previous one again. Added: @radix-ui/react-accordion,
  @radix-ui/react-dialog, embla-carousel-react, recharts

## One thing YOU need to do
`BrandLogo.tsx` expects your logo image at `public/logo.png`. Save the blue
bag "101" PNG you already have as exactly that filename and path — if it's
missing, the logo just won't render (nothing breaks, just an empty circle).

Also add a `public/favicon.svg` or `public/favicon.png` for the browser tab icon
— reuse the same logo image, just renamed/copied.

## After this upload
This should be everything the app needs to actually compile and run. Once
Vercel's deploy goes green, the real testing starts: signup → check Supabase
Auth + profiles table → post a product → check it appears on Marketplace →
confirm RLS is actually blocking edits from other accounts.
