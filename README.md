# Signura – App

Die Signura-App für Auftraggeber:innen mit Expo (SDK 58, Expo Router,
TypeScript) für iPhone und Android. Die Web-Fassung wird nicht mehr
veröffentlicht: Auf https://gl.signura.de liegt die Werbeseite (`../website`).

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

## Web-Fassung (nur zum Entwickeln)

Seit 23.11.2026 gibt es Signura nur als App. Anmelden, Registrieren, Termine
usw. sind im Browser auf gl.signura.de nicht mehr erreichbar (nginx liefert 404).
`./deploy.sh` bricht deshalb nur noch mit einem Hinweis ab.

Lokal im Browser geht es weiter zum schnellen Testen:
`npx expo start --web --port 5173`. Port 5173, weil das Backend im Browser nur
diesen lokalen Origin erlaubt (CORS). Unterschiede zu iPhone und Android: kein
Push, das Token liegt im `localStorage` statt im SecureStore.

## Aufbau

| Bereich | Datei |
|---|---|
| Start, Termine | `src/app/index.tsx`, `src/app/home.tsx` |
| Anmelden, Registrieren, Passwort vergessen | `src/app/login.tsx`, `src/app/register.tsx`, `src/app/forgot-password.tsx` |
| Anfrage stellen | `src/app/request.tsx` |
| Meine Orte | `src/app/locations/` |
| Meine DolmetscherInnen | `src/app/interpreters/` |
| Profil, Bild, Benachrichtigungen | `src/app/profile.tsx`, `src/app/picture.tsx`, `src/app/notifications.tsx` |
| Konto löschen (Meine Daten → unten) | `src/app/delete-account.tsx` |
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
- Hell oder dunkel wie das System (`app.json`: `userInterfaceStyle: "automatic"`,
  für Android braucht es `expo-system-ui`). Farben in `src/lib/theme.ts`: in
  Komponenten `const colors = useColors()`, Stylesheets mit Farben über
  `makeStyles((colors) => ({ … }))` und `const s = useS()`. Nie Farben beim
  Laden einer Datei festhalten (`StyleSheet.create` mit `colors` außerhalb von
  `makeStyles`), sonst wechseln sie nicht mit. Änderung an `app.json` braucht
  einen neuen Build.
