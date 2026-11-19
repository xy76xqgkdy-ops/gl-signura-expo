# Signura – Expo-App

Die Flutter-App aus `../frontend` als React-Native-App mit Expo (SDK 58,
Expo Router, TypeScript). Gleiche Seiten, Texte und Backend-Aufrufe;
`../frontend` bleibt unverändert.

## Starten mit Expo Go

```bash
cd booin/frontend_expo
npm install          # nur beim ersten Mal
npx expo start       # QR-Code mit Expo Go (Android) bzw. der Kamera (iPhone) scannen
```

Handy und Mac müssen im selben WLAN sein, sonst `npx expo start --tunnel`.
Die App spricht direkt mit `https://gl.signura.de/api`; andere Adresse:
`EXPO_PUBLIC_API_BASE=https://… npx expo start`.

Prüfen: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.

## Aufbau

| Flutter (`frontend/lib`) | Expo (`src`) |
|---|---|
| `features/start/start_screen.dart` | `app/index.tsx` |
| `features/auth/login_screen.dart` | `app/login.tsx` |
| `features/auth/register_screen.dart` | `app/register.tsx` |
| `features/auth/forgot_password_screen.dart` | `app/forgot-password.tsx` |
| `features/home/home_screen.dart` | `app/home.tsx` |
| `features/request/request_form_screen.dart` | `app/request.tsx` |
| `features/location/location_list_screen.dart` | `app/locations/index.tsx` |
| `features/location/location_form_screen.dart` | `app/locations/form.tsx` |
| `features/profile/profile_screen.dart` | `app/profile.tsx` |
| `features/profile/picture_screen.dart` | `app/picture.tsx` |
| `features/profile/notifications_screen.dart` | `app/notifications.tsx` |
| `core/api/api_client.dart` | `lib/api.ts` |
| `core/session/session_store.dart` | `lib/session.tsx` (Token in SecureStore, im Browser localStorage) |
| `features/request/request_data.dart` | `lib/models.ts` |
| `core/widgets/*` | `components/*` |

Unterschiede zur Flutter-App:

- Rückgabewerte von `Navigator.pop` gibt es in Expo Router nicht. Startseite
  und „Meine Orte“ laden beim Zurückkommen neu; ein neuer Ort geht über
  `lib/handoff.ts` an das Anfrage-Formular zurück.
- Datum und Uhrzeit wählt man in eigenen Fenstern (`components/pickers.tsx`),
  Minuten in 5er-Schritten.
- Der angemeldete Benutzer liegt in einem React-Context (`useSession`).
- Hell, ohne dunkles Design.

Alle verwendeten Module sind in Expo Go enthalten (Bildauswahl, Bild
verkleinern, SecureStore); ein eigener Build ist nicht nötig.
