import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppTextField, ErrorText, OutlineButton, PrimaryButton, Screen } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { peek } from '../../lib/handoff';
import { LocationData } from '../../lib/models';
import { confirm } from '../../lib/theme';

// Neuer eigener Ort (POST /me/locations) oder vorhandenen ändern
// (PUT /me/locations/{id}) und löschen (DELETE /me/locations/{id}).
export default function LocationFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const found = params.id ? peek<LocationData>('location') : undefined;
  const existing = found && found.id === params.id ? found : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [street, setStreet] = useState(existing?.street ?? '');
  const [postalcode, setPostalcode] = useState(existing?.postalcode ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = [name, street, postalcode, city].every((v) => v.trim() !== '') && !loading;

  async function save() {
    setLoading(true);
    setError(null);
    const body = {
      name: name.trim(),
      street: street.trim(),
      postalcode: postalcode.trim(),
      city: city.trim(),
      email: email.trim(),
      phone: phone.trim(),
      country: 'DE',
    };
    try {
      if (existing) await api.putJson(`/me/locations/${existing.id}`, body);
      else await api.postJson('/me/locations', body);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  async function remove() {
    if (!existing) return;
    const ok = await confirm({
      title: 'Ort löschen?',
      message: `„${existing.name}“ wird gelöscht. Ihre Anfragen ändern sich nicht.`,
      ok: 'Löschen',
      cancel: 'Abbrechen',
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteJson(`/me/locations/${existing.id}`);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Ort bearbeiten' : 'Neuer Ort' }} />
      <Screen>
        <AppTextField label="Name (z. B. Praxis Dr. Müller)" value={name} onChangeText={setName} autoFocus={!existing} />
        <AppTextField label="Straße und Hausnummer" value={street} onChangeText={setStreet} />
        <View style={{ flexDirection: 'row' }}>
          <AppTextField style={{ width: 120, marginRight: 12 }} label="PLZ" value={postalcode} onChangeText={setPostalcode} keyboardType="number-pad" />
          <AppTextField style={{ flex: 1 }} label="Ort" value={city} onChangeText={setCity} />
        </View>
        <AppTextField
          label="E-Mail (optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppTextField label="Telefon (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {/* Löschen links, Speichern rechts (wie bei der Anfrage). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          {existing && <OutlineButton icon="delete-outline" label="Löschen" disabled={loading} onPress={remove} />}
          <View style={{ flex: 1 }} />
          <PrimaryButton label="Speichern" loading={loading} disabled={!canSave} onPress={save} />
        </View>
        <ErrorText message={error} />
      </Screen>
    </>
  );
}
