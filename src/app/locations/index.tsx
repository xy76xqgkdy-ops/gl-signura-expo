import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Divider, ErrorText, Screen } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { put } from '../../lib/handoff';
import { LocationData, locationAddress, parseLocation } from '../../lib/models';
import { colors } from '../../lib/theme';

// Eigene Orte (GET /me/locations): oben suchen (Name, Straße, PLZ, Ort),
// antippen zum Ändern oder Löschen, "+" für einen neuen.
export default function LocationListScreen() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const shown = q ? locations.filter((l) => `${l.name} ${locationAddress(l)}`.toLowerCase().includes(q)) : locations;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getJsonList('/me/locations');
      setLocations(list.map(parseLocation));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Beim Öffnen und nach dem Speichern/Löschen eines Orts neu laden.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = (l?: LocationData) => {
    put('location', l);
    router.push({ pathname: '/locations/form', params: l ? { id: l.id } : {} });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => open()} hitSlop={10} accessibilityLabel="Neuer Ort" style={{ paddingHorizontal: 8 }}>
              <MaterialIcons name="add" size={32} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Screen padded={false} onRefresh={load}>
        {/* Suchfeld: filtert die Liste beim Tippen. */}
        {locations.length > 0 && (
          <View style={s.search}>
            <MaterialIcons name="search" size={22} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Ort suchen"
              placeholderTextColor={colors.hint}
              autoCorrect={false}
              style={s.searchInput}
            />
            {search !== '' && (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Suche löschen">
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            )}
          </View>
        )}
        {loading && locations.length === 0 ? (
          <ActivityIndicator style={{ margin: 24 }} size="large" color={colors.primary} />
        ) : error ? (
          <ErrorText message={error} />
        ) : locations.length === 0 ? (
          <ErrorText message="Sie haben noch keine Orte gespeichert. Tippen Sie auf +." />
        ) : shown.length === 0 ? (
          <ErrorText message="Kein Ort gefunden." />
        ) : (
          shown.map((l, i) => (
            <View key={l.id}>
              {i > 0 && <Divider />}
              <Pressable style={({ pressed }) => [s.item, pressed && { backgroundColor: colors.field }]} onPress={() => open(l)}>
                <MaterialIcons name="place" size={24} color={colors.muted} />
                <View style={{ flex: 1, marginHorizontal: 16 }}>
                  <Text style={s.name}>{l.name}</Text>
                  <Text style={s.address}>{locationAddress(l)}</Text>
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

const s = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.field,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 12,
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12, marginHorizontal: 8, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  name: { fontSize: 16, color: colors.text },
  address: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
