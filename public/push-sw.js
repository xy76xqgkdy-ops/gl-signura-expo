// Abschalter für den Web-Push-Service-Worker der früheren Flutter-Web-App
// (Scope /push/). Die Expo-Web-App hat kein Web-Push; der Browser meldet sich
// hier ab, das Backend löscht den Empfänger beim nächsten Push (410 Gone).
// Kann entfernt werden, wenn keine alten Besucher mehr zu erwarten sind.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const sub = await self.registration.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await self.registration.unregister();
  })());
});
