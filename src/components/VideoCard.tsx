import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';

import { api, errorMessage } from '../lib/api';
import { formatDate, formatTime } from '../lib/dates';
import { makeStyles, useColors } from '../lib/theme';
import { FilledButton } from './ui';

// Video-Termin (gebuchte Anfrage per Video): Knopf "Video starten" ab 15
// Minuten vor dem Termin. Die Video-Seite öffnet sich im Browser (auf dem
// Handy im Standard-Browser, im Web in einem neuen Tab); dort fragt der
// Browser nach Kamera und Mikrofon. Daten: GET /me/requests/{id}/video.
type Video = { url: string; opensAt: Date; state: 'early' | 'open' | 'over' };

export function VideoCard({ requestId }: { requestId: string }) {
  const colors = useColors();
  const s = useS();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    api
      .getJson(`/me/requests/${requestId}/video`)
      .then((j) =>
        setVideo({
          url: String(j.url),
          opensAt: new Date(j.opens_at),
          state: j.state === 'open' || j.state === 'over' ? j.state : 'early',
        }),
      )
      .catch((e) => setError(errorMessage(e)));
    // Uhr weiterlaufen lassen, damit der Knopf pünktlich frei wird.
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, [requestId]);

  if (error) return <Text style={s.error}>{error}</Text>;
  if (!video) return null;

  const open = () => {
    if (Platform.OS === 'web') window.open(video.url, '_blank', 'noopener');
    else Linking.openURL(video.url).catch((e) => setError(errorMessage(e)));
  };
  const ready = video.state !== 'over' && now >= video.opensAt;

  return (
    <View style={s.card}>
      <MaterialIcons name="videocam" size={28} color={colors.primary} />
      <View style={{ flex: 1, gap: 8 }}>
        {video.state === 'over' ? (
          <Text style={s.text}>Das Video-Gespräch ist beendet.</Text>
        ) : ready ? (
          <>
            <Text style={s.text}>Ihr Video-Termin. Das Gespräch dauert höchstens 45 Minuten.</Text>
            <View style={{ alignSelf: 'flex-start' }}>
              <FilledButton icon="videocam" label="Video starten" onPress={open} />
            </View>
          </>
        ) : (
          <Text style={s.text}>
            Das Video startet am {formatDate(video.opensAt)} um {formatTime(video.opensAt)} Uhr. Dann ist hier der Knopf
            „Video starten“.
          </Text>
        )}
      </View>
    </View>
  );
}

const useS = makeStyles((colors) => ({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.field, borderRadius: 12, padding: 12, marginBottom: 16 },
  text: { fontSize: 15, lineHeight: 22, color: colors.text },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
}));
