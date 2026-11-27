import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '../components/Avatars';
import { DeleteHeaderButton, headerButtons, SaveHeaderButton, useDiscardGuard } from '../components/formHeader';
import { DatePickerSheet, OptionSheet, TimePickerSheet } from '../components/pickers';
import { StatusChip } from '../components/StatusChip';
import { VideoCard } from '../components/VideoCard';
import {
  AppTextField,
  BinSymbol,
  Card,
  Checkbox,
  CheckSymbol,
  ErrorText,
  InfoNote,
  Screen,
  StatusNote,
  TapField,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { at, dateOnly, formatDate, formatHM, formatTime, Time, timeOf, today } from '../lib/dates';
import { peek } from '../lib/handoff';
import { openRoute } from '../lib/maps';
import {
  dayString,
  LocationData,
  locationAddress,
  OfferData,
  parseLocation,
  parseOffer,
  RequestData,
  shortDay,
  STATUS,
  TimeOfDay,
  TIMES_OF_DAY,
} from '../lib/models';
import { confirm, makeStyles, useColors } from '../lib/theme';

// Auswahl für den Grund. Ein älterer, freier Grund einer vorhandenen
// Anfrage bleibt als zusätzliche Option erhalten.
const PURPOSES = ['Arzt', 'Arbeit', 'Behörde', 'Privat', 'Sonstige'];

// Erklärung oben auf der Seite, in einfacher Sprache (kurze Sätze, hintereinander).
const INFO_FIXED = [
  'Sie haben schon einen Termin.',
  'Schreiben Sie: Datum, Uhrzeit und Ort.',
];

// Texte je nach Grund: Beispiel für den Namen, Telefon-Feld und wo der
// Vermittler anruft. Ohne Grund, "Privat", "Sonstige" oder einen älteren freien
// Grund: allgemeine Texte.
const PLACE_TEXTS: Record<string, { example: string; phone: string; call: string }> = {
  Arzt: { example: 'Praxis Dr. Müller', phone: 'Telefon der Praxis', call: 'in der Praxis' },
  Arbeit: { example: 'Firma Muster GmbH', phone: 'Telefon der Firma', call: 'in der Firma' },
  Behörde: { example: 'Bürgeramt Mitte', phone: 'Telefon des Amts', call: 'beim Amt' },
  Privat: { example: 'Familie Schmidt', phone: 'Telefon für den Termin', call: 'dort' },
};
const PLACE_DEFAULT = { example: 'Praxis, Amt oder Firma', phone: 'Telefon für den Termin', call: 'dort' };
const placeTexts = (purpose: string | null) => (purpose && PLACE_TEXTS[purpose]) || PLACE_DEFAULT;

const infoArrange = (purpose: string | null) => [
  'Sie haben noch keinen Termin.',
  `Ein Vermittler ruft ${placeTexts(purpose).call} für Sie an.`,
];

// Neue Anfrage (POST /me/requests) oder vorhandene bearbeiten
// (PUT /me/requests/{id}) und absagen (POST /me/requests/{id}/cancel).
// Zusagen ankreuzen und buchen (POST /me/requests/{id}/award).
//
// Ändern geht nur, solange die Anfrage offen ist und es keine Zusagen gibt;
// absagen, solange der Termin noch bevorsteht (das prüft auch das Backend).
//
// Terminsuche ("Termin vereinbaren", booking "arrange", von der Hauptseite
// per Parameter booking=arrange): statt Datum und Uhrzeit ein Zeitraum
// (frühestens/spätestens) und die Tageszeit; Name und Telefon der Praxis
// sind Pflicht. Ein Vermittler
// vereinbart den Termin und schlägt ihn vor; hier annehmen
// (POST …/proposal/accept) oder ablehnen (POST …/proposal/decline).
export default function RequestFormScreen() {
  const colors = useColors();
  const s = useS();
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    booking?: string;
  }>();
  const found = params.id ? peek<RequestData>('request') : undefined;
  const existing = found && found.id === params.id ? found : undefined;

  const [date, setDate] = useState(dateOnly(existing?.start ?? (params.date ? new Date(params.date) : today())));
  const [startTime, setStartTime] = useState<Time>(existing ? timeOf(existing.start) : { hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState<Time>(existing ? timeOf(existing.end) : { hour: 10, minute: 0 });
  const [remote, setRemote] = useState(existing?.remote ?? false);

  // Terminsuche: neue Anfrage über booking=arrange; vorhandene nur, solange
  // kein Termin angenommen ist (arrangeState gesetzt).
  const arrange = existing ? !!existing.arrangeState : params.booking === 'arrange';
  const [wishFrom, setWishFrom] = useState<Date>(
    existing?.wishFrom ?? dateOnly(params.date ? new Date(params.date) : today()),
  );
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(existing?.timeOfDay ?? 'any');
  const [note, setNote] = useState(existing?.note ?? '');
  const [purpose, setPurpose] = useState<string | null>(existing?.purpose ?? null);
  const purposeOptions = [...PURPOSES, ...(existing && !PURPOSES.includes(existing.purpose) ? [existing.purpose] : [])];

  // Adresse der Anfrage: gehört der Anfrage selbst. Ein gespeicherter Ort
  // füllt die Felder nur aus; ändert man ihn später, bleibt die Anfrage gleich.
  const [locName, setLocName] = useState(existing?.locationName ?? '');
  const [locStreet, setLocStreet] = useState(
    existing?.locationStreet === 'per Video' ? '' : (existing?.locationStreet ?? ''),
  );
  const [locPostal, setLocPostal] = useState(existing?.locationPostalcode ?? '');
  const [locCity, setLocCity] = useState(existing?.locationCity ?? '');
  const [locEmail, setLocEmail] = useState(existing?.locationEmail ?? '');
  const [locPhone, setLocPhone] = useState(existing?.locationPhone ?? '');
  const [locationId, setLocationId] = useState<string | null>(existing?.locationId ?? null); // nur Herkunft

  const [locations, setLocations] = useState<LocationData[]>([]);
  // Vorschläge aus "Meine Orte" unter dem Namensfeld zeigen.
  const [nameFocused, setNameFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zusagen (nur Namen, keine Vermittler) und die zum Buchen angekreuzten.
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const [picker, setPicker] = useState<'date' | 'start' | 'end' | 'purpose' | 'wishFrom' | null>(null);

  const isOpen = existing?.status === 'new';
  // Neue Anfrage oder offene ohne Zusagen (Terminsuche: noch kein Vermittler): alle Felder änderbar.
  const editable =
    !existing ||
    (isOpen && existing.offerCount === 0 && (existing.booking === 'fixed' || existing.arrangeState === 'searching'));
  const openOffers = offers.filter((o) => o.status === 'offered');
  const proposal = offers.filter((o) => o.status === 'proposed');
  const proposalStart = proposal[0]?.proposedStart ?? null;
  const proposalEnd = proposal[0]?.proposedEnd ?? null;
  const canAward = isOpen && chosen.size > 0 && !loading;
  // Terminsuche ohne Termin: jederzeit absagen; sonst bis zum Beginn.
  const canCancel =
    !!existing &&
    existing.status !== 'cancelled' &&
    (existing.start > new Date() || (isOpen && !!existing.arrangeState));

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
      }
    })();
    if (
      existing &&
      (existing.offerCount > 0 || existing.status === 'confirmed' || existing.arrangeState === 'proposed')
    ) {
      api
        .getJsonList(`/me/requests/${existing.id}/offers`)
        .then((list) => {
          const loaded = list.map(parseOffer);
          setOffers(loaded);
          // Terminvorschlag: alle vorgeschlagenen Dolmetscher vorab angekreuzt.
          setChosen(new Set(loaded.filter((o) => o.status === 'proposed').map((o) => o.id)));
        })
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

  // Orte passend zum eingetippten Namen (auch Straße oder Ort); leer: alle.
  const q = locName.trim().toLowerCase();
  const suggestions = locations
    .filter((l) => !q || `${l.name} ${locationAddress(l)}`.toLowerCase().includes(q))
    .filter((l) => l.id !== locationId || l.name !== locName)
    .slice(0, 8);

  const startAt = at(date, startTime);
  const endAt = at(date, endTime);
  const canSave =
    !!purpose &&
    (arrange ? locName.trim() !== '' && locPhone.trim() !== '' : endAt > startAt) &&
    (remote || [locStreet, locPostal, locCity].every((v) => v.trim() !== '')) &&
    editable &&
    !loading;

  // Eingaben geändert? Vergleich mit dem Stand beim Öffnen.
  const formKey = JSON.stringify([
    date.getTime(),
    startTime,
    endTime,
    remote,
    wishFrom.getTime(),
    timeOfDay,
    note,
    purpose,
    locName,
    locStreet,
    locPostal,
    locCity,
    locEmail,
    locPhone,
  ]);
  const [initialKey] = useState(formKey);
  const dirty = editable && formKey !== initialKey;

  const guard = useDiscardGuard({
    dirty,
    loading,
    message: existing
      ? 'Ihre Änderungen an der Anfrage werden nicht gespeichert.'
      : 'Die Anfrage wird nicht gesendet. Ihre Eingaben gehen verloren.',
  });

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
        booking: arrange ? 'arrange' : 'fixed',
        ...(arrange
          ? {
              wish_from: dayString(wishFrom),
              // "Spätestens" fragt die App nicht mehr: Backend und Vermittler-API
              // brauchen es; 3 Monate ist dort der längste erlaubte Zeitraum.
              wish_to: dayString(addMonths(wishFrom, 3)),
              time_of_day: timeOfDay,
            }
          : {}),
        note: note.trim(),
      };
      if (existing) await api.putJson(`/me/requests/${existing.id}`, body);
      else await api.postJson('/me/requests', body);
    });

  async function cancel() {
    if (!existing) return;
    const ok = await confirm({
      title: 'Anfrage absagen?',
      message: existing.arrangeState
        ? `Die Terminsuche (${existing.purpose}) wird abgesagt. Sie können das nicht rückgängig machen.`
        : `${existing.purpose} am ${formatDate(existing.start)} um ${formatTime(existing.start)} Uhr wird abgesagt. Sie können das nicht rückgängig machen.`,
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
      await api.postJson(`/me/requests/${existing.id}/award`, {
        offer_ids: [...chosen],
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
      loadOffers(); // z. B. inzwischen zurückgezogene Zusage
    }
  }

  // Haken oben rechts beim Terminvorschlag: angekreuzte Dolmetscher buchen (die
  // anderen bekommen eine Absage). Nichts angekreuzt: Vorschlag ablehnen.
  async function answerProposal() {
    if (!existing || !proposalStart || !proposalEnd) return;
    const picked = proposal.filter((o) => chosen.has(o.id));
    if (picked.length === 0) return declineProposal();
    const others = picked.length < proposal.length ? '\nDie anderen bekommen eine Absage.' : '';
    const ok = await confirm({
      title: 'Termin annehmen?',
      message: `${shortDay(proposalStart)}, ${formatTime(proposalStart)} – ${formatTime(proposalEnd)} Uhr\nmit ${picked
        .map((o) => o.interpreterName)
        .join(', ')}\n\nDer Termin ist dann gebucht.${others}`,
      ok: 'annehmen',
      cancel: 'Abbrechen',
    });
    if (ok)
      run(() =>
        api
          .postJson(`/me/requests/${existing.id}/proposal/accept`, { offer_ids: picked.map((o) => o.id) })
          .then(() => {}),
      );
  }

  // Terminvorschlag ablehnen: Der Vermittler sucht einen anderen Termin.
  async function declineProposal() {
    if (!existing) return;
    const ok = await confirm({
      title: 'Vorschlag ablehnen?',
      message: 'Der Vermittler sucht dann einen anderen Termin für Sie.',
      ok: 'ablehnen',
      cancel: 'Abbrechen',
      destructive: true,
    });
    if (ok) run(() => api.postJson(`/me/requests/${existing.id}/proposal/decline`).then(() => {}));
  }

  // Warum die Anfrage nicht mehr änderbar ist (bei "Gebucht" mit Namen).
  // Absagen geht mit dem Papierkorb oben rechts.
  // Kurze Sätze, einfache Wörter; "Absagen: …" nur, wenn absagen geht.
  // Haken und Papierkorb als Symbol im Text (wie oben rechts).
  function lockedHint(r: RequestData): ReactNode {
    const bin = canCancel && (
      <>
        {' '}Absagen: <BinSymbol /> oben rechts.
      </>
    );
    if (r.arrangeState === 'in_progress') {
      return <>Ein Vermittler sucht einen Termin. Sie bekommen dann eine Mitteilung.{bin}</>;
    }
    if (r.arrangeState === 'proposed') {
      // "Es gibt einen Terminvorschlag" steht schon in der Status-Zeile darüber.
      return (
        <>
          Kreuzen Sie die Dolmetscher an und tippen Sie oben rechts auf <CheckSymbol />. Ohne Kreuz lehnen Sie den
          Vorschlag ab.{bin}
        </>
      );
    }
    if (r.status === 'new' && r.offerCount > 0) {
      return (
        <>
          Es gibt Zusagen. Wählen Sie aus. Dann tippen Sie oben rechts auf <CheckSymbol />.{bin}
        </>
      );
    }
    return <>Sie können die Anfrage nicht mehr ändern.{bin}</>;
  }

  const toggle = (id: string) =>
    setChosen((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Route nur mit ganzer Adresse (Straße, PLZ, Ort).
  const canRoute = [locStreet, locPostal, locCity].every((v) => v.trim() !== '');
  // Terminvorschlag des Vermittlers: Dolmetscher ankreuzen, Haken oben rechts
  // nimmt an (ohne Kreuz: ablehnen).
  const canAnswer = existing?.arrangeState === 'proposed' && !!proposalStart && !!proposalEnd;
  const shownOffers = canAnswer ? proposal : isOpen ? openOffers : offers.filter((o) => o.status === 'awarded');
  // Offene Anfrage mit Zusagen: ankreuzen, Haken oben rechts bucht.
  const canBook = isOpen && openOffers.length > 0 && !canAnswer;

  return (
    <>
      <Stack.Screen
        options={{
          title: !existing
            ? arrange
              ? 'Termin vereinbaren'
              : 'Neuer Termin'
            : editable
              ? 'Anfrage bearbeiten'
              : 'Anfrage',
          // Oben links "<" bzw. "x" (components/formHeader.tsx).
          ...guard,
          // Oben rechts: neue Anfrage → Haken zum Senden; absagen möglich → Papierkorb,
          // daneben der Haken zum Speichern (änderbar) bzw. Buchen (Zusagen);
          // sonst der Status (z. B. abgesagt, vorbei).
          // Jeder Knopf mit eigener Fläche (headerButtons).
          ...(!existing
            ? headerButtons([
                <SaveHeaderButton key="send" label="Anfrage senden" onPress={save} disabled={!canSave || !dirty} loading={loading} />,
              ])
            : canCancel || canBook || editable || canAnswer
              ? headerButtons([
                  canCancel && (
                    <DeleteHeaderButton
                      key="cancel"
                      label="Termin absagen"
                      hint="Sagt den Termin ab. Vorher kommt eine Rückfrage."
                      onPress={cancel}
                      disabled={loading}
                    />
                  ),
                  editable && (
                    <SaveHeaderButton key="save" label="speichern" onPress={save} disabled={!canSave || !dirty} loading={loading} />
                  ),
                  canAnswer && (
                    <SaveHeaderButton
                      key="answer"
                      label={chosen.size > 0 ? 'Terminvorschlag annehmen' : 'Terminvorschlag ablehnen'}
                      onPress={answerProposal}
                      disabled={loading}
                      loading={loading}
                    />
                  ),
                  canBook && (
                    <SaveHeaderButton
                      key="book"
                      label={`${chosen.size} Dolmetscher buchen`}
                      onPress={award}
                      disabled={!canAward}
                      loading={loading}
                    />
                  ),
                ])
              : {
                  headerRight: () => <StatusChip status={existing.status} />,
                  // Der Status ist kein Knopf: nur Punkt und Text, ohne Glas-Fläche (iOS 26).
                  unstable_headerRightItems: () => [
                    {
                      type: 'custom' as const,
                      element: <StatusChip status={existing.status} />,
                      hidesSharedBackground: true,
                    },
                  ],
                }),
        }}
      />
      <Screen>
        {/* Oben rechts steht der Papierkorb: Status hier (außer bei "Gebucht", das steht im Hinweis). */}
        {existing && canCancel && existing.status !== 'confirmed' && (
          <StatusNote color={STATUS[existing.status].color} style={{ marginBottom: 8 }}>
            {STATUS[existing.status].text}
            {canAnswer ? ': Es gibt einen Terminvorschlag' : ''}
          </StatusNote>
        )}
        {existing &&
          !editable &&
          existing.status !== 'cancelled' &&
          (existing.status === 'confirmed' ? (
            // "Gebucht: Name" mit grünem Punkt davor (wie der Status in der Liste),
            // darunter mit ⓘ, wie man absagt.
            <>
              <StatusNote color={STATUS.confirmed.color} style={canCancel ? { marginBottom: 8 } : undefined}>
                Gebucht{existing.interpreterName ? `: ${existing.interpreterName}` : ''}
              </StatusNote>
              {canCancel && (
                <InfoNote>
                  Absagen: <BinSymbol /> oben rechts.
                </InfoNote>
              )}
            </>
          ) : (
            <InfoNote>{lockedHint(existing)}</InfoNote>
          ))}
        {/* Gebucht per Video: Knopf "Video starten" ab 15 Minuten vorher. */}
        {existing && existing.status === 'confirmed' && existing.remote && <VideoCard requestId={existing.id} />}

        {/* Kurze Erklärung in einfacher Sprache, solange man eingeben kann. */}
        {editable && <InfoNote>{(arrange ? infoArrange(purpose) : INFO_FIXED).join(' ')}</InfoNote>}

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

        {canAnswer && proposalStart && proposalEnd ? (
          // Terminvorschlag des Vermittlers: Datum, Beginn und Ende (nur ansehen).
          <>
            <TapField
              icon="calendar-today"
              label="Terminvorschlag am"
              value={formatDate(proposalStart)}
              disabled
              onPress={() => {}}
            />
            <View style={s.row}>
              <TapField
                style={{ flex: 1, marginRight: 12 }}
                icon="schedule"
                label="Beginn"
                value={formatTime(proposalStart)}
                disabled
                onPress={() => {}}
              />
              <TapField
                style={{ flex: 1 }}
                icon="schedule"
                label="Ende"
                value={formatTime(proposalEnd)}
                disabled
                onPress={() => {}}
              />
            </View>
          </>
        ) : arrange ? (
          // Terminsuche: ab wann und Tageszeit.
          !canAnswer && (
            <>
              <TapField
                icon="calendar-today"
                label="Ab wann?"
                value={formatDate(wishFrom)}
                disabled={!editable}
                onPress={() => setPicker('wishFrom')}
              />
              <View style={[s.segment, s.segWide, !editable && { opacity: 0.5 }]}>
                {TIMES_OF_DAY.map((o, i) => (
                  <Pressable
                    key={o.v}
                    disabled={!editable}
                    onPress={() => setTimeOfDay(o.v)}
                    style={[
                      s.segItem,
                      s.segFlex,
                      i > 0 && s.segLeft,
                      timeOfDay === o.v && { backgroundColor: colors.tonal },
                    ]}
                  >
                    <Text style={s.segText}>{o.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )
        ) : (
          <>
            <TapField
              icon="calendar-today"
              label="Datum"
              value={formatDate(date)}
              disabled={!editable}
              onPress={() => setPicker('date')}
            />
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
          </>
        )}

        {/* Gleich unter dem Termin, mit Profilbild: offene Zusagen zum Ankreuzen (Haken oben
            rechts bucht) bzw. gebuchte Dolmetscher mit grünem Haken. */}
        {shownOffers.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={s.sectionTitle}>
              {canAnswer
                ? `Vorgeschlagene Dolmetscher: ${chosen.size} ausgewählt`
                : isOpen
                  ? `Zusagen: ${chosen.size} ausgewählt`
                  : 'Gebuchte Dolmetscher'}
            </Text>
            <Card>
              {shownOffers.map((o) =>
                isOpen ? (
                  <Pressable key={o.id} style={s.offer} disabled={loading} onPress={() => toggle(o.id)}>
                    <OfferPicture offer={o} />
                    <OfferName offer={o} />
                    <Checkbox checked={chosen.has(o.id)} />
                  </Pressable>
                ) : (
                  <View key={o.id} style={s.offer}>
                    <OfferPicture offer={o} />
                    <OfferName offer={o} />
                    <MaterialIcons name="check-circle" size={22} color={colors.success} />
                  </View>
                ),
              )}
            </Card>
          </View>
        )}

        {/* Eine Zeile Abstand zwischen Termin und Ort. */}
        <View style={{ height: 20 }} />

        {/* Name des Orts mit Suche: Tippen zeigt passende Orte aus "Meine Orte", Antippen
            übernimmt die Adresse. Ein neuer Ort landet beim Speichern der Anfrage automatisch
            in "Meine Orte" (macht das Backend, wenn Name, Straße, PLZ und Ort neu sind). */}
        {/* Route: rechts über dem Ort, erst wenn die ganze Adresse da ist; öffnet die Standard-Karten-App. */}
        {!remote && canRoute && (
          <Pressable
            style={s.routeButton}
            accessibilityRole="button"
            onPress={() =>
              openRoute(`${locStreet.trim()}, ${locPostal.trim()} ${locCity.trim()}`).catch((e) =>
                setError(errorMessage(e)),
              )
            }
          >
            <MaterialIcons name="directions" size={20} color={colors.primary} />
            <Text style={s.routeText}>Route in Karten öffnen</Text>
          </Pressable>
        )}
        <AppTextField
          // Beispiel passend zum Grund (PLACE_TEXTS).
          label={remote && !arrange ? 'Name (z. B. Gesprächspartner)' : `Name (z. B. ${placeTexts(purpose).example})`}
          placeholder={editable ? 'Name eingeben oder suchen' : undefined}
          rightIcon={editable ? 'search' : undefined}
          value={locName}
          onChangeText={setLocName}
          editable={editable}
          onFocus={() => setNameFocused(true)}
          // Verzögert, damit ein Antippen der Vorschläge (Browser) noch ankommt.
          onBlur={() => setTimeout(() => setNameFocused(false), 200)}
          style={nameFocused && editable && suggestions.length > 0 ? { marginBottom: 4 } : undefined}
        />
        {nameFocused && editable && suggestions.length > 0 && (
          <Card style={{ marginBottom: 12 }}>
            {suggestions.map((l) => (
              <Pressable
                key={l.id}
                style={({ pressed }) => [s.suggestion, pressed && { backgroundColor: colors.field }]}
                onPress={() => {
                  applyLocation(l);
                  setNameFocused(false);
                }}
              >
                <MaterialIcons name="place" size={20} color={colors.muted} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.offerName}>{l.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{locationAddress(l)}</Text>
                </View>
              </Pressable>
            ))}
          </Card>
        )}
        {/* Terminsuche: Dort ruft der Vermittler an (Beschriftung passend zum Grund). */}
        {arrange && (
          <AppTextField
            label={placeTexts(purpose).phone}
            value={locPhone}
            onChangeText={setLocPhone}
            keyboardType="phone-pad"
            editable={editable}
          />
        )}
        {/* Adresse und Kontakt: bei "per Video" ausgeblendet, aber aus dem gewählten Ort trotzdem mitgespeichert. */}
        {!remote && (
          <>
            <AppTextField
              label="Straße und Hausnummer"
              value={locStreet}
              onChangeText={setLocStreet}
              editable={editable}
            />
            <View style={s.row}>
              <AppTextField
                style={{ width: 120, marginRight: 12 }}
                label="PLZ"
                value={locPostal}
                onChangeText={setLocPostal}
                keyboardType="number-pad"
                editable={editable}
              />
              <AppTextField
                style={{ flex: 1 }}
                label="Ort"
                value={locCity}
                onChangeText={setLocCity}
                editable={editable}
              />
            </View>
            <View style={s.row}>
              <AppTextField
                style={{ flex: 1, marginRight: arrange ? 0 : 12 }}
                label="E-Mail (optional)"
                value={locEmail}
                onChangeText={setLocEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={editable}
              />
              {!arrange && (
                <AppTextField
                  style={{ flex: 1 }}
                  label="Telefon (optional)"
                  value={locPhone}
                  onChangeText={setLocPhone}
                  keyboardType="phone-pad"
                  editable={editable}
                />
              )}
            </View>
          </>
        )}
        {/* Eine Zeile Abstand vor dem Hinweis. */}
        <View style={{ height: 20 }} />
        <AppTextField
          label="Hinweis (optional)"
          placeholder={editable ? (arrange ? 'z. B. nur Montag und Mittwoch' : 'z. B. Eingang im Hof') : undefined}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
          editable={editable}
        />


        {/* Senden, speichern, buchen und absagen gehen oben rechts. */}
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
      {picker === 'wishFrom' && (
        <DatePickerSheet
          visible
          value={wishFrom}
          min={today()}
          max={addDays(today(), 365)}
          onPick={setWishFrom}
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
      <OptionSheet
        visible={picker === 'purpose'}
        options={purposeOptions}
        value={purpose}
        onPick={setPurpose}
        onClose={() => setPicker(null)}
      />
    </>
  );
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Wie Go AddDate(0, n, 0) im Backend (31.01. + 1 Monat = 03.03.).
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

// Name des Dolmetschers mit Herkunft: "Mein Dolmetscher" oder der Vermittler.
function OfferName({ offer }: { offer: OfferData }) {
  const s = useS();
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.offerName}>{offer.interpreterName}</Text>
      {offer.own && <Text style={s.ownLabel}>Mein Dolmetscher</Text>}
      {!offer.own && offer.partnerName && <Text style={s.partnerLabel}>über {offer.partnerName}</Text>}
    </View>
  );
}

// Profilbild der Dolmetscher, ohne Bild ein graues Symbol in gleicher Größe.
function OfferPicture({ offer }: { offer: OfferData }) {
  const colors = useColors();
  const s = useS();
  if (offer.picture) return <Avatar uri={offer.picture} size={48} />;
  return (
    <View style={s.noPicture}>
      <MaterialIcons name="person" size={28} color={colors.muted} />
    </View>
  );
}

const useS = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center' },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  segItem: { paddingHorizontal: 12, paddingVertical: 10 },
  segFirst: { borderRightWidth: 1, borderRightColor: colors.outline },
  segLeft: { borderLeftWidth: 1, borderLeftColor: colors.outline },
  segWide: { alignSelf: 'stretch' },
  segFlex: { flex: 1, alignItems: 'center' },
  segText: { fontSize: 14, color: colors.text },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: colors.text,
  },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  offerName: { flex: 1, fontSize: 15, color: colors.text },
  ownLabel: { fontSize: 12, color: colors.primary, marginTop: 2 },
  partnerLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  routeText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  noPicture: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
}));
