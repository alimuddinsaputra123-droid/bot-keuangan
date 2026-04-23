/**
 * KEUANGANKU - SERVICE WORKER
 * Multi-Page PWA dengan Cache Strategy
 * Version: 4.0
 */

const CACHE_NAME = 'keuanguanku-cache-v4';
const STATIC_CACHE = 'keuanguanku-static-v4';
const DYNAMIC_CACHE = 'keuanguanku-dynamic-v4';

// Assets to cache on install
const STATIC_ASSETS = [
    // HTML Pages
    '/',
    '/index.html',
    '/grafik.html',
    '/transaksi.html',
    '/export.html',
    
    // CSS
    '/css/style.css',
    
    // JS Core
    '/js/app.js',
    '/js/charts.js',
    '/js/export.js',
    
    // Icons (minimal set)
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// External libraries to cache
const EXTERNAL_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE)
                .then(cache => {
                    console.log('[SW] Caching static assets...');
                    return cache.addAll(STATIC_ASSETS);
                }),
            
            // Cache external libraries
            caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    console.log('[SW] Caching external libraries...');
                    return Promise.all(
                        EXTERNAL_ASSETS.map(url => 
                            fetch(url, { mode: 'no-cors' })
                                .then(response => {
                                    if (response.status === 200 || response.type === 'opaque') {
                                        return cache.put(url, response);
                                    }
                                })
                                .catch(err => console.log('[SW] Failed to cache:', url, err))
                        )
                    );
                })
        ])
        .then(() => {
            console.log('[SW] Install complete');
            return self.skipWaiting();
        })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => {
                            return name.startsWith('keuanguanku-') && 
                                   name !== STATIC_CACHE && 
                                   name !== DYNAMIC_CACHE;
                        })
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activate complete');
                return self.clients.claim();
            })
    );
});

// ============================================
// FETCH EVENT - Cache Strategies
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s)
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Strategy 1: Cache First for Static Assets
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }
    
    // Strategy 2: Stale While Revalidate for External Libraries
    if (isExternalLibrary(url)) {
        event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
        return;
    }
    
    // Strategy 3: Network First for API/Data (IndexedDB doesn't use fetch)
    // Strategy 4: Cache First for HTML pages (offline support)
    if (isHTMLPage(request)) {
        event.respondWith(cacheFirstWithNetworkFallback(request));
        return;
    }
    
    // Default: Network with cache fallback
    event.respondWith(networkWithCacheFallback(request));
});

// ============================================
// CACHE STRATEGIES
// ============================================

// Cache First - untuk assets static
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Cache first failed:', error);
        throw error;
    }
}

// Stale While Revalidate - untuk external libraries
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    const networkFetch = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cached);
    
    return cached || networkFetch;
}

// Cache First with Network Fallback - untuk HTML pages
async function cacheFirstWithNetworkFallback(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        // Update cache in background
        fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse);
            }
        }).catch(() => {});
        
        return cached;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return offline page jika ada
        const offlinePage = await cache.match('/index.html');
        if (offlinePage) {
            return offlinePage;
        }
        throw error;
    }
}

// Network with Cache Fallback - default
async function networkWithCacheFallback(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        throw error;
    }
}

// ============================================
// HELPERS
// ============================================

function isStaticAsset(request) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
    const url = request.url.toLowerCase();
    return staticExtensions.some(ext => url.endsWith(ext));
}

function isExternalLibrary(url) {
    const domains = ['cdn.jsdelivr.net', 'cdn.sheetjs.com', 'cdnjs.cloudflare.com'];
    return domains.some(domain => url.hostname.includes(domain));
}

function isHTMLPage(request) {
    const acceptHeader = request.headers.get('Accept') || '';
    return acceptHeader.includes('text/html') || request.url.endsWith('.html') || request.url.endsWith('/');
}

// ============================================
// BACKGROUND SYNC (untuk fitur tambahan nanti)
// ============================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-transactions') {
        console.log('[SW] Background sync triggered');
        // Bisa digunakan untuk sync ke server nanti
    }
});

// ============================================
// PUSH NOTIFICATIONS (untuk fitur tambahan nanti)
// ============================================
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Notifikasi KeuanganKu',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'keuanguanku-notification'
    };
    
    event.waitUntil(
        self.registration.showNotification('KeuanganKu', options)
    );
});