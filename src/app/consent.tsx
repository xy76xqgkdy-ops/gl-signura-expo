import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ErrorText, PrimaryButton, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { CONSENT_TEXT, openPrivacy } from '../lib/consent';
import { logout, useSession } from '../lib/session';
import { useColors } from '../lib/theme';

// Einwilligung Gesundheitsdaten (Art. 9 DSGVO) für Konten, die noch keine
// gegeben haben (z. B. vor dem 24.11.2026 registriert). Kommt nach der
// Anmeldung statt der Startseite (lib/consent.ts: startRoute). Ohne
// Einwilligung geht es nicht weiter: nur abmelden.
export default function ConsentScreen() {
  const colors = useColors();
  const { setUser } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setLoading(true);
    setError(null);
    try {
      const user = await api.postJson('/me/consent');
      setUser(user);
      router.replace('/home');
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  async function signOut() {
    await logout();
    setUser(null);
    router.replace('/login');
  }

  const p = { fontSize: 16, lineHeight: 23, color: colors.text, marginBottom: 12 };
  return (
    <Screen>
      <Text style={[p, { fontSize: 20, fontWeight: '700' }]}>Ihre Einwilligung</Text>
      <Text style={p}>
        Bei einer Anfrage schreiben Sie den Anlass, zum Beispiel „Arzttermin“. Das können Gesundheitsangaben sein. Diese
        sind besonders geschützt. Dafür brauchen wir Ihre Einwilligung.
      </Text>
      <View style={{ backgroundColor: colors.field, borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <Text style={[p, { marginBottom: 0 }]}>{CONSENT_TEXT}</Text>
      </View>
      <Text style={p}>
        Widerrufen geht jederzeit: in der App unter Meine Daten → „Einwilligung widerrufen“, per E-Mail an
        datenschutz@signura.de oder indem Sie Ihr Konto löschen.
      </Text>
      <Pressable onPress={openPrivacy} accessibilityRole="link" style={{ paddingVertical: 8, marginBottom: 16 }}>
        <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '500' }}>Datenschutzerklärung lesen</Text>
      </Pressable>

      <PrimaryButton label="Ich willige ein" loading={loading} onPress={agree} />
      <ErrorText message={error} />

      <Text style={[p, { marginTop: 24, fontSize: 14, color: colors.muted }]}>
        Ohne Einwilligung können Sie keine Anfragen stellen.
      </Text>
      <Pressable onPress={signOut} disabled={loading} accessibilityRole="button" style={{ paddingVertical: 8 }}>
        <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '500' }}>Nicht einwilligen und abmelden</Text>
      </Pressable>
    </Screen>
  );
}
