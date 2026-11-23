#!/usr/bin/env bash
# Baut die Web-Fassung der Expo-App und lädt sie auf gl.signura.de (signura-web) hoch.
# Dateien auf dem Server, die nicht mehr im Build sind, werden gelöscht.
#
#   ./deploy.sh
#
# nginx auf signura-web leitet unbekannte Pfade (z. B. /login) auf index.html
# um (try_files … /index.html), damit Neuladen auf jeder Seite geht.
set -euo pipefail

SERVER="${SIGNURA_SERVER:-root@167.233.242.200}"
REMOTE_DIR="/var/www/html"
URL="https://gl.signura.de"

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
	npm install
fi

echo "→ baue Web-App …"
rm -rf dist
npx expo export --platform web
# Seite ist deutsch (Vorlage von Expo setzt lang="en").
sed -i '' 's/<html lang="en">/<html lang="de">/' dist/index.html

echo "→ lade nach $SERVER:$REMOTE_DIR …"
rsync -a --delete --chmod=Da+rx,Fa+r dist/ "$SERVER:$REMOTE_DIR/"

echo "→ prüfe $URL …"
status=$(curl -s -o /dev/null -w '%{http_code}' "$URL/")
login=$(curl -s -o /dev/null -w '%{http_code}' "$URL/login")
api=$(curl -s "$URL/api/health" || true)
if [ "$status" != "200" ] || [ "$login" != "200" ]; then
	echo "FEHLER: $URL antwortet mit HTTP $status, /login mit HTTP $login" >&2
	exit 1
fi
echo "✓ Seite: HTTP $status (/login: $login)"
echo "✓ API:   ${api:-keine Antwort}"
echo "Fertig. Im Browser ggf. mit Cmd+Shift+R neu laden."
