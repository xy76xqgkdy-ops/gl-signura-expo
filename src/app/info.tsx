import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';
import { Linking, Platform, Pressable, Text, View } from 'react-native';

import { Card, Divider, Screen, SignuraHeader } from '../components/ui';
import { openPrivacy } from '../lib/consent';
import { formatDate, formatTime } from '../lib/dates';
import { makeStyles, useColors } from '../lib/theme';

const IMPRINT_URL = 'https://gl.signura.de/impressum';

// Version mit Build-Nummer, z. B. "1.0.0 (Build 7)". Die Build-Nummer zählt EAS
// bei jedem Build selbst hoch (eas.json: autoIncrement, Stand bei expo.dev).
// In Expo Go und im Browser gibt es keinen eigenen Build.
function appVersion(): string {
  const version = Constants.expoConfig?.version ?? '–';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return `${version} (Expo Go)`;
  const build = Application.nativeBuildVersion;
  return build ? `${Application.nativeApplicationVersion ?? version} (Build ${build})` : version;
}

// Info: Version und Stand der App (Build oder EAS Update), Gerät, Links zu
// Datenschutz und Impressum. Zeigt z. B., ob ein EAS Update angekommen ist.
export default function InfoScreen() {
  const colors = useColors();
  const s = useS();

  const platform = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
  const stamp = (d: Date) => `${formatDate(d)}, ${formatTime(d)} Uhr`;

  // Ohne expo-updates (Entwicklung, Browser) gibt es keinen Stand.
  const rows: [string, string][] = [
    ['Version', appVersion()],
    [
      'Stand',
      !Updates.isEnabled
        ? 'Entwicklungs-Version'
        : Updates.isEmbeddedLaunch
          ? `aus dem Build${Updates.createdAt ? ` vom ${stamp(Updates.createdAt)}` : ''}`
          : `Update${Updates.createdAt ? ` vom ${stamp(Updates.createdAt)}` : ''}`,
    ],
    ...(Updates.isEnabled
      ? ([
          ['Kanal', Updates.channel || '–'],
          ['Runtime', Updates.runtimeVersion || '–'],
          ['Update-ID', Updates.updateId ? Updates.updateId.slice(0, 8) : '–'],
        ] as [string, string][])
      : []),
    ['System', `${platform} ${Platform.Version}`],
  ];

  return (
    <Screen>
      <SignuraHeader />
      <Card>
        {rows.map(([label, value], i) => (
          <View key={label}>
            {i > 0 && <Divider />}
            <View style={s.row}>
              <Text style={s.label}>{label}</Text>
              <Text style={s.value} selectable>
                {value}
              </Text>
            </View>
          </View>
        ))}
      </Card>
      <View style={{ height: 16 }} />
      <Card>
        <Pressable style={s.link} accessibilityRole="link" onPress={openPrivacy}>
          <MaterialIcons name="privacy-tip" size={22} color={colors.primary} />
          <Text style={s.linkText}>Datenschutzerklärung</Text>
        </Pressable>
        <Divider />
        <Pressable style={s.link} accessibilityRole="link" onPress={() => Linking.openURL(IMPRINT_URL).catch(() => {})}>
          <MaterialIcons name="info-outline" size={22} color={colors.primary} />
          <Text style={s.linkText}>Impressum</Text>
        </Pressable>
      </Card>
      {/* Die App schreibt einfach "Dolmetscher", "Vermittler" (leichter zu lesen). */}
      <Text style={s.note}>Wir schreiben „Dolmetscher“ und „Vermittler“. Gemeint sind alle Geschlechter.</Text>
    </Screen>
  );
}

const useS = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  label: { fontSize: 15, color: colors.muted, width: 90 },
  value: { flex: 1, fontSize: 15, color: colors.text, textAlign: 'right' },
  link: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  linkText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
  note: { marginTop: 24, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
}));
