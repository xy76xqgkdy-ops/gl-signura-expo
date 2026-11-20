import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ReactNode, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { addMonths, firstOfMonth, formatMonthYear, pad2, Time } from '../lib/dates';
import { colors } from '../lib/theme';
import { MonthCalendar } from './MonthCalendar';
import { Checkbox } from './ui';

// Fenster von unten bzw. in der Mitte (Flutter: Dialog / Menü).
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {title && <Text style={s.sheetTitle}>{title}</Text>}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Datum wählen (Flutter: showDatePicker).
export function DatePickerSheet({
  visible,
  value,
  min,
  max,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: Date;
  min: Date;
  max: Date;
  onPick: (d: Date) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(firstOfMonth(value));
  const canPrev = addMonths(month, -1) >= firstOfMonth(min);
  const canNext = addMonths(month, 1) <= firstOfMonth(max);
  const change = (m: Date) => {
    if (m >= firstOfMonth(min) && m <= firstOfMonth(max)) setMonth(m);
  };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={s.monthRow}>
        <Pressable disabled={!canPrev} onPress={() => change(addMonths(month, -1))} hitSlop={8} accessibilityLabel="Monat zurück">
          <MaterialIcons name="chevron-left" size={28} color={canPrev ? colors.text : colors.outline} />
        </Pressable>
        <Text style={s.sheetTitle}>{formatMonthYear(month)}</Text>
        <Pressable disabled={!canNext} onPress={() => change(addMonths(month, 1))} hitSlop={8} accessibilityLabel="Monat vor">
          <MaterialIcons name="chevron-right" size={28} color={canNext ? colors.text : colors.outline} />
        </Pressable>
      </View>
      <MonthCalendar
        month={month}
        selected={value}
        onMonthChange={change}
        isDisabled={(d) => d < min || d > max}
        onSelect={(d) => {
          onPick(d);
          onClose();
        }}
      />
    </Sheet>
  );
}

// Uhrzeit wählen (Flutter: showTimePicker): Stunden und Minuten (5er-Schritte).
export function TimePickerSheet({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: Time;
  onPick: (t: Time) => void;
  onClose: () => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from(new Set([...Array.from({ length: 12 }, (_, i) => i * 5), value.minute])).sort((a, b) => a - b);
  const [hour, setHour] = useState(value.hour);
  const [minute, setMinute] = useState(value.minute);
  const col = (items: number[], sel: number, set: (n: number) => void, label: string) => (
    <View style={{ flex: 1 }}>
      <Text style={s.colLabel}>{label}</Text>
      <ScrollView style={{ height: 240 }} contentOffset={{ x: 0, y: Math.max(0, items.indexOf(sel) - 2) * 44 }}>
        {items.map((n) => (
          <Pressable key={n} onPress={() => set(n)} style={[s.timeItem, n === sel && { backgroundColor: colors.tonal }]}>
            <Text style={[s.timeText, n === sel && { fontWeight: '700' }]}>{pad2(n)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title={`${pad2(hour)}:${pad2(minute)} Uhr`}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {col(hours, hour, setHour, 'Stunde')}
        {col(minutes, minute, setMinute, 'Minute')}
      </View>
      <View style={s.actions}>
        <Pressable onPress={onClose} style={s.action}>
          <Text style={s.actionText}>Abbrechen</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onPick({ hour, minute });
            onClose();
          }}
          style={s.action}
        >
          <Text style={s.actionText}>OK</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// Auswahlliste (Flutter: DropdownButtonFormField).
export function OptionSheet({
  visible,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  options: string[];
  value?: string | null;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      {options.map((o) => (
        <Pressable
          key={o}
          style={[s.option, o === value && { backgroundColor: colors.tonal }]}
          onPress={() => {
            onPick(o);
            onClose();
          }}
        >
          <Text style={s.optionText}>{o}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

// Gespeicherten Ort suchen (Flutter: DropdownMenu mit Filter).
export function SearchSheet<T extends { id: string }>({
  visible,
  items,
  labelOf,
  onPick,
  onClose,
}: {
  visible: boolean;
  items: T[];
  labelOf: (t: T) => string;
  onPick: (t: T) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const shown = items.filter((i) => labelOf(i).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={s.search}>
        <MaterialIcons name="search" size={22} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Ort suchen"
          placeholderTextColor={colors.hint}
          autoFocus
          style={s.searchInput}
        />
      </View>
      <FlatList
        style={{ maxHeight: 300 }}
        data={shown}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={s.empty}>Kein Ort gefunden.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={s.option}
            onPress={() => {
              onPick(item);
              setQ('');
              onClose();
            }}
          >
            <Text style={s.optionText}>{labelOf(item)}</Text>
          </Pressable>
        )}
      />
    </Sheet>
  );
}

// Ein Eintrag der Liste: Wert, Name und Flaggen-Emoji. Für einige Codes
// gibt es statt der Flagge ein Logo (DGS).
export type FlagItem = { value: string; name: string; flag: string };
const LOGOS: Record<string, number> = { dgs: require('../../assets/images/dgs.png') };

// Liste mit Flagge, Name und Häkchen in einem Rahmen. Gewählte Einträge
// stehen oben. Höchstens maxRows Zeilen sichtbar, der Rest scrollt.
export function FlagCheckList({
  label,
  items,
  selected,
  onChange,
  maxRows = 3,
}: {
  label: string;
  items: FlagItem[];
  selected: string[];
  onChange: (value: string, checked: boolean) => void;
  maxRows?: number;
}) {
  const ROW = 48;
  const sorted = [
    ...selected.flatMap((v) => items.filter((i) => i.value === v)),
    ...items.filter((i) => !selected.includes(i.value)),
  ];
  const rows = Math.min(Math.max(sorted.length, 1), maxRows);
  return (
    <View>
      <Text style={s.listLabel}>{label}</Text>
      <View style={[s.listCard, { height: rows * ROW }]}>
        <ScrollView nestedScrollEnabled persistentScrollbar={sorted.length > maxRows}>
          {sorted.map((item) => {
            const on = selected.includes(item.value);
            return (
              <Pressable key={item.value} style={[s.flagRow, { height: ROW }]} onPress={() => onChange(item.value, !on)}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  {LOGOS[item.value] ? (
                    <Image source={LOGOS[item.value]} style={{ height: 22, width: 36 }} resizeMode="contain" accessibilityLabel={item.name} />
                  ) : (
                    <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                  )}
                </View>
                <Text style={s.flagName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Checkbox checked={on} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8, textAlign: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colLabel: { textAlign: 'center', color: colors.muted, marginBottom: 4 },
  timeItem: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  timeText: { fontSize: 18, color: colors.text },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  action: { paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  option: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8 },
  optionText: { fontSize: 16, color: colors.text },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.field,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12, marginLeft: 8, color: colors.text },
  empty: { color: colors.muted, textAlign: 'center', padding: 16 },
  listLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  flagRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  flagName: { flex: 1, fontSize: 15, color: colors.text },
});
