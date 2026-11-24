import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';

import { ErrorText, Muted, PrimaryButton, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { disablePush, enablePush } from '../lib/push';
import { useSession } from '../lib/session';
import { makeStyles, useColors } from '../lib/theme';

// Benachrichtigungen: Push-Mitteilungen ein/aus (PUT /me notify_push).
// Eingeschaltet meldet sich dieses Gerät beim Backend an (POST /me/push-tokens).
export default function NotificationsScreen() {
  const colors = useColors();
  const s = useS();
  const { user, setUser } = useSession();
  const [push, setPush] = useState<boolean>(user?.notify_push ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  async function save() {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      if (push) {
        const res = await enablePush();
        if (res === 'denied') {
          setDenied(true);
          setLoading(false);
          return;
        }
        if (res === 'unsupported') {
          setError('Push-Mitteilungen gehen in dieser App-Version noch nicht.');
          setLoading(false);
          return;
        }
      } else {
        await disablePush();
      }
      setUser(await api.putJson('/me', { notify_push: push }));
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 15, color: colors.text, marginBottom: 8 }}>
        Wir schicken Ihnen eine Mitteilung aufs Handy, wenn sich bei Ihren Anfragen etwas ändert. Zum Beispiel bei einer
        neuen Zusage.
      </Text>
      <View style={s.row}>
        <MaterialIcons name="notifications-none" size={24} color={colors.muted} />
        <Text style={s.label}>Push-Mitteilungen</Text>
        <Switch value={push} onValueChange={setPush} trackColor={{ true: colors.primary }} />
      </View>
      {denied && (
        <View style={{ marginHorizontal: 16, marginTop: 4 }}>
          <Muted>Mitteilungen sind für Signura ausgeschaltet. Bitte erlauben Sie sie in den Einstellungen des Handys.</Muted>
          <Text style={s.link} onPress={() => Linking.openSettings()}>
            Einstellungen öffnen
          </Text>
        </View>
      )}
      <View style={{ height: 16 }} />
      <PrimaryButton label="speichern" loading={loading} onPress={save} />
      <ErrorText message={error} />
    </Screen>
  );
}

const useS = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  label: { flex: 1, marginLeft: 16, fontSize: 16, color: colors.text },
  link: { color: colors.primary, fontSize: 15, fontWeight: '500', marginTop: 8 },
}));
