// Core functionality for Loop PWA push notifications
// This script is registered at /sw.js and must use scope '/'

// Cache name for asset caching
const CACHE_NAME = "loop-pwa-v1";

// Install event - pre-cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/dashboard",
        "/manifest.webmanifest",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/favicon.ico"
      ]).then(() => {
        // Skip waiting to activate the service worker immediately
        self.skipWaiting();
      });
    }).catch((err) => {
      console.warn("SW cache preload error:", err);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Claim clients so this SW controls all pages immediately
      return self.clients.claim();
    })
  );
});

// Push event - show notification when web push is received
self.addEventListener("push", (event) => {
  console.log('[SW] push received', event.data?.text?.());
  let title = "Loop";
  let body = "";
  let icon = "/icons/icon-192.png";
  let tag = "loop-notification";
  let data = {};

  if (event.data) {
    try {
      const dataJson = event.data.json();
      title = dataJson.title || title;
      body = dataJson.body || dataJson.message || body;
      icon = dataJson.icon || icon;
      tag = dataJson.tag || tag;
      data = { ...dataJson };
    } catch (e) {
      console.warn("Push data parse error:", e);
      body = "Новое уведомление from Loop";
    }
  }

  const options = {
    body,
    icon,
    tag,
    vibrate: [200, 100, 200],
    data: data,
    renotify: true,
    actions: [
      { action: "open", title: "Открыть Loop" },
      { action: "dismiss", title: "Закрыть" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      console.log('[SW] showNotification resolved OK');
    }).catch(err => {
      console.error('[SW] showNotification failed:', err)
    })
  );
});

// Notification click event - focus the app or open URL
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;

  // Close the notification by default
  notification.close();

  // Check if there's already a window/tab focused
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // If there's a focused window, focus it and send a message
      const focusedClient = clientList.find((c) => c.focused);
      if (focusedClient) {
        focusedClient.postMessage({
          type: "loop-notification-click",
          data: event.notification.data
        });
        return;
      }

      // Otherwise, open a new window/tab
      if (clients.openWindow) {
        clients.openWindow("/dashboard");
      }
    })
  );
});

// Background sync for offline support
self.addEventListener("sync", (event) => {
  if (event.tag === "loop-sync-messages") {
    event.waitUntil(
      console.log("Background sync triggered for loop-sync-messages")
    );
  }
});