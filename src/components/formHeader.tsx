import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable } from 'react-native';

import { confirm, useColors } from '../lib/theme';

// Kopfzeile für Seiten mit Eingaben (Anfrage, Meine Daten):
//
//   oben links:  "<" zurück; nach Änderungen "x" (verwerfen mit Rückfrage)
//   oben rechts: Haken zum Speichern/Senden (SaveHeaderButton)
//
// Mit Änderungen fragen auch die Android-Zurück-Taste und -Geste nach; das
// Wischen zurück (iOS) ist dann gesperrt, damit nichts still verloren geht.

// Zurück; ohne vorige Seite (z. B. nach Neuladen) zur Hauptseite.
export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

// Liefert headerLeft und gestureEnabled für <Stack.Screen options>.
export function useDiscardGuard({ dirty, loading, message }: { dirty: boolean; loading: boolean; message: string }) {
  const colors = useColors();

  async function discard() {
    const ok = await confirm({
      title: 'Änderungen verwerfen?',
      message,
      ok: 'Verwerfen',
      cancel: 'Weiter bearbeiten',
      destructive: true,
    });
    if (ok) goBack();
  }

  useEffect(() => {
    if (Platform.OS !== 'android' || !dirty || loading) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      discard();
      return true; // nicht selbst zurück; discard() entscheidet
    });
    return () => sub.remove();
  });

  return {
    headerLeft: () => (
      <Pressable
        onPress={dirty ? discard : goBack}
        disabled={loading}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={dirty ? 'Änderungen verwerfen' : 'Zurück'}
        style={{ paddingHorizontal: 8 }}
      >
        <MaterialIcons
          name={dirty ? 'close' : Platform.OS === 'ios' ? 'arrow-back-ios-new' : 'arrow-back'}
          size={dirty ? 30 : 24}
          color={colors.text}
        />
      </Pressable>
    ),
    gestureEnabled: !dirty,
  };
}

// Haken oben rechts: grün, wenn gespeichert werden kann; grau und blass ohne Änderung
// oder bei fehlenden Angaben (disabled = !canSave || !dirty); beim Speichern Ladekreis.
export function SaveHeaderButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  const colors = useColors();
  if (loading) return <ActivityIndicator color={colors.text} style={{ paddingHorizontal: 8 }} />;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ paddingHorizontal: 8, opacity: disabled ? 0.4 : 1 }}
    >
      <MaterialIcons name="check" size={32} color={disabled ? colors.muted : colors.success} />
    </Pressable>
  );
}
