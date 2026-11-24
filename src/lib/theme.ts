import { Alert, Platform, StyleSheet, useColorScheme } from 'react-native';

// Farben (angelehnt an Material 3, Grundfarbe Blau), hell und dunkel.
// Die App folgt der Einstellung des Systems (app.json: userInterfaceStyle
// "automatic"). In Komponenten:
//
//   const colors = useColors();          // Farben für Inline-Styles
//   const s = useStyles();               // mit const useStyles = makeStyles((c) => ({ … }))
//
// Die Farben nie beim Laden der Datei festhalten (kein StyleSheet.create mit
// Farben außerhalb von makeStyles), sonst wechseln sie nicht mit.
const light = {
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
  disabled: 'rgba(25, 28, 32, 0.12)', // Hintergrund ausgegrauter Knöpfe
  backdrop: 'rgba(0, 0, 0, 0.35)', // hinter Fenstern (Sheet)
};

export type Colors = typeof light;

const dark: Colors = {
  primary: '#A8C8FF',
  onPrimary: '#0A305F',
  tonal: '#26477A',
  onTonal: '#D6E3FF',
  background: '#111318',
  surface: '#1D2024',
  appBar: '#282A2F',
  field: 'rgba(68, 71, 78, 0.55)',
  text: '#E2E2E9',
  muted: '#C4C6D0',
  hint: 'rgba(196, 198, 208, 0.6)',
  outline: '#5C5F67',
  divider: '#33353A',
  error: '#FFB4AB',
  success: '#81C784',
  brand: '#64B5F6',
  disabled: 'rgba(226, 226, 233, 0.12)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

export const lightColors = light;
export const darkColors = dark;

// Farben passend zur Einstellung des Systems (hell/dunkel).
export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

// Stylesheet mit Farben, das hell/dunkel mitwechselt. Je Palette nur einmal
// erzeugt. Aufruf außerhalb der Komponente, Benutzung als Hook:
//   const useStyles = makeStyles((c) => ({ text: { color: c.text } }));
//   function X() { const s = useStyles(); … }
type Styles = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<S extends Styles>(fn: (c: Colors) => S): () => Readonly<S> {
  const cache = new Map<Colors, Readonly<S>>();
  return function useStyles() {
    const c = useColors();
    let styles = cache.get(c);
    if (!styles) {
      styles = StyleSheet.create(fn(c));
      cache.set(c, styles);
    }
    return styles;
  };
}

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
