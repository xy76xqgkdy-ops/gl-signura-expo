import { Image, View } from 'react-native';

import { makeStyles } from '../lib/theme';

// Rundes Profilbild einer Dolmetscher:in (Data-URL vom Backend).
export function Avatar({ uri, size }: { uri: string; size: number }) {
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}

// Bis zu 3 Bilder leicht übereinander (gebuchte Dolmetscher:innen auf der
// Hauptseite). Ein Bild allein ist so groß wie das Symbol (48), mehrere
// sind kleiner, damit sie in die Zeile passen.
export function AvatarStack({ pictures }: { pictures: string[] }) {
  const s = useS();
  const shown = pictures.slice(0, 3);
  if (shown.length === 1) return <Avatar uri={shown[0]} size={48} />;
  const size = 36;
  const step = 16; // so weit rückt jedes weitere Bild nach rechts
  return (
    <View style={{ width: size + 4 + step * (shown.length - 1), height: 48 }}>
      {shown.map((uri, i) => (
        <View key={i} style={[s.ring, { top: (48 - size - 4) / 2, left: i * step, zIndex: shown.length - i }]}>
          <Avatar uri={uri} size={size} />
        </View>
      ))}
    </View>
  );
}

const useS = makeStyles((colors) => ({
  // Weißer Rand trennt die Bilder voneinander.
  ring: { position: 'absolute', borderRadius: 20, borderWidth: 2, borderColor: colors.surface },
}));
