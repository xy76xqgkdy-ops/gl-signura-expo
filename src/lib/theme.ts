import { Alert, Platform } from 'react-native';

// Farben (angelehnt an Material 3, Grundfarbe Blau).
export const colors = {
  primary: '#3F5F90',
  onPrimary: '#FFFFFF',
  tonal: '#D6E3FF',
  onTonal: '#0F2D53',
  background: '#F9F9FF',
  surface: '#FFFFFF',
  appBar: '#E1E2E8',
  field: 'rgba(225, 226, 232, 0.55)',
  text: '#191C20',
  muted: '#44474E',
  hint: 'rgba(68, 71, 78, 0.6)', // Platzhalter grau, damit man sieht, dass das Feld leer ist
  outline: '#C4C6D0',
  divider: '#E0E2EC',
  error: '#BA1A1A',
  success: '#4CAF50',
  brand: '#2196F3',
};

// Frage mit zwei Knöpfen. Auf dem Handy Alert,
// im Browser window.confirm.
export function confirm(opts: {
  title: string;
  message: string;
  ok: string;
  cancel: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${opts.title}\n\n${opts.message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: opts.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: opts.ok, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
