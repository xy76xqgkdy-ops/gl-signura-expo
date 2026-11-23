import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarStack } from '../components/Avatars';
import { CalendarBadge, MonthCalendar } from '../components/MonthCalendar';
import { Sheet } from '../components/pickers';
import { StatusChip } from '../components/StatusChip';
import { Divider, ErrorText, IconName, Screen } from '../components/ui';
import { api, ApiException, errorMessage } from '../lib/api';
import { firstOfMonth, formatDayDate, formatMonthYear, sameDay, today } from '../lib/dates';
import { put } from '../lib/handoff';
import { addressText, arrangeText, parseRequest, RequestData, STATUS, STATUS_ORDER, timeRange, wishText } from '../lib/models';
import { onPushReceived, syncPush } from '../lib/push';
import { logout, useSession } from '../lib/session';
import { colors } from '../lib/theme';

// Startseite: Monatskalender mit den eigenen Anfragen (farbige Zähler je
// Status, Monat per Wischen wechseln), darunter die Anfragen des gewählten
// Tages. Oben "+" für eine neue Anfrage, Kopf für Profilbild,
// Meine Daten, Meine Orte, Benachrichtigungen und Abmelden.
// Daten: GET /me/requests für den angezeigten Monat.
export default function HomeScreen() {
  const [selected, setSelected] = useState(today());
  const [month, setMonth] = useState(firstOfMonth(today()));
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [newMenu, setNewMenu] = useState(false);

  const monthRef = useRef(month);
  const load = useCallback(async (m: Date = monthRef.current) => {
    monthRef.current = m;
    const from = new Date(m.getFullYear(), m.getMonth(), 1);
    const to = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    setLoading(true);
    setError(null);
    try {
      const list = await api.getJsonList('/me/requests', { from: from.toISOString(), to: to.toISOString() });
      if (monthRef.current !== m) return; // inzwischen anderer Monat
      setRequests(list.map(parseRequest));
    } catch (e) {
      if (e instanceof ApiException && e.statusCode === 401) {
        router.replace('/login'); // Sitzung abgelaufen
        return;
      }
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Push: Gerät beim Backend anmelden (ohne zu fragen, nur wenn erlaubt);
  // kommt eine Mitteilung bei offener App, die Liste neu laden.
  const { user } = useSession();
  const notifyPush = user?.notify_push !== false;
  useEffect(() => {
    syncPush(notifyPush);
    return onPushReceived(() => load());
  }, [notifyPush, load]);

  // Beim Öffnen und bei jeder Rückkehr (z. B. nach Speichern einer Anfrage) neu laden.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changeMonth = (m: Date) => {
    setMonth(m);
    load(m);
  };

  const badgesFor = (day: number): CalendarBadge[] => {
    const ofDay = requests.filter(
      (r) => r.start.getFullYear() === month.getFullYear() && r.start.getMonth() === month.getMonth() && r.start.getDate() === day,
    );
    return STATUS_ORDER.map((st) => ({ color: STATUS[st].color, count: ofDay.filter((r) => r.status === st).length }));
  };

  const ofDay = requests.filter((r) => sameDay(r.start, selected));

  // Neue Anfrage: mit festem Termin oder "Termin vereinbaren" (booking=arrange).
  const newRequest = (booking: 'fixed' | 'arrange') => {
    setNewMenu(false);
    const initial = selected < today() ? today() : selected;
    router.push({ pathname: '/request', params: { date: initial.toISOString(), booking } });
  };

  // Anfrage öffnen: bearbeiten, solange offen; sonst ansehen und ggf. absagen.
  const openRequest = (r: RequestData) => {
    put('request', r);
    router.push({ pathname: '/request', params: { id: r.id } });
  };

  async function onMenu(item: string) {
    setMenu(false);
    switch (item) {
      case 'picture':
        return router.push('/picture');
      case 'profile':
        return router.push('/profile');
      case 'locations':
        return router.push('/locations');
      case 'interpreters':
        return router.push('/interpreters');
      case 'notifications':
        return router.push('/notifications');
      case 'logout':
        await logout();
        router.replace('/login');
    }
  }

  const menuItems: { key: string; icon: IconName; label: string }[] = [
    { key: 'picture', icon: 'account-circle', label: 'Profilbild' },
    { key: 'profile', icon: 'person-outline', label: 'Meine Daten' },
    { key: 'locations', icon: 'place', label: 'Meine Orte' },
    { key: 'interpreters', icon: 'record-voice-over', label: 'Meine DolmetscherInnen' },
    { key: 'notifications', icon: 'notifications-none', label: 'Benachrichtigungen' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: formatMonthYear(month),
          headerRight: () => (
            // "+": neue Anfrage; Kopf: Menü.
            <View style={s.header}>
              <Pressable onPress={() => setNewMenu(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Neue Anfrage">
                <MaterialIcons name="add" size={32} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => setMenu(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Menü">
                <MaterialIcons name="account-circle" size={28} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Screen padded={false} onRefresh={() => load()} refreshing={false}>
        <MonthCalendar
          month={month}
          selected={selected}
          onSelect={setSelected}
          onMonthChange={changeMonth}
          badgesFor={badgesFor}
          loading={loading}
        />
        <Divider />
        <View style={s.dateRow}>
          <Text style={s.dateText}>{formatDayDate(selected)}</Text>
        </View>
        {error ? (
          <ErrorText message={error} />
        ) : ofDay.length === 0 ? (
          !loading && <EmptyDay />
        ) : (
          ofDay.map((r, i) => (
            <View key={r.id}>
              {i > 0 && <Divider />}
              <RequestTile request={r} onPress={() => openRequest(r)} />
            </View>
          ))
        )}
      </Screen>

      {/* Neue Anfrage: eigener Termin oder Termin vereinbaren lassen. */}
      <Sheet visible={newMenu} onClose={() => setNewMenu(false)}>
        <Pressable style={s.menuItem} onPress={() => newRequest('fixed')}>
          <MaterialIcons name="edit-calendar" size={24} color={colors.muted} />
          <Text style={s.menuText}>Neuer Termin</Text>
        </Pressable>
        <Pressable style={s.menuItem} onPress={() => newRequest('arrange')}>
          <MaterialIcons name="support-agent" size={24} color={colors.muted} />
          <Text style={s.menuText}>Termin vereinbaren</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        {menuItems.map((m) => (
          <Pressable key={m.key} style={s.menuItem} onPress={() => onMenu(m.key)}>
            <MaterialIcons name={m.icon} size={24} color={colors.muted} />
            <Text style={s.menuText}>{m.label}</Text>
          </Pressable>
        ))}
        <Divider />
        <Pressable style={s.menuItem} onPress={() => onMenu('logout')}>
          <MaterialIcons name="logout" size={24} color={colors.muted} />
          <Text style={s.menuText}>Abmelden</Text>
        </Pressable>
      </Sheet>
    </>
  );
}

// Leerer Tag: nur ein Hinweis; neue Anfrage über "+" in der Kopfzeile.
function EmptyDay() {
  return (
    <View style={s.empty}>
      <MaterialIcons name="event-available" size={48} color={colors.muted} />
      {/* Gleiche Farbe wie bei "Meine Orte" (ErrorText). */}
      <Text style={s.emptyText}>Hier ist noch keine Anfrage.{'\n'}Klicken Sie oben rechts auf +.</Text>
    </View>
  );
}

// Eine Anfrage in der Liste:
//   links   Foto des Dolmetschers, sonst Symbol Video bzw. Ort
//   Zeile 1 fett: Beginn – Ende · Name des Orts
//   Zeile 2 klein: Video + Dolmetscher bzw. Karte + Straße, PLZ Ort
//   Zeile 3 klein (nur vor Ort): Dolmetscher
//   rechts  Status
// Terminsuche (noch kein Termin): Zeitraum statt Uhrzeit, Stand statt Dolmetscher.
function RequestTile({ request: r, onPress }: { request: RequestData; onPress: () => void }) {
  const cancelled = r.status === 'cancelled';
  // Gebucht: Namen; offen: Zahl der Zusagen.
  const interpreter = r.arrangeState
    ? arrangeText(r)
    : r.interpreterName
      ? r.interpreterName
      : r.status === 'new' && r.offerCount > 0
        ? `${r.offerCount} ${r.offerCount === 1 ? 'Zusage' : 'Zusagen'}`
        : 'noch keine Zusage';
  const place = r.locationName || r.purpose;
  const color = STATUS[r.status].color;

  const line = (icon: IconName, text: string) => (
    <View style={s.line}>
      <MaterialIcons name={icon} size={14} color={colors.muted} />
      <Text style={s.lineText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, pressed && { backgroundColor: colors.field }]}>
      {/* Gebucht mit Bild: Profilbilder der Dolmetscher:innen, sonst Symbol. */}
      {r.interpreterPictures.length > 0 ? (
        <AvatarStack pictures={r.interpreterPictures} />
      ) : (
        <View style={[s.avatar, { backgroundColor: color + '26' }]}>
          <MaterialIcons
            name={r.arrangeState && r.arrangeState !== 'cancelled' ? 'event-note' : r.remote ? 'videocam' : 'place'}
            size={24}
            color={color}
          />
        </View>
      )}
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Text style={[s.tileTitle, cancelled && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
          {r.arrangeState ? wishText(r) : timeRange(r)} · {place}
        </Text>
        {r.remote ? (
          line('videocam', interpreter)
        ) : (
          <>
            {line('map', addressText(r))}
            {line('record-voice-over', interpreter)}
          </>
        )}
      </View>
      <StatusChip status={r.status} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  dateText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 12 },
  emptyText: { color: colors.error, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  tile: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileTitle: { fontWeight: 'bold', fontSize: 15, color: colors.text },
  line: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  lineText: { flex: 1, fontSize: 12, color: colors.muted, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, gap: 16 },
  menuText: { fontSize: 16, color: colors.text },
});
