import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarStack } from '../components/Avatars';
import { CalendarBadge, MonthCalendar } from '../components/MonthCalendar';
import { Sheet } from '../components/pickers';
import { StatusChip } from '../components/StatusChip';
import { Divider, ErrorText, IconName, RoundIconButton, Screen } from '../components/ui';
import { api, ApiException, errorMessage } from '../lib/api';
import { firstOfMonth, formatLongDate, formatMonthYear, sameDay, today } from '../lib/dates';
import { put } from '../lib/handoff';
import { addressText, parseRequest, RequestData, STATUS, STATUS_ORDER, timeRange } from '../lib/models';
import { logout } from '../lib/session';
import { colors } from '../lib/theme';

// Startseite: Monatskalender mit den eigenen Anfragen (farbige Zähler je
// Status, Monat per Wischen wechseln), darunter die Anfragen des gewählten
// Tages; "+" neben dem Datum legt eine neue an. Oben "⋮" für Profilbild,
// Meine Daten, Meine Orte, Benachrichtigungen und Abmelden.
// Daten: GET /me/requests für den angezeigten Monat.
export default function HomeScreen() {
  const [selected, setSelected] = useState(today());
  const [month, setMonth] = useState(firstOfMonth(today()));
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

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

  const newRequest = () => {
    const initial = selected < today() ? today() : selected;
    router.push({ pathname: '/request', params: { date: initial.toISOString() } });
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
    { key: 'notifications', icon: 'notifications-none', label: 'Benachrichtigungen' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: formatMonthYear(month),
          headerRight: () => (
            <Pressable onPress={() => setMenu(true)} hitSlop={10} accessibilityLabel="Menü" style={{ paddingHorizontal: 8 }}>
              <MaterialIcons name="more-vert" size={26} color={colors.text} />
            </Pressable>
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
        {/* Datum des Tages, rechts "+" für eine neue Anfrage. */}
        <View style={s.dateRow}>
          <Text style={s.dateText}>{formatLongDate(selected)}</Text>
          <RoundIconButton icon="add" label="Neue Anfrage" onPress={newRequest} />
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

// Leerer Tag: nur ein Hinweis; neue Anfrage über "+" neben dem Datum.
function EmptyDay() {
  return (
    <View style={s.empty}>
      <MaterialIcons name="event-available" size={48} color={colors.muted} />
      <Text style={s.emptyText}>An diesem Tag haben Sie keine Anfragen.</Text>
    </View>
  );
}

// Eine Anfrage in der Liste:
//   links   Foto des Dolmetschers, sonst Symbol Video bzw. Ort
//   Zeile 1 fett: Beginn – Ende · Name des Orts
//   Zeile 2 klein: Video + Dolmetscher bzw. Karte + Straße, PLZ Ort
//   Zeile 3 klein (nur vor Ort): Dolmetscher
//   rechts  Status
function RequestTile({ request: r, onPress }: { request: RequestData; onPress: () => void }) {
  const cancelled = r.status === 'cancelled';
  // Gebucht: Namen; offen: Zahl der Zusagen.
  const interpreter = r.interpreterName
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
          <MaterialIcons name={r.remote ? 'videocam' : 'place'} size={24} color={color} />
        </View>
      )}
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Text style={[s.tileTitle, cancelled && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
          {timeRange(r)} · {place}
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
  dateRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingTop: 8 },
  dateText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 12 },
  emptyText: { color: colors.muted, textAlign: 'center' },
  tile: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileTitle: { fontWeight: 'bold', fontSize: 15, color: colors.text },
  line: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  lineText: { flex: 1, fontSize: 12, color: colors.muted, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, gap: 16 },
  menuText: { fontSize: 16, color: colors.text },
});
