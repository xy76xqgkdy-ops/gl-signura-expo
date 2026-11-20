import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorText, IconName, Muted, PrimaryButton, Screen } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

// Benachrichtigungen: auf welchem Weg man informiert werden möchte
// (PUT /me: notify_email, notify_sms, notify_messenger). Gespeichert wird
// vorerst nur die Wahl; der Versand kommt später.
export default function NotificationsScreen() {
  const { user, setUser } = useSession();
  const [email, setEmail] = useState<boolean>(user?.notify_email ?? true);
  const [sms, setSms] = useState<boolean>(user?.notify_sms ?? false);
  const [messenger, setMessenger] = useState<boolean>(user?.notify_messenger ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMobile = String(user?.mobile ?? '').trim() !== '';

  async function save() {
    setLoading(true);
    setError(null);
    try {
      setUser(await api.putJson('/me', { notify_email: email, notify_sms: sms, notify_messenger: messenger }));
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  const row = (icon: IconName, label: string, value: boolean, set: (v: boolean) => void) => (
    <View style={s.row}>
      <MaterialIcons name={icon} size={24} color={colors.muted} />
      <Text style={s.label}>{label}</Text>
      <Switch value={value} onValueChange={set} trackColor={{ true: colors.primary }} />
    </View>
  );

  return (
    <Screen>
      <Text style={{ fontSize: 15, color: colors.text, marginBottom: 8 }}>Wie sollen wir Ihnen Nachrichten schicken?</Text>
      {row('mail-outline', 'per E-Mail', email, setEmail)}
      {row('sms', 'per SMS', sms, setSms)}
      {row('chat-bubble-outline', 'per Messenger', messenger, setMessenger)}
      {(sms || messenger) && !hasMobile && (
        <Muted style={{ marginHorizontal: 16, marginTop: 4 }}>
          Für SMS und Messenger brauchen wir Ihre Handynummer. Sie tragen sie bei „Meine Daten“ ein.
        </Muted>
      )}
      <View style={{ height: 16 }} />
      <PrimaryButton label="speichern" loading={loading} onPress={save} />
      <ErrorText message={error} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  label: { flex: 1, marginLeft: 16, fontSize: 16, color: colors.text },
});
