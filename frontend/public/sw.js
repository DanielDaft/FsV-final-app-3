// Deutsche Fahrschul-App Service Worker - NUKLEAR VERSION FÜR CACHE-FIX
const CACHE_NAME = 'fahrschul-app-v3.0-nuclear-fix-' + Date.now(); // EINDEUTIGE VERSION
const OFFLINE_URL = '/FsV-final-app/frontend/public/offline.html';

// ALLE DATEIEN MIT CACHE-BUSTER TIMESTAMPS
const FILES_TO_CACHE = [
  '/FsV-final-app/',
  '/FsV-final-app/index.html',
  '/FsV-final-app/frontend/public/manifest.json',
  '/FsV-final-app/frontend/public/fahrschul.html',
  OFFLINE_URL
].map(url => `${url}?cb=${Date.now()}`); // CACHE-BUSTER FÜR ALLE DATEIEN

// NUKLEAR INSTALLATION - LÖSCHE ALLES
self.addEventListener('install', (event) => {
  console.log('[SW] NUKLEAR INSTALLATION - LÖSCHE ALLE CACHES!');
  event.waitUntil(
    Promise.all([
      // LÖSCHE ALLE BESTEHENDEN CACHES SOFORT
      caches.keys().then(cacheNames => {
        console.log('[SW] Lösche alle bestehenden Caches:', cacheNames);
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[SW] Lösche Cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // ERSTELLE NEUEN CACHE
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Erstelle neuen Cache mit aktuellen Dateien');
        return cache.addAll(FILES_TO_CACHE);
      })
    ]).then(() => {
      console.log('[SW] NUKLEAR INSTALLATION ABGESCHLOSSEN - ÜBERNEHME SOFORT!');
      return self.skipWaiting(); // SOFORT AKTIVIEREN
    }).catch(error => {
      console.error('[SW] NUKLEAR INSTALLATION FEHLGESCHLAGEN:', error);
    })
  );
});

// NUKLEAR AKTIVIERUNG - ÜBERNIMM ALLE CLIENTS SOFORT
self.addEventListener('activate', (event) => {
  console.log('[SW] NUKLEAR AKTIVIERUNG - ÜBERNEHME ALLE CLIENTS!');
  event.waitUntil(
    Promise.all([
      // LÖSCHE ALLE CACHES ERNEUT ZUR SICHERHEIT
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Lösche veralteten Cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // ÜBERNIMM ALLE OFFENEN TABS SOFORT
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] NUKLEAR AKTIVIERUNG ABGESCHLOSSEN!');
      // BENACHRICHTIGE ALLE CLIENTS ÜBER UPDATE
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            message: 'Neue App-Version geladen! 3-Stufen-Berechnung ist jetzt korrekt.'
          });
        });
      });
    })
  );
});

// NUKLEAR FETCH - IMMER NEUESTE VERSION BEVORZUGEN
self.addEventListener('fetch', (event) => {
  // Nur GET requests verarbeiten
  if (event.request.method !== 'GET') return;
  
  // Ignoriere spezielle URLs
  if (event.request.url.includes('chrome-extension://') || 
      event.request.url.includes('moz-extension://')) return;

  event.respondWith(
    // NETWORK FIRST STRATEGY - BEVORZUGE NETZWERK ÜBER CACHE
    fetch(event.request.clone())
      .then(response => {
        // Wenn Netzwerk erfolgreich, cache die neue Version
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Nur wenn Netzwerk fehlschlägt, verwende Cache
        console.log('[SW] Netzwerk fehlgeschlagen, verwende Cache für:', event.request.url);
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback für Navigation
          if (event.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// MESSAGE HANDLER FÜR FORCE-UPDATE
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('[SW] FORCE UPDATE angefordert!');
    // Lösche alle Caches und lade neu
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(name => caches.delete(name)));
    }).then(() => {
      console.log('[SW] Alle Caches gelöscht, aktiviere Reload');
      event.ports[0].postMessage({ success: true });
    });
  }
});