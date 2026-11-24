import { Linking } from 'react-native';

import { Json } from './api';

// Einwilligung Gesundheitsdaten (Art. 9 Abs. 2 lit. a DSGVO). Der Anlass
// einer Anfrage kann z. B. "Arzttermin" sein. Ohne Einwilligung nimmt das
// Backend keine Anfragen an (403). Gegeben bei der Registrierung
// (consent: true) oder für bestehende Konten auf der Seite consent.tsx
// (POST /me/consent). Im Benutzer: health_consent_at (null = keine).

export const PRIVACY_URL = 'https://gl.signura.de/datenschutz';

// Wortlaut der Einwilligung, gleich bei Registrierung und consent.tsx.
export const CONSENT_TEXT =
  'Ich willige ein: Signura darf Gesundheitsangaben in meinen Anfragen speichern, zum Beispiel den Anlass „Arzttermin“. ' +
  'Signura darf sie an den Vermittler und die Dolmetscher geben, die meinen Termin übernehmen. ' +
  'Ich kann die Einwilligung jederzeit widerrufen.';

export const hasConsent = (user: Json | null | undefined) => !!user?.health_consent_at;

// Erste Seite nach Anmeldung bzw. App-Start.
export const startRoute = (user: Json) => (hasConsent(user) ? '/home' : '/consent');

export const openPrivacy = () => Linking.openURL(PRIVACY_URL).catch(() => {});
