#!/usr/bin/env bash
# ====================================================================
# J.A.R.V.I.S. 100% Local PC Launcher
# Spustí celou aplikaci (Frontend, Backend i Bridge) přímo na vašem PC!
# Běží na: http://localhost:3000
# ====================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "\033[0;36m[J.A.R.V.I.S.]\033[0m Spouštím aplikaci 100% lokálně na vašem PC..."

# 1. Kontrola Node.js a NPM
if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    echo -e "\033[0;33m[INSTALACE]\033[0m Node.js není nainstalován. Instaluji přes DNF..."
    sudo dnf install -y nodejs npm
fi

# 2. Instalace závislostí
if [ ! -d "node_modules" ]; then
    echo -e "\033[0;36m[NPM]\033[0m Instaluji balíčky projektu..."
    npm install --legacy-peer-deps
fi

# 3. Spuštění lokálního Python daemona (port 9099)
if ! curl -s --max-time 1 http://127.0.0.1:9099/health >/dev/null 2>&1; then
    echo -e "\033[0;36m[DAEMON]\033[0m Startuji systémový bridge na portu 9099..."
    nohup python3 jarvis_bridge.py > /dev/null 2>&1 &
    sleep 1
fi

# 4. Spuštění lokálního Full-Stack serveru na portu 3000
echo -e "\033[0;32m[SERVER]\033[0m Startuji lokální J.A.R.V.I.S. server (port 3000)..."
nohup npm run dev > /tmp/jarvis_server.log 2>&1 &

# Počkej na nastartování serveru
echo -e "Čekám na spuštění rozhraní..."
for i in {1..20}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "\033[0;32m✓ Server běží na http://localhost:3000!\033[0m"
        break
    fi
    sleep 0.5
done

# 5. Otevření v samostatném okně aplikace
echo -e "\033[0;36m[UI]\033[0m Otevírám samostatné okno J.A.R.V.I.S.e..."
if command -v chromium &>/dev/null; then
    exec chromium --app="http://localhost:3000" --name=jarvis
elif command -v google-chrome &>/dev/null; then
    exec google-chrome --app="http://localhost:3000" --name=jarvis
elif command -v brave-browser &>/dev/null; then
    exec brave-browser --app="http://localhost:3000" --name=jarvis
elif command -v opera &>/dev/null; then
    exec opera --app="http://localhost:3000" --name=jarvis
else
    exec xdg-open "http://localhost:3000"
fi
