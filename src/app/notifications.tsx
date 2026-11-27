import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, Linking, Switch, Text, View } from 'react-native';

import { ErrorText, InfoNote, Muted, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { disablePush, enablePush } from '../lib/push';
import { useSession } from '../lib/session';
import { makeStyles, useColors } from '../lib/theme';

// Benachrichtigungen: Push-Mitteilungen und E-Mails ein/aus (PUT /me
// notify_push, notify_email). Push eingeschaltet meldet sich dieses Gerät beim
// Backend an (POST /me/push-tokens).
//
// Ausnahme: Hier gibt es keinen Haken. Jeder Schalter speichert sofort; geht
// das nicht, springt er zurück und darunter steht der Fehler.
export default function NotificationsScreen() {
  const colors = useColors();
  const s = useS();
  const { user, setUser } = useSession();
  const [push, setPush] = useState<boolean>(user?.notify_push ?? true);
  const [email, setEmail] = useState<boolean>(user?.notify_email ?? true);
  const [saving, setSaving] = useState<'push' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  async function changePush(on: boolean) {
    setPush(on);
    setSaving('push');
    setError(null);
    setDenied(false);
    try {
      if (on) {
        const res = await enablePush();
        if (res === 'denied' || res === 'unsupported') {
          setPush(false);
          if (res === 'denied') setDenied(true);
          else setError('Push-Mitteilungen gehen in dieser App-Version noch nicht.');
          return;
        }
      } else {
        await disablePush();
      }
      setUser(await api.putJson('/me', { notify_push: on }));
    } catch (e) {
      setPush(!on);
      setError(errorMessage(e));
    } finally {
      setSaving(null);
    }
  }

  async function changeEmail(on: boolean) {
    setEmail(on);
    setSaving('email');
    setError(null);
    try {
      setUser(await api.putJson('/me', { notify_email: on }));
    } catch (e) {
      setEmail(!on);
      setError(errorMessage(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Screen>
      <InfoNote style={{ marginBottom: 8 }}>
        Wir benachrichtigen Sie, wenn sich bei Ihren Anfragen etwas ändert. Zum Beispiel bei einer neuen Zusage.
      </InfoNote>
      <View style={s.row}>
        <MaterialIcons name="notifications-none" size={24} color={colors.muted} />
        <Text style={s.label}>Push-Mitteilungen</Text>
        {saving === 'push' && <ActivityIndicator style={s.spinner} color={colors.muted} />}
        <Switch value={push} onValueChange={changePush} disabled={saving != null} trackColor={{ true: colors.primary }} />
      </View>
      <View style={s.row}>
        <MaterialIcons name="mail-outline" size={24} color={colors.muted} />
        <Text style={s.label}>E-Mail</Text>
        {saving === 'email' && <ActivityIndicator style={s.spinner} color={colors.muted} />}
        <Switch value={email} onValueChange={changeEmail} disabled={saving != null} trackColor={{ true: colors.primary }} />
      </View>
      {denied && (
        <View style={{ marginHorizontal: 16, marginTop: 4 }}>
          <Muted>Mitteilungen sind für Signura::GL ausgeschaltet. Bitte erlauben Sie sie in den Einstellungen des Handys.</Muted>
          <Text style={s.link} onPress={() => Linking.openSettings()}>
            Einstellungen öffnen
          </Text>
        </View>
      )}
      <ErrorText message={error} />
    </Screen>
  );
}

const useS = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  label: { flex: 1, marginLeft: 16, fontSize: 16, color: colors.text },
  spinner: { marginRight: 8 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '500', marginTop: 8 },
}));
