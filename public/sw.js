const CACHE_VERSION = "v1";
const CACHES = {
  static: `static-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  fonts: `fonts-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  documents: `documents-${CACHE_VERSION}`,
};

// Resources to cache immediately
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles/main.css",
  "/toggle-theme.js",
  "/assets/favicon.webp",
  "/sitemap-index.xml",
  "/rss.xml",
  "/posts/",
  "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Chakra+Petch:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "https://www.googletagmanager.com/gtag/js?id=G-R8GFE58WR2",
];

// Cache duration configurations
const CACHE_TIMES = {
  api: 5 * 60 * 1000, // 5 minutes
  images: 7 * 24 * 60 * 60 * 1000, // 7 days
  documents: 24 * 60 * 60 * 1000, // 1 day
};

// Helper function to determine resource type
function getResourceType(request) {
  const url = new URL(request.url);

  if (STATIC_ASSETS.includes(url.pathname)) {
    return "static";
  }

  if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)
  ) {
    return "images";
  }

  if (
    request.destination === "font" ||
    url.pathname.match(/\.(woff|woff2|ttf|otf)$/)
  ) {
    return "fonts";
  }

  if (url.pathname.startsWith("/api/")) {
    return "api";
  }

  if (url.pathname.match(/\.(pdf|doc|docx|xls|xlsx)$/)) {
    return "documents";
  }

  return "static";
}

// Different caching strategies
const strategies = {
  // Cache-first strategy for static assets
  static: async request => {
    const cache = await caches.open(CACHES.static);
    const cached = await cache.match(request);
    if (cached) return cached;

    const fetched = await fetch(request);
    cache.put(request, fetched.clone());
    return fetched;
  },

  // Stale-while-revalidate for images
  images: async request => {
    const cache = await caches.open(CACHES.images);
    const cached = await cache.match(request);

    const networkPromise = fetch(request).then(response => {
      cache.put(request, response.clone());
      return response;
    });

    return cached || networkPromise;
  },

  // Network-first for API calls
  api: async request => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHES.api);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw error;
    }
  },

  // Cache-first with periodic updates for fonts
  fonts: async request => {
    const cache = await caches.open(CACHES.fonts);
    const cached = await cache.match(request);
    if (cached) return cached;

    const fetched = await fetch(request);
    cache.put(request, fetched.clone());
    return fetched;
  },

  // Network-first with longer cache for documents
  documents: async request => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHES.documents);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw error;
    }
  },
};

// Add this helper function
async function validateStaticAssets() {
  const validAssets = [];

  for (const url of STATIC_ASSETS) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        validAssets.push(url);
      } else {
        console.warn(`Invalid static asset: ${url}`);
      }
    } catch (error) {
      console.warn(`Could not validate ${url}:`, error);
    }
  }

  return validAssets;
}

// Modified install event
self.addEventListener("install", event => {
  event.waitUntil(
    validateStaticAssets()
      .then(validAssets =>
        caches.open(CACHES.static).then(cache => cache.addAll(validAssets))
      )
      .catch(error => {
        console.error("Service Worker installation failed:", error);
      })
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener("fetch", event => {
  const resourceType = getResourceType(event.request);

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    strategies[resourceType](event.request).catch(error => {
      console.error("Cache strategy failed:", error);
      return new Response("Offline content unavailable", {
        status: 503,
        statusText: "Service Unavailable",
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      // Delete old cache versions
      caches.keys().then(keys => {
        return Promise.all(
          keys.map(key => {
            const isOldCache = Object.values(CACHES).every(
              cache => key !== cache
            );
            if (isOldCache) {
              return caches.delete(key);
            }
          })
        );
      }),
      // Clean up expired items in API cache
      caches.open(CACHES.api).then(async cache => {
        const keys = await cache.keys();
        return Promise.all(
          keys.map(async request => {
            const response = await cache.match(request);
            const metadata = response.headers.get("sw-cache-timestamp");
            if (metadata && Date.now() - parseInt(metadata) > CACHE_TIMES.api) {
              return cache.delete(request);
            }
          })
        );
      }),
    ])
  );
  self.clients.claim();
});

// Optional: Background sync for failed requests
self.addEventListener("sync", event => {
  if (event.tag === "sync-failed-requests") {
    event.waitUntil(syncFailedRequests());
  }
});
