// Deutsche Fahrschul-App Service Worker - OFFLINE + KORREKTE BERECHNUNGEN
const APP_VERSION = '3.1-corrected-calculations';
const CACHE_NAME = `fahrschul-app-${APP_VERSION}`;

// KRITISCHE DATEIEN FÜR OFFLINE-NUTZUNG
const CRITICAL_FILES = [
  'fahrschul.html',
  'manifest.json'
];

// INSTALLATION - LADE NUR AKTUELLE VERSION
self.addEventListener('install', (event) => {
  console.log(`[SW] Installiere ${APP_VERSION} für Offline-Nutzung`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache kritische Dateien für Offline-Nutzung');
        return cache.addAll(CRITICAL_FILES);
      })
      .then(() => {
        console.log('[SW] Installation abgeschlossen, überspringe Wartephase');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation fehlgeschlagen:', error);
      })
  );
});

// AKTIVIERUNG - LÖSCHE ALTE VERSIONEN
self.addEventListener('activate', (event) => {
  console.log(`[SW] Aktiviere ${APP_VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Lösche alte Cache-Versionen
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Lösche alte Cache-Version:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Übernimm alle Clients
      self.clients.claim()
    ]).then(() => {
      console.log(`[SW] ${APP_VERSION} aktiv - Offline-Modus bereit`);
    })
  );
});

// FETCH HANDLER - INTELLIGENT FÜR OFFLINE
self.addEventListener('fetch', (event) => {
  // Nur GET-Requests verarbeiten
  if (event.request.method !== 'GET') return;
  
  // Ignoriere spezielle URLs
  if (event.request.url.includes('chrome-extension://') || 
      event.request.url.includes('moz-extension://')) return;

  const url = new URL(event.request.url);
  const isHTMLFile = url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  
  if (isHTMLFile) {
    // FÜR HTML-DATEIEN: STALE-WHILE-REVALIDATE
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // Versuche gleichzeitig ein Update zu laden
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              // Update den Cache im Hintergrund
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Netzwerk fehlgeschlagen, verwende Cache
            return cachedResponse;
          });
          
          // Gib cached Version sofort zurück, update im Hintergrund
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    // FÜR ANDERE DATEIEN: CACHE FIRST (bessere Offline-Performance)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            // Cache für zukünftige Offline-Nutzung
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

// MESSAGE HANDLER - FÜR FORCE-UPDATES
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[SW] SkipWaiting angefordert');
    self.skipWaiting();
  }
});

// SYNC EVENT - FÜR ZUKÜNFTIGE FEATURES
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  // Hier könnten in Zukunft Daten synchronisiert werden
});