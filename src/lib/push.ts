import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

// Push-Mitteilungen (Expo-Push → Apple/Google). Das Backend schickt sie bei
// Änderungen an Anfragen (neue Zusage, zurückgezogen …). Im Push steht nur,
// was passiert ist, keine Gesundheitsdaten.
//
//   Einschalten (Benachrichtigungen) → enablePush(): fragt nach der Erlaubnis
//   App-Start (angemeldet)          → syncPush(): ohne Frage, nur wenn erlaubt
//   Ausschalten                     → disablePush()
//   Abmelden                        → nichts: das Backend löscht den Empfänger mit der Sitzung
//
// Braucht eine EAS-Projekt-ID (app.json extra.eas.projectId, `npx eas init`).

// Auch bei offener App oben als Mitteilung zeigen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushResult = 'ok' | 'denied' | 'unsupported';

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function register(): Promise<PushResult> {
  const id = projectId();
  if (Platform.OS === 'web' || !id) return 'unsupported';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Nachrichten',
      // eslint-disable-next-line import/namespace -- gibt es (tsc prüft es), Lint erkennt den Re-Export nicht
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await api.postJson('/me/push-tokens', { kind: 'expo', token: data });
  return 'ok';
}

// Fragt nach der Erlaubnis (nur nach Antippen aufrufen) und meldet das Gerät an.
export async function enablePush(): Promise<PushResult> {
  if (Platform.OS === 'web' || !projectId()) return 'unsupported';
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';
  return register();
}

// Beim Start: Gerät neu anmelden (Token kann sich ändern), ohne zu fragen.
export async function syncPush(notifyPush: boolean): Promise<void> {
  if (!notifyPush || Platform.OS === 'web' || !projectId()) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') await register();
  } catch {
    // Kein Netz o. ä.: beim nächsten Start wieder.
  }
}

export async function disablePush(): Promise<void> {
  await api.deleteJson('/me/push-tokens');
}

// Antippen einer Mitteilung: request_id aus den Daten (oder null).
export function onPushTapped(handler: (requestId: string | null) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const id = res.notification.request.content.data?.request_id;
    handler(typeof id === 'string' ? id : null);
  });
  return () => sub.remove();
}

// Mitteilung angekommen, während die App offen ist.
export function onPushReceived(handler: () => void): () => void {
  const sub = Notifications.addNotificationReceivedListener(() => handler());
  return () => sub.remove();
}
