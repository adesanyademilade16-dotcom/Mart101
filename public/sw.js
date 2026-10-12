self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (!event.data) {
          await self.registration.showNotification("MART101 (debug)", {
            body: "Push event fired but had no data attached.",
          });
          return;
        }

        let data;
        try {
          data = event.data.json();
        } catch (jsonErr) {
          const raw = event.data.text();
          await self.registration.showNotification("MART101 (debug: bad JSON)", {
            body: raw.slice(0, 180),
          });
          return;
        }

        await self.registration.showNotification(data.title || "MART101", {
          body: data.body || "",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          data: { url: data.url || "/messages" },
        });
      } catch (err) {
        await self.registration.showNotification("MART101 (debug: error)", {
          body: String((err && err.message) || err),
        });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/messages";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
