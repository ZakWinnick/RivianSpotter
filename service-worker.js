// Service Worker for RivianSpotter
// Version: 1.0.0

const CACHE_VERSION = 'rivianspotter-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const MAPBOX_CACHE = `${CACHE_VERSION}-mapbox`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Cache duration settings (in milliseconds)
const CACHE_DURATIONS = {
  mapbox: 7 * 24 * 60 * 60 * 1000, // 7 days
  api: 30 * 60 * 1000, // 30 minutes
  dynamic: 24 * 60 * 60 * 1000 // 24 hours
};

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/contact.html',
  '/admin.html',
  '/css/style.css',
  '/js/app.js',
  '/js/config.js',
  '/js/data-loader.js',
  '/js/locations.js',
  '/js/components.js',
  '/js/admin.js',
  '/images/rivian-logo.png',
  '/images/rivian-logo-white.png',
  '/offline.html'
];

// Mapbox and external resources patterns
const MAPBOX_PATTERN = /https:\/\/api\.mapbox\.com/;
const MAPBOX_TILES_PATTERN = /https:\/\/[a-z]\.tiles\.mapbox\.com/;
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName.startsWith('rivianspotter-') &&
                cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== IMAGE_CACHE &&
                cacheName !== MAPBOX_CACHE &&
                cacheName !== API_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (MAPBOX_PATTERN.test(url.href) || MAPBOX_TILES_PATTERN.test(url.href)) {
    // Mapbox API and tiles: Cache-first with network fallback
    event.respondWith(cacheFirstWithExpiry(request, MAPBOX_CACHE, CACHE_DURATIONS.mapbox));
  } else if (url.pathname.startsWith('/api/')) {
    // API calls: Network-first with cache fallback
    event.respondWith(networkFirstWithCache(request, API_CACHE, CACHE_DURATIONS.api));
  } else if (url.pathname.startsWith('/data/')) {
    // Data files: Network-first with cache fallback
    event.respondWith(networkFirstWithCache(request, API_CACHE, CACHE_DURATIONS.api));
  } else if (IMAGE_EXTENSIONS.test(url.pathname)) {
    // Images: Cache-first with network fallback
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname === asset.replace('/', ''))) {
    // Static assets: Cache-first with network fallback
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    // Dynamic content: Network-first with cache fallback
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE, CACHE_DURATIONS.dynamic));
  }
});

// Strategy: Cache-first (for static assets and images)
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[Service Worker] Cache hit:', request.url);
      return cachedResponse;
    }

    console.log('[Service Worker] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first failed:', error);

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/offline.html');
    }

    throw error;
  }
}

// Strategy: Cache-first with expiry (for Mapbox tiles)
async function cacheFirstWithExpiry(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date'));
      const now = new Date();

      // Check if cache is still valid
      if (now - cachedDate < maxAge) {
        console.log('[Service Worker] Cache hit (valid):', request.url);
        return cachedResponse;
      } else {
        console.log('[Service Worker] Cache expired:', request.url);
      }
    }

    console.log('[Service Worker] Fetching fresh:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses with timestamp
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cached-date', new Date().toISOString());

      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });

      cache.put(request, modifiedResponse);
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first with expiry failed:', error);

    // Return cached version even if expired
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[Service Worker] Returning expired cache:', request.url);
      return cachedResponse;
    }

    throw error;
  }
}

// Strategy: Network-first with cache fallback (for API and dynamic content)
async function networkFirstWithCache(request, cacheName, maxAge) {
  try {
    console.log('[Service Worker] Network-first:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const headers = new Headers(networkResponse.headers);
      headers.append('sw-cached-date', new Date().toISOString());

      const responseToCache = new Response(networkResponse.clone().body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });

      cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cached response is still valid
      const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date'));
      const now = new Date();

      if (now - cachedDate < maxAge) {
        console.log('[Service Worker] Returning valid cached response');
        return cachedResponse;
      } else {
        console.log('[Service Worker] Returning expired cached response (offline)');
        // Return expired cache when offline
        return cachedResponse;
      }
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const staticCache = await caches.open(STATIC_CACHE);
      return staticCache.match('/offline.html');
    }

    throw error;
  }
}

// Background Sync for admin changes
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-admin-changes') {
    event.waitUntil(syncAdminChanges());
  }
});

// Sync admin changes when back online
async function syncAdminChanges() {
  try {
    // Retrieve pending changes from IndexedDB
    const db = await openIndexedDB();
    const pendingChanges = await getPendingChanges(db);

    if (pendingChanges.length === 0) {
      console.log('[Service Worker] No pending changes to sync');
      return;
    }

    console.log('[Service Worker] Syncing', pendingChanges.length, 'pending changes');

    // Attempt to sync each change
    for (const change of pendingChanges) {
      try {
        const response = await fetch(change.url, {
          method: change.method,
          headers: change.headers,
          body: change.body
        });

        if (response.ok) {
          // Remove synced change from IndexedDB
          await removePendingChange(db, change.id);
          console.log('[Service Worker] Synced change:', change.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync change:', change.id, error);
      }
    }

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        syncedCount: pendingChanges.length
      });
    });
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
    throw error;
  }
}

// IndexedDB helper functions
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RivianSpotterDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingChanges')) {
        db.createObjectStore('pendingChanges', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingChanges(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingChanges'], 'readonly');
    const store = transaction.objectStore('pendingChanges');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingChange(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingChanges'], 'readwrite');
    const store = transaction.objectStore('pendingChanges');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Message handler for commands from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('rivianspotter-')) {
              console.log('[Service Worker] Clearing cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  } else if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Log service worker version
console.log('[Service Worker] Version:', CACHE_VERSION);
