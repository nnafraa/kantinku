// Service worker minimal: cukup agar aplikasi bisa dipasang (install) dari browser.
// Sengaja tidak menyimpan cache supaya tampilan dan data selalu terbaru.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
