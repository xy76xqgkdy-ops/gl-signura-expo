import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { PrimaryButton } from '../components/ui';
import { errorMessage } from '../lib/api';
import { restoreSession, useSession } from '../lib/session';
import { useColors } from '../lib/theme';

// Erste Seite beim App-Start: prüft das gespeicherte Token und öffnet die
// Startseite (angemeldet) oder die Anmeldung.
export default function StartScreen() {
  const colors = useColors();
  const { setUser } = useSession();
  const [error, setError] = useState<string | null>(null);

  const restore = useCallback(async () => {
    try {
      const user = await restoreSession();
      if (user) {
        setUser(user);
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [setUser]);

  useEffect(() => {
    // setState passiert erst nach await (asynchron), kein Render-Kreislauf.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    restore();
  }, [restore]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      {error == null ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <View style={{ alignSelf: 'stretch' }}>
          <Text style={{ textAlign: 'center', marginBottom: 16, color: colors.text }}>{error}</Text>
          <PrimaryButton
            label="Erneut versuchen"
            onPress={() => {
              setError(null);
              restore();
            }}
          />
        </View>
      )}
    </View>
  );
}
