import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href, router } from 'expo-router';
import { Fragment, ReactElement, useEffect } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, View } from 'react-native';

import { confirm, useColors } from '../lib/theme';

// Kopfzeile für Seiten mit Eingaben (Anfrage, Meine Daten):
//
//   oben links:  "<" zurück; nach Änderungen "x" (verwerfen mit Rückfrage)
//   oben rechts: Haken zum Speichern/Senden (SaveHeaderButton)
//
// Mit Änderungen fragen auch die Android-Zurück-Taste und -Geste nach; das
// Wischen zurück (iOS) ist dann gesperrt, damit nichts still verloren geht.

// Zurück; ohne vorige Seite (z. B. nach Neuladen) zur Hauptseite bzw. zu fallback.
export const goBack = (fallback: Href = '/home') => (router.canGoBack() ? router.back() : router.replace(fallback));

// "<" oben links für Seiten ohne Eingaben, die verloren gehen könnten.
export function BackHeaderButton({ fallback, disabled }: { fallback?: Href; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => goBack(fallback)}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Zurück"
      style={{ paddingHorizontal: 8 }}
    >
      <MaterialIcons name={Platform.OS === 'ios' ? 'arrow-back-ios-new' : 'arrow-back'} size={24} color={colors.text} />
    </Pressable>
  );
}

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
        onPress={dirty ? discard : () => goBack()}
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

// Mehrere Knöpfe oben rechts, von links nach rechts. Liefert headerRight und
// unstable_headerRightItems für <Stack.Screen options>.
//
// iOS 26 legt nebeneinanderliegende Knöpfe sonst in eine gemeinsame
// Glas-Fläche; der Abstand dazwischen gibt jedem Knopf seine eigene (wie "<"
// oder "x" links). Android und Web nehmen headerRight (Knöpfe in einer Reihe).
export function headerButtons(buttons: (ReactElement | false | null | undefined)[]) {
  const list = buttons.filter((b): b is ReactElement => !!b);
  return {
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {list.map((b, i) => (
          <Fragment key={i}>{b}</Fragment>
        ))}
      </View>
    ),
    unstable_headerRightItems: () =>
      list.flatMap((element, i) => [
        ...(i > 0 ? [{ type: 'spacing' as const, spacing: 8 }] : []),
        { type: 'custom' as const, element },
      ]),
  };
}

// Papierkorb oben rechts (links vom Haken): löscht nach Rückfrage (onPress).
export function DeleteHeaderButton({
  label,
  hint,
  onPress,
  disabled,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={{ paddingHorizontal: 8, opacity: disabled ? 0.4 : 1 }}
    >
      <MaterialIcons name="delete-outline" size={28} color={colors.error} />
    </Pressable>
  );
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
