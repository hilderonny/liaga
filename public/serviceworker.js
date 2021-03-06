// Per default stsuert ein Service worker alle Anfragen, die in seinem und aller Unterverzeichnisse
// ankommen. Daher ist es am einfachsten, den worker in das Stammverzeichnis der App zu legen, dann
// braucht man nämlich nicht den Scope anzugeben.

// Der Service Worker wird bei jedem Aufruf der Website geladen. Wenn der Browser mitkriegt, dass sich
// diese Datei geändert hat, wird der Service Worker erneut installiert und 'activate' aufgerufen.

// Dieser Name ist ein Hilfsmittel, das beim Löschen des alten und Neuaufbau des neuen Caches hilft.
// Wenn dieser Name geändert wird und der Service worker neu installiert wird. führt das bei activate()
// dazu, dass der alte Cache gelöscht und bei fetch() dazu, dass alle zu cachenden Dateien neu geladen werden.
var CACHE_NAME = 'liaga-34';

// Diese Funktion wird bei der Neuinstallation des Service workers aufgerufen.
self.addEventListener('install', function () {
    console.log('%c⚙ install: Neuinstallation nach Änderung der Service worker Datei', 'color:lightgrey');
    // skipWaiting dient dazu, dass die vorherige Version des workers beendet und diese neue
    // Version gleich installiert und aktiviert wird, ohne zu warten
    self.skipWaiting();
});

// Diese Funktion wird nach jeder Neuinstallation des Service workers ausgeführt und dient dazu,
// alte Caches zu löschen
self.addEventListener('activate', function (evt) {
    console.log('%c⚙ activate: Service worker mit Cache Name "' + CACHE_NAME + '" ist nun aktiv.', 'color:lightgrey');
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('%c⚙ activate: Lösche alten Cache "' + key + '"', 'color:lightgrey');
                    return caches.delete(key);
                }
            }));
        })
    );
    // Bringt den Browser dazu, den neuen Service worker sofort zu benutzen und nicht erst beim nächsten Laden der Seite
    self.clients.claim();
});

// Netzwerkabfragen abfangen und im aus Cache bereit stellen
// Prinzip: Cache first: https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker#on_network_response
self.addEventListener('fetch', function (evt) {
    evt.respondWith(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.match(evt.request).then(function (response) {
                return response || fetch(evt.request).then(function (response) {
                    if (evt.request.cache === 'no-cache' || evt.request.method === 'POST') return response; // API Aufrufe
                    console.log('%c⚙ fetch: Speichere im Cache: ' + evt.request.url, 'color:lightgrey');
                    cache.put(evt.request, response.clone());
                    return response;
                });
            });
        })
    );
});

self.addEventListener('push', function (event) {
    var data = event.data.json();
    console.log('%c⚙ Received a push message', 'color:lightgrey', event, data);
    self.registration.showNotification(data.title, data.options)
});

self.addEventListener('notificationclick', function (event) {
    console.log('%c⚙ On notification click: ', 'color:lightgrey', event.notification);
    event.notification.close();
    event.waitUntil(
        clients.matchAll({
            type: "window"
        }).then(function (clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                return client.focus();
            }
        })
    );
});