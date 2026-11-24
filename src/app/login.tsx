import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppTextField, ErrorText, PrimaryButton, Screen, SignuraHeader } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { startRoute } from '../lib/consent';
import { isValidEmail } from '../lib/dates';
import { saveSession, useSession } from '../lib/session';
import { makeStyles } from '../lib/theme';

// Anmeldung über POST /users/login (Signura-Backend).
export default function LoginScreen() {
  const s = useS();
  const { setUser } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isValidEmail(email) && password.length > 0 && !loading;

  async function login() {
    setLoading(true);
    setError(null);
    try {
      const user = await api.postJson('/users/login', { email: email.trim(), password });
      // Angemeldet bleiben: Token auf dem Gerät speichern.
      await saveSession(user.token as string);
      setUser(user);
      // Anmeldung durch die Startseite ersetzen (Zurück führt nicht wieder hierher);
      // ohne Einwilligung Gesundheitsdaten erst die Einwilligung.
      router.replace(startRoute(user));
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <Screen>
      <SignuraHeader />
      <View style={{ height: 8 }} />
      <AppTextField
        label="E-Mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        autoFocus
      />
      <AppTextField
        label="Passwort"
        secure
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => canSubmit && login()}
      />
      <View style={{ height: 12 }} />
      <PrimaryButton label="Anmelden" loading={loading} disabled={!canSubmit} onPress={login} />
      <ErrorText message={error} />
      <View style={{ height: 24 }} />
      <Pressable style={s.link} onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}>
        <Text style={s.linkText}>Passwort vergessen?</Text>
      </Pressable>
      <Pressable style={s.link} onPress={() => router.push('/register')}>
        <Text style={s.linkText}>Neues Konto anlegen</Text>
      </Pressable>
    </Screen>
  );
}

const useS = makeStyles((colors) => ({
  link: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
}));
