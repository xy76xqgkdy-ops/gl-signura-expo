import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { BackHeaderButton } from '../components/formHeader';
import { AppTextField, BulletList, ErrorText, Muted, OutlineButton, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { clearSession, useSession } from '../lib/session';
import { confirm, useColors } from '../lib/theme';

// Konto löschen (Meine Daten → Konto löschen). Pflicht für App Store und
// Google Play. POST /me/delete {"password"}: Das Backend sagt bevorstehende
// Termine ab, meldet auf allen Geräten ab und löscht die Daten; vergangene
// Termine bleiben anonymisiert (backend/service/account_delete.go).
// Danach: zurück zur Anmeldung.
export default function DeleteAccountScreen() {
  const colors = useColors();
  const { setUser } = useSession();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const ok = await confirm({
      title: 'Konto wirklich löschen?',
      message: 'Ihre Termine werden abgesagt und Ihre Daten gelöscht. Das kann man nicht rückgängig machen.',
      ok: 'Löschen',
      cancel: 'Abbrechen',
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await api.postJson('/me/delete', { password });
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
      return;
    }
    await clearSession();
    setUser(null);
    router.replace('/login');
    const msg = 'Ihr Konto ist gelöscht.';
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(msg);
  }

  return (
    <Screen>
      {/* Oben links "<" (auch nach Neuladen im Browser, dann zu "Meine Daten"). */}
      <Stack.Screen options={{ headerLeft: () => <BackHeaderButton fallback="/profile" disabled={loading} /> }} />
      <Text style={{ fontSize: 15, color: colors.text, marginBottom: 12 }}>
        Wenn Sie Ihr Konto löschen:
      </Text>
      <BulletList
        style={{ marginBottom: 16 }}
        items={[
          'Ihre bevorstehenden Termine und Anfragen werden abgesagt. Vermittler und Dolmetscher bekommen Bescheid.',
          'Ihre Daten werden gelöscht: Name, E-Mail, Handynummer, Profilbild, Orte und Ihre Dolmetscher.',
          'Vergangene Termine bleiben für die Abrechnung – ohne Ihren Namen und ohne Anlass.',
          'Sie werden auf allen Geräten abgemeldet.',
        ]}
      />
      <Muted style={{ marginBottom: 20 }}>Das kann man nicht rückgängig machen.</Muted>

      <AppTextField
        label="Ihr Passwort"
        secure
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
      />
      <View style={{ height: 8 }} />
      <View style={{ alignItems: 'flex-end' }}>
        <OutlineButton
          label={loading ? 'wird gelöscht …' : 'Konto endgültig löschen'}
          icon="delete-forever"
          disabled={loading || password === ''}
          onPress={remove}
        />
      </View>
      <ErrorText message={error} />
    </Screen>
  );
}
