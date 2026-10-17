#!/usr/bin/env bash
# ====================================================================
# J.A.R.V.I.S. Automated System & Environment Installer
# Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)
# Hardware: AMD Ryzen 5 5600GT (12T) | 32 GB RAM | AMD Radeon RX 7600
# ====================================================================

set -e

CYAN='\033[0;36m'
GOLD='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear
echo -e "${CYAN}${BOLD}"
echo "  ╔════════════════════════════════════════════════════════════════╗"
echo "  ║        J.A.R.V.I.S.  //  SYSTEM & WORKSPACE INSTALLER        ║"
echo "  ║           Fedora Linux 44 KDE Plasma (Wayland Session)         ║"
echo "  ╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

TARGET_DIR="${1:-$HOME/jarvis-core}"
echo -e "${GOLD}● Cílový adresář instalace:${NC} ${BOLD}${TARGET_DIR}${NC}\n"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# 1. Kontrola distribuce Fedora
echo -e "${CYAN}[1/7] Ověřování systémového prostředí Fedora...${NC}"
if [ -f /etc/fedora-release ]; then
    FEDORA_VER=$(cat /etc/fedora-release)
    echo -e "${GREEN}  ✓ Detekováno:${NC} $FEDORA_VER"
else
    echo -e "${GOLD}  ! Upozornění:${NC} Nebyla detekována Fedora, pokračuji v instalaci..."
fi

# 2. Vytvoření přehledné adresářové struktury
echo -e "\n${CYAN}[2/7] Vytváření přehledné struktury složek...${NC}"
mkdir -p core agents gpu voice git config systemd logs
touch core/__init__.py agents/__init__.py gpu/__init__.py voice/__init__.py git/__init__.py config/__init__.py

echo -e "${GREEN}  ✓ Složky úspěšně vytvořeny:${NC}"
echo "    ├── core/        (hlavní orchestrátor a asyncio smyčka)"
echo "    ├── agents/      (správa systému Fedora a CrewAI agenti)"
echo "    ├── gpu/         (ROCm akcelerace pro Radeon RX 7600 a Ollama)"
echo "    ├── voice/       (hlasové rozhraní STT a TTS)"
echo "    ├── git/         (automatická záloha a synchronizace na GitHub)"
echo "    ├── config/      (nastavení prostředí a cest)"
echo "    ├── systemd/     (uživatelské služby a časovače)"
echo "    └── logs/        (záznamy běhu a chybové protokoly)"

# 3. Instalace balíčků Fedora přes DNF
echo -e "\n${CYAN}[3/7] Kontrola systémových balíčků DNF...${NC}"
PACKAGES="python3 python3-pip python3-virtualenv git gh libnotify"
if command -v dnf &>/dev/null; then
    echo -e "  Spouštím instalaci závislostí (${PACKAGES})..."
    sudo dnf install -y $PACKAGES || true
else
    echo -e "${GOLD}  ! DNF nenalezen, přeskakuji instalaci balíčků.${NC}"
fi

# 4. Příprava virtuálního prostředí Pythonu (.venv)
echo -e "\n${CYAN}[4/7] Inicializace virtuálního prostředí Python (.venv)...${NC}"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "${GREEN}  ✓ Virtuální prostředí .venv bylo vytvořeno.${NC}"
else
    echo -e "${GREEN}  ✓ Virtuální prostředí .venv již existuje.${NC}"
fi

source .venv/bin/activate
pip install --upgrade pip setuptools wheel >/dev/null 2>&1

# 5. Vygenerování a instalace requirements.txt
echo -e "\n${CYAN}[5/7] Instalace Python závislostí (google-genai, langchain, crewai)...${NC}"
cat << 'EOF' > requirements.txt
google-genai>=2.4.0
langchain>=0.3.0
langchain-google-genai>=2.0.0
crewai>=0.86.0
pydantic>=2.10.0
rich>=13.9.0
httpx>=0.28.0
psutil>=6.1.0
EOF

pip install -r requirements.txt || true
echo -e "${GREEN}  ✓ Python knihovny nainstalovány.${NC}"

# 6. Vygenerování spouštěcích a konfiguračních skriptů
echo -e "\n${CYAN}[6/7] Generování spouštěčů (run.sh, .env, .gitignore)...${NC}"

# .env.example
cat << 'EOF' > .env.example
GEMINI_API_KEY=your_gemini_api_key_here
JARVIS_HOST=127.0.0.1
JARVIS_PORT=9099
ROCM_GFX_VERSION=11.0.0
HSA_OVERRIDE_GFX_VERSION=11.0.0
EOF

if [ ! -f ".env" ]; then
    cp .env.example .env
fi

# .gitignore
cat << 'EOF' > .gitignore
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
.env
logs/*.log
*.pid
dist/
EOF

# run.sh
cat << 'EOF' > run.sh
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

echo -e "\033[0;36m[J.A.R.V.I.S.]\033[0m Spouštím systémového daemona na portu 9099..."
python3 jarvis_bridge.py
EOF
chmod +x run.sh

# 7. Registrace do systemd (volitelné pro uživatele)
echo -e "\n${CYAN}[7/7] Příprava systemd uživatelské služby...${NC}"
mkdir -p ~/.config/systemd/user

cat << EOF > ~/.config/systemd/user/jarvis-bridge.service
[Unit]
Description=J.A.R.V.I.S. Local System Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=${TARGET_DIR}
ExecStart=${TARGET_DIR}/.venv/bin/python3 ${TARGET_DIR}/jarvis_bridge.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload || true
echo -e "${GREEN}  ✓ Systemd jednotka ~/.config/systemd/user/jarvis-bridge.service je připravena.${NC}"

echo -e "\n${GREEN}${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  J.A.R.V.I.S. byl úspěšně nainstalován a nakonfigurován!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo -e "\n${BOLD}Rychlé spuštění:${NC}"
echo -e "  cd ${TARGET_DIR}"
echo -e "  ${CYAN}./run.sh${NC}                  (spustí lokálního daemona)"
echo -e "  nebo:"
echo -e "  ${CYAN}systemctl --user start jarvis-bridge.service${NC}  (spustí službu na pozadí)"
echo ""
