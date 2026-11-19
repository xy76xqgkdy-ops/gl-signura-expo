// Übergabe von Daten zwischen Seiten (statt Navigator.push/pop-Rückgabewerten
// in Flutter): eine Seite legt etwas ab, die andere holt es beim Öffnen bzw.
// beim Zurückkommen ab.
//
//   'request'          Anfrage, die das Formular öffnen soll
//   'location'         Ort, den das Ort-Formular öffnen soll
//   'location:created' neu gespeicherter Ort (für das Anfrage-Formular)
const store = new Map<string, unknown>();

export function put(key: string, value: unknown) {
  store.set(key, value);
}

export function peek<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function take<T>(key: string): T | undefined {
  const v = store.get(key) as T | undefined;
  store.delete(key);
  return v;
}
