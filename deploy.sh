#!/usr/bin/env bash
# Die Web-Fassung der App wird nicht mehr veröffentlicht (seit 23.11.2026).
# Signura gibt es nur als App für iPhone und Android. Auf gl.signura.de
# liegt jetzt die Werbeseite aus ../website (veröffentlichen: ../website/deploy.sh).
#
# Lokal im Browser testen geht weiter: npx expo start --web --port 5173
echo "Die Web-App wird nicht mehr veröffentlicht." >&2
echo "Werbeseite veröffentlichen: ../website/deploy.sh" >&2
exit 1
