// Links von außen (Universal Links / App Links) auf Seiten der App umbiegen.
//
// https://gl.signura.de/api/app (Knopf "In der App öffnen" in den E-Mails)
// öffnet die App direkt. Eine Seite /api/app gibt es in der App nicht: Sie
// startet wie nach dem Antippen einer Push-Mitteilung (Anmeldung prüfen,
// dann die Startseite). Alles andere bleibt, wie es ist (z. B. signura://).
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // Pfad ohne Schema, Host, ?… und #… (URL.pathname gibt es in React Native nicht überall).
  const p = path.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '').replace(/[?#].*$/, '');
  return p.replace(/\/+$/, '') === '/api/app' ? '/' : path;
}
