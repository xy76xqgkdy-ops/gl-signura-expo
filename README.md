# Signura – App

Die Signura-App für Auftraggeber:innen mit Expo (SDK 58, Expo Router,
TypeScript). Ein Code für iPhone, Android und die Web-Fassung auf
https://gl.signura.de.

Am einfachsten über das Menü: `../menu.sh` → „App (Expo)“.

## Starten mit Expo Go

```bash
cd gl.signura/frontend_expo
npm install          # nur beim ersten Mal
npx expo start       # QR-Code mit Expo Go (Android) bzw. der Kamera (iPhone) scannen
```

Handy und Mac müssen im selben WLAN sein, sonst `npx expo start --tunnel`.
Die App spricht direkt mit `https://gl.signura.de/api`; andere Adresse:
`EXPO_PUBLIC_API_BASE=https://… npx expo start`.

Prüfen: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.

## Web-Fassung

Lokal im Browser: `npx expo start --web --port 5173`. Port 5173, weil das
Backend im Browser nur diesen lokalen Origin erlaubt (CORS).

Veröffentlichen auf gl.signura.de: `./deploy.sh`. Das Skript baut mit
`npx expo export --platform web` nach `dist/` und lädt das per rsync nach
`/var/www/html` auf signura-web (167.233.242.200). nginx leitet unbekannte
Pfade auf `index.html` um, damit Neuladen auf jeder Seite (z. B. `/login`) geht.

Unterschiede zu iPhone und Android: kein Push (nur in der App), das Token liegt
im `localStorage` statt im SecureStore.

`public/flutter_service_worker.js` und `public/push-sw.js` schalten die Service
Worker der früheren Flutter-Web-App bei alten Besuchern ab. Sie können
entfernt werden, wenn keine alten Besucher mehr zu erwarten sind.

## Aufbau

| Bereich | Datei |
|---|---|
| Start, Termine | `src/app/index.tsx`, `src/app/home.tsx` |
| Anmelden, Registrieren, Passwort vergessen | `src/app/login.tsx`, `src/app/register.tsx`, `src/app/forgot-password.tsx` |
| Anfrage stellen | `src/app/request.tsx` |
| Meine Orte | `src/app/locations/` |
| Meine DolmetscherInnen | `src/app/interpreters/` |
| Profil, Bild, Benachrichtigungen | `src/app/profile.tsx`, `src/app/picture.tsx`, `src/app/notifications.tsx` |
| Backend-Aufrufe | `src/lib/api.ts` |
| Anmeldung (Token in SecureStore, im Browser localStorage) | `src/lib/session.tsx` |
| Daten der Anfragen | `src/lib/models.ts` |
| Push | `src/lib/push.ts` |
| Bausteine (Knöpfe, Felder, Auswahl) | `src/components/` |

Hinweise:

- Rückgabewerte beim Zurückgehen gibt es in Expo Router nicht. Startseite
  und „Meine Orte“ laden beim Zurückkommen neu; ein neuer Ort geht über
  `src/lib/handoff.ts` an das Anfrage-Formular zurück.
- Datum und Uhrzeit wählt man in eigenen Fenstern (`src/components/pickers.tsx`),
  Minuten in 5er-Schritten.
- Der angemeldete Benutzer liegt in einem React-Context (`useSession`).
- Hell, ohne dunkles Design.
