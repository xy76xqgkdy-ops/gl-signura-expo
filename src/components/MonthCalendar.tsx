import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { addMonths, sameDay, today, WEEKDAYS_SHORT } from '../lib/dates';
import { colors } from '../lib/theme';

// Farbiger Zähler unter einem Kalendertag.
export type CalendarBadge = { color: string; count: number };

// Monatskalender (Montag zuerst) mit Zählern je Tag. Monat wechseln durch
// Wischen nach links/rechts (wie in der Flutter-App ohne Pfeile).
export function MonthCalendar({
  month,
  selected,
  onSelect,
  onMonthChange,
  badgesFor = () => [],
  loading = false,
  isDisabled,
}: {
  month: Date; // erster Tag des angezeigten Monats
  selected: Date;
  onSelect: (d: Date) => void;
  onMonthChange: (m: Date) => void;
  badgesFor?: (day: number) => CalendarBadge[];
  loading?: boolean;
  isDisabled?: (d: Date) => boolean;
}) {
  const now = today();
  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Montag = 0
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array<null>(offset).fill(null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ];
    while (cells.length % 7) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [month]);

  // Wischen: aktueller Monat über ref, damit der PanResponder nicht veraltet.
  const latest = useRef({ month, onMonthChange });
  useEffect(() => {
    latest.current = { month, onMonthChange };
  });
  // latest wird nur im Wisch-Ereignis gelesen, nicht beim Rendern.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        const { month: m, onMonthChange: change } = latest.current;
        if (g.dx < -50) change(addMonths(m, 1));
        else if (g.dx > 50) change(addMonths(m, -1));
      },
    }),
  );

  return (
    <View style={s.wrap} {...pan.panHandlers}>
      <View style={s.week}>
        {WEEKDAYS_SHORT.map((w) => (
          <Text key={w} style={s.weekday}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((row, ri) => (
        <View key={ri} style={s.week}>
          {row.map((day, ci) => {
            if (day == null) return <View key={ci} style={s.cell} />;
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            const isSel = sameDay(date, selected);
            const isToday = sameDay(date, now);
            const disabled = isDisabled?.(date) ?? false;
            return (
              <Pressable
                key={ci}
                style={s.cell}
                onPress={() => onSelect(date)}
                disabled={disabled}
                accessibilityLabel={`${day}.`}
              >
                <View
                  style={[
                    s.dayCircle,
                    isSel && { backgroundColor: colors.primary },
                    isToday && !isSel && { borderWidth: 1, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[s.dayText, isSel && { color: '#fff' }, disabled && { color: colors.outline }]}>{day}</Text>
                </View>
                <View style={s.badges}>
                  {badgesFor(day)
                    .filter((b) => b.count > 0)
                    .map((b, i) => (
                      <View key={i} style={[s.badge, { backgroundColor: b.color }]}>
                        <Text style={s.badgeText}>{b.count}</Text>
                      </View>
                    ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color={colors.primary} />}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 12, paddingHorizontal: 4 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 13, color: colors.muted, paddingVertical: 6 },
  cell: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, color: colors.text },
  badges: { flexDirection: 'row', height: 14, marginTop: 2 },
  badge: {
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 1,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: 'bold', color: '#000' },
});
