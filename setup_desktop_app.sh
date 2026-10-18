#!/usr/bin/env bash
# ====================================================================
# J.A.R.V.I.S. KDE Plasma Desktop Application Integrator
# Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)
# Vytvoří nativní KDE spouštěč (.desktop), ikonu a integraci do menu
# ====================================================================

set -e

APP_DIR="${1:-$HOME/jarvis-core}"
APP_URL="https://ais-dev-wm6htdihxwwnyfh4qad3g4-410492439378.europe-west2.run.app"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

mkdir -p "$ICON_DIR" "$DESKTOP_DIR"

echo -e "\033[0;36m[J.A.R.V.I.S.]\033[0m Instaluji samostatnou aplikaci pro KDE Plasma..."

# 1. Vytvoření futuristické SVG ikony Arc Reaktoru
cat << 'EOF' > "$ICON_DIR/jarvis.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="128" height="128">
  <defs>
    <radialGradient id="arcGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="1" />
      <stop offset="60%" stop-color="#0891b2" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#0e1b33" stop-opacity="0.2" />
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="#060c18" stroke="#06b6d4" stroke-width="2" />
  <circle cx="50" cy="50" r="38" fill="none" stroke="#22d3ee" stroke-width="3" stroke-dasharray="8,4" />
  <circle cx="50" cy="50" r="28" fill="none" stroke="#0891b2" stroke-width="1.5" />
  <circle cx="50" cy="50" r="16" fill="url(#arcGlow)" stroke="#67e8f9" stroke-width="2.5" />
  <circle cx="50" cy="50" r="6" fill="#ffffff" />
</svg>
EOF

# 2. Detekce prohlížeče pro samostatné okno bez adresního řádku (--app mode)
BROWSER_EXEC=""
if command -v google-chrome &>/dev/null; then
    BROWSER_EXEC="google-chrome --app=$APP_URL --name=jarvis"
elif command -v chromium &>/dev/null; then
    BROWSER_EXEC="chromium --app=$APP_URL --name=jarvis"
elif command -v brave-browser &>/dev/null; then
    BROWSER_EXEC="brave-browser --app=$APP_URL --name=jarvis"
elif command -v firefox &>/dev/null; then
    BROWSER_EXEC="firefox --new-window $APP_URL"
else
    BROWSER_EXEC="xdg-open $APP_URL"
fi

# 2. Vytvoření spolehlivého spouštěcího skriptu jarvis-app.sh
cat << 'EOF' > "$APP_DIR/jarvis-app.sh"
#!/usr/bin/env bash
LOCAL_URL="http://localhost:3000"
APP_URL="$LOCAL_URL"

# Pokud neběží lokální server, spusť jej z ~/jarvis-local
if ! curl -s --max-time 1 "$LOCAL_URL" >/dev/null 2>&1; then
    if [ -f "$HOME/jarvis-local/run_local.sh" ]; then
        nohup bash "$HOME/jarvis-local/run_local.sh" >/dev/null 2>&1 &
        sleep 2
    fi
fi

# Zkontroluj a spusť daemona, pokud ještě neběží
if ! curl -s --max-time 1 http://127.0.0.1:9099/health >/dev/null 2>&1; then
    nohup python3 "$HOME/jarvis-local/jarvis_bridge.py" >/dev/null 2>&1 &
fi

# Otevři aplikaci v samostatném okně bez lišt (--app)
if command -v chromium &>/dev/null; then
    exec chromium --app="$APP_URL" --name=jarvis
elif command -v google-chrome &>/dev/null; then
    exec google-chrome --app="$APP_URL" --name=jarvis
elif command -v opera &>/dev/null; then
    exec opera --app="$APP_URL" --name=jarvis
elif command -v brave-browser &>/dev/null; then
    exec brave-browser --app="$APP_URL" --name=jarvis
else
    exec xdg-open "$APP_URL"
fi
EOF

chmod +x "$APP_DIR/jarvis-app.sh"

# 3. Vytvoření .desktop souboru pro KDE Plasma
cat << EOF > "$DESKTOP_DIR/jarvis.desktop"
[Desktop Entry]
Name=J.A.R.V.I.S.
GenericName=AI Assistant & System Core
Comment=Autonomní AI asistent a systémové řízení pro Fedora Linux
Exec=$APP_DIR/jarvis-app.sh
Icon=$ICON_DIR/jarvis.svg
Terminal=false
Type=Application
Categories=Utility;System;Development;
StartupNotify=false
EOF

chmod +x "$DESKTOP_DIR/jarvis.desktop"
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo -e "\033[0;32m[HOTOVO]\033[0m Samostatná aplikace J.A.R.V.I.S. byla integrována do KDE Plasma!"
echo -e "Nyní ji najdete v \033[1;36mKDE Menu (Aplikace) -> Nástroje -> J.A.R.V.I.S.\033[0m"
echo -e "nebo vyhledejte 'jarvis' v KRunneru (Alt + Space)."
