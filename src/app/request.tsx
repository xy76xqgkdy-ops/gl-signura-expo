import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DatePickerSheet, OptionSheet, SearchSheet, TimePickerSheet } from '../components/pickers';
import { StatusChip } from '../components/StatusChip';
import {
  AppTextField,
  Card,
  Checkbox,
  ErrorText,
  OutlineButton,
  PrimaryButton,
  RoundIconButton,
  Screen,
  TapField,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { at, dateOnly, formatDate, formatHM, formatTime, Time, timeOf, today } from '../lib/dates';
import { peek, take } from '../lib/handoff';
import { LocationData, locationAddress, OfferData, parseLocation, parseOffer, RequestData } from '../lib/models';
import { colors, confirm } from '../lib/theme';

// Auswahl für den Grund. Ein älterer, freier Grund einer vorhandenen
// Anfrage bleibt als zusätzliche Option erhalten.
const PURPOSES = ['Arzt', 'Arbeit', 'Behörde', 'Privat', 'Sonstige'];

// Neue Anfrage (POST /me/requests) oder vorhandene bearbeiten
// (PUT /me/requests/{id}) und absagen (POST /me/requests/{id}/cancel).
// Zusagen ankreuzen und buchen (POST /me/requests/{id}/award).
//
// Ändern geht nur, solange die Anfrage offen ist und es keine Zusagen gibt;
// absagen, solange der Termin noch bevorsteht (das prüft auch das Backend).
export default function RequestFormScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const found = params.id ? peek<RequestData>('request') : undefined;
  const existing = found && found.id === params.id ? found : undefined;

  const [date, setDate] = useState(dateOnly(existing?.start ?? (params.date ? new Date(params.date) : today())));
  const [startTime, setStartTime] = useState<Time>(existing ? timeOf(existing.start) : { hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState<Time>(existing ? timeOf(existing.end) : { hour: 10, minute: 0 });
  const [remote, setRemote] = useState(existing?.remote ?? false);
  const [purpose, setPurpose] = useState<string | null>(existing?.purpose ?? null);
  const purposeOptions = [...PURPOSES, ...(existing && !PURPOSES.includes(existing.purpose) ? [existing.purpose] : [])];

  // Adresse der Anfrage: gehört der Anfrage selbst. Ein gespeicherter Ort
  // füllt die Felder nur aus; ändert man ihn später, bleibt die Anfrage gleich.
  const [locName, setLocName] = useState(existing?.locationName ?? '');
  const [locStreet, setLocStreet] = useState(existing?.locationStreet === 'per Video' ? '' : (existing?.locationStreet ?? ''));
  const [locPostal, setLocPostal] = useState(existing?.locationPostalcode ?? '');
  const [locCity, setLocCity] = useState(existing?.locationCity ?? '');
  const [locEmail, setLocEmail] = useState(existing?.locationEmail ?? '');
  const [locPhone, setLocPhone] = useState(existing?.locationPhone ?? '');
  const [locationId, setLocationId] = useState<string | null>(existing?.locationId ?? null); // nur Herkunft

  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zusagen (nur Namen, keine Vermittler) und die zum Buchen angekreuzten.
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const [picker, setPicker] = useState<'date' | 'start' | 'end' | 'purpose' | 'location' | null>(null);

  const isOpen = existing?.status === 'new';
  // Neue Anfrage oder offene ohne Zusagen: alle Felder änderbar.
  const editable = !existing || (isOpen && existing.offerCount === 0);
  const openOffers = offers.filter((o) => o.status === 'offered');
  const canAward = isOpen && chosen.size > 0 && !loading;
  const canCancel = !!existing && existing.status !== 'cancelled' && existing.start > new Date();

  const loadOffers = useCallback(async () => {
    if (!existing) return;
    try {
      const list = await api.getJsonList(`/me/requests/${existing.id}/offers`);
      setOffers(list.map(parseOffer));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [existing]);

  useEffect(() => {
    if (params.id && !existing) {
      router.back(); // z. B. Seite im Browser neu geladen: Anfrage fehlt
      return;
    }
    (async () => {
      try {
        const list = await api.getJsonList('/me/locations');
        setLocations(list.map(parseLocation));
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoadingLocations(false);
      }
    })();
    if (existing && (existing.offerCount > 0 || existing.status === 'confirmed')) {
      api
        .getJsonList(`/me/requests/${existing.id}/offers`)
        .then((list) => setOffers(list.map(parseOffer)))
        .catch((e) => setError(errorMessage(e)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adresse aus einem gespeicherten Ort in die Felder übernehmen.
  const applyLocation = (l: LocationData) => {
    setLocName(l.name);
    setLocStreet(l.street);
    setLocPostal(l.postalcode);
    setLocCity(l.city);
    setLocEmail(l.email);
    setLocPhone(l.phone);
    setLocationId(l.id);
  };

  // Zurück vom "Neuer Ort": den neuen Ort übernehmen.
  useFocusEffect(
    useCallback(() => {
      const created = take<LocationData>('location:created');
      if (created) {
        setLocations((ls) => [...ls, created]);
        applyLocation(created);
      }
    }, []),
  );

  const startAt = at(date, startTime);
  const endAt = at(date, endTime);
  const canSave =
    !!purpose &&
    endAt > startAt &&
    (remote || [locStreet, locPostal, locCity].every((v) => v.trim() !== '')) &&
    editable &&
    !loading;

  const pickStart = (t: Time) => {
    // Ende mitschieben, damit die Dauer gleich bleibt.
    const minutes = endTime.hour * 60 + endTime.minute - (startTime.hour * 60 + startTime.minute);
    setStartTime(t);
    const end = t.hour * 60 + t.minute + (minutes > 0 ? minutes : 60);
    setEndTime({ hour: Math.min(Math.floor(end / 60), 23), minute: end % 60 });
  };

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await action();
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  const save = () =>
    run(async () => {
      const body = {
        start_date: startAt.toISOString(),
        end_date: endAt.toISOString(),
        purpose,
        mode: remote ? 'remote' : 'on_site',
        // Auch bei "per Video" alles mitsenden; ohne Straße setzt das Backend "per Video".
        location_id: locationId,
        location_name: locName.trim(),
        location_street: locStreet.trim(),
        location_postalcode: locPostal.trim(),
        location_city: locCity.trim(),
        location_email: locEmail.trim(),
        location_phone: locPhone.trim(),
      };
      if (existing) await api.putJson(`/me/requests/${existing.id}`, body);
      else await api.postJson('/me/requests', body);
    });

  async function cancel() {
    if (!existing) return;
    const ok = await confirm({
      title: 'Anfrage absagen?',
      message: `${existing.purpose} am ${formatDate(existing.start)} um ${formatTime(existing.start)} Uhr wird abgesagt. Sie können das nicht rückgängig machen.`,
      ok: 'Absagen',
      cancel: 'Nicht absagen',
      destructive: true,
    });
    if (ok) run(() => api.postJson(`/me/requests/${existing.id}/cancel`).then(() => {}));
  }

  // Angekreuzte Zusagen buchen; die übrigen bekommen eine Absage.
  async function award() {
    if (!existing) return;
    const n = chosen.size;
    const names = openOffers
      .filter((o) => chosen.has(o.id))
      .map((o) => o.interpreterName)
      .join(', ');
    const ok = await confirm({
      title: n === 1 ? '1 Dolmetscher buchen?' : `${n} Dolmetscher buchen?`,
      message: `${names}\n\nDie anderen bekommen eine Absage. Sie können das nicht rückgängig machen.`,
      ok: 'buchen',
      cancel: 'Abbrechen',
    });
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await api.postJson(`/me/requests/${existing.id}/award`, { offer_ids: [...chosen] });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
      loadOffers(); // z. B. inzwischen zurückgezogene Zusage
    }
  }

  // Warum die Anfrage nicht mehr änderbar ist.
  function lockedHint(r: RequestData) {
    if (r.status === 'confirmed') return `Gebucht${r.interpreterName ? `: ${r.interpreterName}` : ''}. Sie können den Termin absagen.`;
    if (r.status === 'new' && r.offerCount > 0) {
      return 'Es gibt Zusagen. Kreuzen Sie an, wen Sie buchen möchten. Sie können die Anfrage nicht mehr ändern. Sie können sie absagen und eine neue Anfrage stellen.';
    }
    return 'Die Anfrage kann nicht mehr geändert werden. Sie können sie absagen.';
  }

  const toggle = (id: string) =>
    setChosen((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const shownOffers = isOpen ? openOffers : offers.filter((o) => o.status === 'awarded');

  return (
    <>
      <Stack.Screen
        options={{
          title: !existing ? 'Neue Anfrage' : editable ? 'Anfrage bearbeiten' : 'Anfrage',
          // Status oben rechts (bei neuer Anfrage gibt es noch keinen).
          headerRight: existing ? () => <StatusChip status={existing.status} /> : undefined,
        }}
      />
      <Screen>
        {existing && !editable && existing.status !== 'cancelled' && (
          <Text style={s.hint}>{lockedHint(existing)}</Text>
        )}

        {/* Grund und vor Ort / per Video in einer Zeile. */}
        <View style={s.row}>
          <TapField
            style={{ flex: 1, marginRight: 12 }}
            label="Grund"
            value={purpose ?? ''}
            placeholder="Bitte wählen"
            trailingIcon="arrow-drop-down"
            disabled={!editable}
            onPress={() => setPicker('purpose')}
          />
          <View style={[s.segment, !editable && { opacity: 0.5 }]}>
            {[
              { v: false, label: 'vor Ort' },
              { v: true, label: 'per Video' },
            ].map((o, i) => (
              <Pressable
                key={o.label}
                disabled={!editable}
                onPress={() => setRemote(o.v)}
                style={[s.segItem, i === 0 && s.segFirst, remote === o.v && { backgroundColor: colors.tonal }]}
              >
                <Text style={s.segText}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TapField icon="calendar-today" label="Datum" value={formatDate(date)} disabled={!editable} onPress={() => setPicker('date')} />
        <View style={s.row}>
          <TapField
            style={{ flex: 1, marginRight: 12 }}
            icon="schedule"
            label="Beginn"
            value={formatHM(startTime)}
            disabled={!editable}
            onPress={() => setPicker('start')}
          />
          <TapField
            style={{ flex: 1 }}
            icon="schedule"
            label="Ende"
            value={formatHM(endTime)}
            disabled={!editable}
            onPress={() => setPicker('end')}
          />
        </View>

        {/* Gespeicherten Ort suchen und übernehmen (auch bei "per Video"), "+" legt einen neuen an. */}
        {editable && (
          <View style={[s.row, { marginBottom: 12 }]}>
            {loadingLocations ? (
              <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
            ) : (
              <TapField
                style={{ flex: 1, marginBottom: 0, marginRight: 8 }}
                label="Ort"
                placeholder="Ort suchen"
                trailingIcon="search"
                onPress={() => setPicker('location')}
              />
            )}
            <RoundIconButton icon="add" label="Neuer Ort" disabled={loading} onPress={() => router.push('/locations/form')} />
          </View>
        )}

        <AppTextField
          label={remote ? 'Name (z. B. Gesprächspartner)' : 'Name (z. B. Praxis Dr. Müller)'}
          value={locName}
          onChangeText={setLocName}
          editable={editable}
        />
        {/* Adresse und Kontakt: bei "per Video" ausgeblendet, aber aus dem gewählten Ort trotzdem mitgespeichert. */}
        {!remote && (
          <>
            <AppTextField label="Straße und Hausnummer" value={locStreet} onChangeText={setLocStreet} editable={editable} />
            <View style={s.row}>
              <AppTextField
                style={{ width: 120, marginRight: 12 }}
                label="PLZ"
                value={locPostal}
                onChangeText={setLocPostal}
                keyboardType="number-pad"
                editable={editable}
              />
              <AppTextField style={{ flex: 1 }} label="Ort" value={locCity} onChangeText={setLocCity} editable={editable} />
            </View>
            <View style={s.row}>
              <AppTextField
                style={{ flex: 1, marginRight: 12 }}
                label="E-Mail (optional)"
                value={locEmail}
                onChangeText={setLocEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={editable}
              />
              <AppTextField
                style={{ flex: 1 }}
                label="Telefon (optional)"
                value={locPhone}
                onChangeText={setLocPhone}
                keyboardType="phone-pad"
                editable={editable}
              />
            </View>
          </>
        )}

        {/* Zusagen: offen → ankreuzen; gebucht → mit Haken; nur Namen. */}
        {offers.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.sectionTitle}>
              {isOpen ? `Zusagen: ${chosen.size} ausgewählt` : 'Gebuchte Dolmetscher'}
            </Text>
            <Card>
              {shownOffers.map((o) =>
                isOpen ? (
                  <Pressable key={o.id} style={s.offer} disabled={loading} onPress={() => toggle(o.id)}>
                    <MaterialIcons name="record-voice-over" size={22} color={colors.muted} />
                    <Text style={s.offerName}>{o.interpreterName}</Text>
                    <Checkbox checked={chosen.has(o.id)} />
                  </Pressable>
                ) : (
                  <View key={o.id} style={s.offer}>
                    <MaterialIcons name="check-circle" size={22} color={colors.success} />
                    <Text style={s.offerName}>{o.interpreterName}</Text>
                  </View>
                ),
              )}
            </Card>
          </View>
        )}

        {/* absagen links, speichern bzw. buchen rechts. */}
        <View style={[s.row, { marginTop: 12 }]}>
          {canCancel && <OutlineButton icon="event-busy" label="absagen" disabled={loading} onPress={cancel} />}
          <View style={{ flex: 1 }} />
          {editable ? (
            <PrimaryButton label={existing ? 'speichern' : 'Anfrage senden'} loading={loading} disabled={!canSave} onPress={save} />
          ) : isOpen && openOffers.length > 0 ? (
            <PrimaryButton label={`buchen (${chosen.size})`} loading={loading} disabled={!canAward} onPress={award} />
          ) : null}
        </View>
        <ErrorText message={error} />
      </Screen>

      {picker === 'date' && (
        <DatePickerSheet
          visible
          value={date}
          min={today()}
          max={new Date(today().getTime() + 365 * 86400000)}
          onPick={setDate}
          onClose={() => setPicker(null)}
        />
      )}
      {(picker === 'start' || picker === 'end') && (
        <TimePickerSheet
          visible
          value={picker === 'start' ? startTime : endTime}
          onPick={picker === 'start' ? pickStart : setEndTime}
          onClose={() => setPicker(null)}
        />
      )}
      <OptionSheet visible={picker === 'purpose'} options={purposeOptions} value={purpose} onPick={setPurpose} onClose={() => setPicker(null)} />
      <SearchSheet
        visible={picker === 'location'}
        items={locations}
        labelOf={(l) => `${l.name} – ${locationAddress(l)}`}
        onPick={applyLocation}
        onClose={() => setPicker(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hint: { marginBottom: 16, color: colors.text, lineHeight: 20 },
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: colors.outline, borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
  segItem: { paddingHorizontal: 12, paddingVertical: 10 },
  segFirst: { borderRightWidth: 1, borderRightColor: colors.outline },
  segText: { fontSize: 14, color: colors.text },
  sectionTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4, color: colors.text },
  offer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 12 },
  offerName: { flex: 1, fontSize: 15, color: colors.text },
});
