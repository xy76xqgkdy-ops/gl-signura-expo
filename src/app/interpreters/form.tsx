import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { SaveHeaderButton, useDiscardGuard } from '../../components/formHeader';
import { AppTextField, ErrorText, OutlineButton, Screen } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, isValidEmail } from '../../lib/dates';
import { peek } from '../../lib/handoff';
import { INTERPRETER_STATUS, InterpreterData } from '../../lib/models';
import { confirm, useColors } from '../../lib/theme';

// Neuer Wunsch-Dolmetscher (POST /me/interpreters, schickt die Einladung)
// oder vorhandenen ändern (PUT …/{id}; neue E-Mail = neue Einladung),
// Einladung noch einmal schicken (POST …/{id}/invite) und löschen (DELETE …/{id}).
export default function InterpreterFormScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const found = params.id ? peek<InterpreterData>('interpreter') : undefined;
  const existing = found && found.id === params.id ? found : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSave = name.trim() !== '' && isValidEmail(email) && !loading;
  const canReinvite = !!existing && existing.status !== 'accepted';

  // Eingaben geändert? Vergleich mit dem Stand beim Öffnen.
  const formKey = JSON.stringify([name, email]);
  const [initialKey] = useState(formKey);
  const dirty = formKey !== initialKey;
  const guard = useDiscardGuard({
    dirty,
    loading,
    message: existing
      ? 'Ihre Änderungen am Dolmetscher werden nicht gespeichert.'
      : 'Die Einladung wird nicht verschickt. Ihre Eingaben gehen verloren.',
  });

  async function run(action: () => Promise<void>, back = true) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await action();
      if (back) router.back();
      else setLoading(false);
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  const save = () =>
    run(async () => {
      const body = { name: name.trim(), email: email.trim() };
      if (existing) await api.putJson(`/me/interpreters/${existing.id}`, body);
      else await api.postJson('/me/interpreters', body);
    });

  const reinvite = () =>
    run(async () => {
      await api.postJson(`/me/interpreters/${existing!.id}/invite`);
      setInfo('Die Einladung ist verschickt.');
    }, false);

  async function remove() {
    if (!existing) return;
    const ok = await confirm({
      title: 'Dolmetscher löschen?',
      message: `„${existing.name}“ bekommt dann keine Anfragen mehr. Gebuchte Termine bleiben.`,
      ok: 'Löschen',
      cancel: 'Abbrechen',
      destructive: true,
    });
    if (ok) run(() => api.deleteJson(`/me/interpreters/${existing.id}`));
  }

  return (
    <>
      {/* Oben links "<" bzw. "x", rechts der Haken: speichern bzw. einladen (components/formHeader.tsx). */}
      <Stack.Screen
        options={{
          title: existing ? 'Dolmetscher bearbeiten' : 'Neuer Dolmetscher',
          ...guard,
          headerRight: () => (
            <SaveHeaderButton
              label={existing ? 'speichern' : 'einladen'}
              onPress={save}
              disabled={!canSave || !dirty}
              loading={loading}
            />
          ),
        }}
      />
      <Screen>
        {!existing && (
          <Text style={{ marginBottom: 16, color: colors.text, fontSize: 15, lineHeight: 22 }}>
            Wir schicken eine E-Mail an Ihren Dolmetscher. Er muss einverstanden sein. Dann bekommt er Ihre Anfragen.
          </Text>
        )}
        {existing && (
          <Text style={{ marginBottom: 16, color: colors.text, fontSize: 15 }}>
            {INTERPRETER_STATUS[existing.status].text}
            {existing.status === 'invited' ? ` (seit ${formatDate(existing.invitedAt)})` : ''}
          </Text>
        )}
        <AppTextField label="Name" value={name} onChangeText={setName} autoFocus={!existing} />
        <AppTextField
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {canReinvite && (
          <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
            <OutlineButton icon="send" label="Einladung noch einmal schicken" color={colors.primary} disabled={loading} onPress={reinvite} />
          </View>
        )}
        {info && <Text style={{ color: colors.success, marginBottom: 12 }}>{info}</Text>}
        {/* Löschen unten links; gespeichert wird mit dem Haken oben rechts. */}
        {existing && (
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <OutlineButton icon="delete-outline" label="Löschen" disabled={loading} onPress={remove} />
          </View>
        )}
        <ErrorText message={error} />
      </Screen>
    </>
  );
}
