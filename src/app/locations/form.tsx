import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DeleteHeaderButton, headerButtons, SaveHeaderButton, useDiscardGuard } from '../../components/formHeader';
import { AppTextField, ErrorText, InfoNote, Screen } from '../../components/ui';
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

  // Eingaben geändert? Vergleich mit dem Stand beim Öffnen.
  const formKey = JSON.stringify([name, street, postalcode, city, email, phone]);
  const [initialKey] = useState(formKey);
  const dirty = formKey !== initialKey;
  const guard = useDiscardGuard({
    dirty,
    loading,
    message: existing ? 'Ihre Änderungen am Ort werden nicht gespeichert.' : 'Der Ort wird nicht gespeichert.',
  });

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
      {/* Oben links "<" bzw. "x", rechts Papierkorb (nur beim Bearbeiten) und Haken zum Speichern (components/formHeader.tsx). */}
      <Stack.Screen
        options={{
          title: existing ? 'Ort bearbeiten' : 'Neuer Ort',
          ...guard,
          ...headerButtons([
            existing && !loading && <DeleteHeaderButton key="delete" label="Ort löschen" onPress={remove} disabled={loading} />,
            <SaveHeaderButton key="save" label="speichern" onPress={save} disabled={!canSave || !dirty} loading={loading} />,
          ]),
        }}
      />
      <Screen>
        {/* Bei "Neuer Ort" ohne den Satz zu bisherigen Anfragen (gibt es noch nicht). */}
        <InfoNote>
          {existing ? 'Ändern Sie den Ort, bleiben Ihre bisherigen Anfragen gleich. ' : ''}
          Die Telefonnummer bekommt nur der Vermittler, der für Sie einen Termin vereinbart.
        </InfoNote>
        <AppTextField label="Name (z. B. Praxis, Amt oder Firma)" value={name} onChangeText={setName} autoFocus={!existing} />
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
        <ErrorText message={error} />
      </Screen>
    </>
  );
}
