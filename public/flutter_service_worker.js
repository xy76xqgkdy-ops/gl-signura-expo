// Abschalter für den Service Worker der früheren Flutter-Web-App.
// Browser, die gl.signura.de schon mit Flutter geöffnet hatten, laden diese
// Datei beim nächsten Update-Check: Cache leeren, abmelden, offene Seiten neu
// laden – danach läuft die Expo-Web-App. Kann entfernt werden, wenn keine
// alten Besucher mehr zu erwarten sind (z. B. ab Mitte 2027).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
