self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only intercept same-origin requests; let cross-origin requests
  // (Cloudinary, Supabase, fonts, etc.) go straight to the network
  // untouched, avoiding CSP connect-src reclassification issues.
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});
