import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Divider, ErrorText, Screen } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { put } from '../../lib/handoff';
import { INTERPRETER_STATUS, InterpreterData, parseInterpreter } from '../../lib/models';
import { makeStyles, useColors } from '../../lib/theme';

// Meine Dolmetscher (GET /me/interpreters): eigene Wunsch-Dolmetscher.
// Sie bekommen die Anfragen per E-Mail, nachdem sie die Einladung
// angenommen haben. Antippen zum Ändern oder Löschen, "+" für einen neuen.
export default function InterpreterListScreen() {
  const colors = useColors();
  const s = useS();
  const [list, setList] = useState<InterpreterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList((await api.getJsonList('/me/interpreters')).map(parseInterpreter));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = (d?: InterpreterData) => {
    put('interpreter', d);
    router.push({ pathname: '/interpreters/form', params: d ? { id: d.id } : {} });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => open()} hitSlop={10} accessibilityLabel="Neuer Dolmetscher" style={{ paddingHorizontal: 8 }}>
              <MaterialIcons name="add" size={32} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Screen padded={false} onRefresh={load}>
        <View style={s.info}>
          <MaterialIcons name="info-outline" size={22} color={colors.primary} />
          <Text style={s.infoText}>
            Ihre Dolmetscher bekommen Ihre Anfragen per E-Mail. Sie können zusagen.
          </Text>
        </View>
        {loading && list.length === 0 ? (
          <ActivityIndicator style={{ margin: 24 }} size="large" color={colors.primary} />
        ) : error ? (
          <ErrorText message={error} />
        ) : list.length === 0 ? (
          <ErrorText message={'Hier ist noch kein Dolmetscher.\nKlicken Sie oben rechts auf +.'} />
        ) : (
          list.map((d, i) => (
            <View key={d.id}>
              {i > 0 && <Divider />}
              <Pressable style={({ pressed }) => [s.item, pressed && { backgroundColor: colors.field }]} onPress={() => open(d)}>
                <MaterialIcons name="record-voice-over" size={24} color={colors.muted} />
                <View style={{ flex: 1, marginHorizontal: 16 }}>
                  <Text style={s.name}>{d.name}</Text>
                  <Text style={s.sub}>{d.email}</Text>
                  <View style={s.statusRow}>
                    <View style={[s.dot, { backgroundColor: INTERPRETER_STATUS[d.status].color }]} />
                    <Text style={s.sub}>{INTERPRETER_STATUS[d.status].text}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
              </Pressable>
            </View>
          ))
        )}
      </Screen>
    </>
  );
}

const useS = makeStyles((colors) => ({
  info: { flexDirection: 'row', gap: 10, backgroundColor: colors.field, borderRadius: 12, padding: 12, margin: 12 },
  infoText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  name: { fontSize: 16, color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
}));
