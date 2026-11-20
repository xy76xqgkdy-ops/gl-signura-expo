import { Linking, Platform } from 'react-native';

// Route zu einer Adresse in der Karten-App des Handys öffnen. Start ist
// immer der aktuelle Ort; die Karten-App fragt selbst nach dem Standort,
// diese App braucht dafür keine Erlaubnis.
//
//   Android  geo:-Link → Standard-Karten-App (Google Maps, Waze, …) oder Auswahl
//   iPhone   Apple-Karten-Link mit Route; in der EU leitet iOS ihn an die
//            eingestellte Standard-App für Navigation weiter (ab iOS 18.4)
//   Browser  Apple-Geräte: Apple-Karten-Link, sonst Google Maps im neuen Tab
export async function openRoute(address: string) {
  const q = encodeURIComponent(address);
  const apple = `https://maps.apple.com/?daddr=${q}&dirflg=d`;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${q}`;

  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(`geo:0,0?q=${q}`);
    } catch {
      await Linking.openURL(google); // keine Karten-App installiert → Browser
    }
    return;
  }
  if (Platform.OS === 'ios') {
    await Linking.openURL(apple);
    return;
  }
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const appleDevice = /iPhone|iPad|iPod|Macintosh/.test(ua); // wie in der Flutter-App: auch Mac
  window.open(appleDevice ? apple : google, '_blank', 'noopener');
}
