import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { onPushTapped } from '../lib/push';
import { SessionProvider } from '../lib/session';
import { colors } from '../lib/theme';

// Alle Seiten als Stapel.
export default function RootLayout() {
  // Mitteilung angetippt → Hauptseite (lädt dort neu).
  useEffect(() => onPushTapped(() => router.navigate('/home')), []);

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.appBar },
          headerTintColor: colors.text,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Anmeldung', headerBackVisible: false }} />
        <Stack.Screen name="register" options={{ title: 'Neues Konto' }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Passwort vergessen' }} />
        <Stack.Screen name="home" options={{ title: '' }} />
        <Stack.Screen name="request" options={{ title: 'Anfrage' }} />
        <Stack.Screen name="locations/index" options={{ title: 'Meine Orte' }} />
        <Stack.Screen name="locations/form" options={{ title: 'Ort' }} />
        <Stack.Screen name="interpreters/index" options={{ title: 'Meine DolmetscherInnen' }} />
        <Stack.Screen name="interpreters/form" options={{ title: 'Dolmetscher' }} />
        <Stack.Screen name="profile" options={{ title: 'Meine Daten' }} />
        <Stack.Screen name="picture" options={{ title: 'Profilbild' }} />
        <Stack.Screen name="notifications" options={{ title: 'Benachrichtigungen' }} />
      </Stack>
    </SessionProvider>
  );
}
