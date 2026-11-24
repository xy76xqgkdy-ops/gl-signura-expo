import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';

import { onPushTapped } from '../lib/push';
import { SessionProvider } from '../lib/session';
import { darkColors, useColors } from '../lib/theme';

// Alle Seiten als Stapel. Hell oder dunkel wie das System (lib/theme.ts).
export default function RootLayout() {
  const colors = useColors();
  const dark = colors === darkColors;
  // Mitteilung angetippt → Hauptseite (lädt dort neu).
  useEffect(() => onPushTapped(() => router.navigate('/home')), []);
  // Hintergrund hinter den Seiten (sonst blitzt beim Wechseln Weiß/Schwarz auf).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors]);

  // Theme für Navigation (Kopfzeile, Übergänge) aus unseren Farben.
  const navTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.appBar,
        text: colors.text,
        border: colors.divider,
      },
    };
  }, [colors, dark]);

  return (
    <ThemeProvider value={navTheme}>
      <SessionProvider>
        <StatusBar style={dark ? 'light' : 'dark'} />
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
          <Stack.Screen name="consent" options={{ title: 'Einwilligung', headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="home" options={{ title: '' }} />
          <Stack.Screen name="request" options={{ title: 'Anfrage' }} />
          <Stack.Screen name="locations/index" options={{ title: 'Meine Orte' }} />
          <Stack.Screen name="locations/form" options={{ title: 'Ort' }} />
          <Stack.Screen name="interpreters/index" options={{ title: 'Meine DolmetscherInnen' }} />
          <Stack.Screen name="interpreters/form" options={{ title: 'Dolmetscher' }} />
          <Stack.Screen name="profile" options={{ title: 'Meine Daten' }} />
          <Stack.Screen name="delete-account" options={{ title: 'Konto löschen' }} />
          <Stack.Screen name="picture" options={{ title: 'Profilbild' }} />
          <Stack.Screen name="notifications" options={{ title: 'Benachrichtigungen' }} />
        </Stack>
      </SessionProvider>
    </ThemeProvider>
  );
}
