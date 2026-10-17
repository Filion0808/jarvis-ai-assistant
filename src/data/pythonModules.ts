import { PythonModule } from '../types/jarvis';

export const INITIAL_PYTHON_MODULES: PythonModule[] = [
  {
    id: 'pc-bridge',
    filename: 'jarvis_bridge.py',
    category: 'agents',
    description: 'Lokální daemon pro přímé ovládání vašeho PC (otevírání terminálu Konsole, správce souborů Dolphin, ovládání KDE Plasma Wayland).',
    dependencies: ['http.server', 'subprocess', 'json', 'shutil'],
    code: `"""
J.A.R.V.I.S. Local System Daemon
Přímé spouštění aplikací na Fedora Linux 44 (KDE Plasma 6.7.5 Wayland)
Běží na: http://127.0.0.1:9099
Spuštění: python3 jarvis_bridge.py
"""

import sys
import os
import json
import subprocess
import shutil
from http.server import HTTPServer, BaseHTTPRequestHandler

HOST = "127.0.0.1"
PORT = 9099

def detect_terminal():
    for t in ["konsole", "ptyxis", "alacritty", "x-terminal-emulator"]:
        if shutil.which(t):
            return t
    return "konsole"

class BridgeHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._cors()

    def do_GET(self):
        if self.path in ["/health", "/status"]:
            self._cors()
            self.wfile.write(json.dumps({
                "status": "online",
                "host": "Fedora Linux 44",
                "desktop": "KDE Plasma 6.7.5 (Wayland)",
                "terminal": detect_terminal()
            }).encode())

    def do_POST(self):
        if self.path == "/execute":
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length).decode() or "{}")
            action = payload.get("action", "")
            cmd = payload.get("command", "")
            
            if action == "open_terminal" or not cmd:
                cmd = f"{detect_terminal()} &"
                
            print(f"[J.A.R.V.I.S.] Spouštím na PC: {cmd}")
            proc = subprocess.Popen(cmd, shell=True, start_new_session=True)
            
            self._cors()
            self.wfile.write(json.dumps({
                "success": True,
                "pid": proc.pid,
                "command": cmd,
                "message": f"Terminál/Aplikace byla úspěšně otevřena na vašem PC (PID: {proc.pid})."
            }).encode())

if __name__ == "__main__":
    print(f"[J.A.R.V.I.S. DAEMON] Připraven na http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), BridgeHandler).serve_forever()
`,
  },
  {
    id: 'git-sync',
    filename: 'git/github_sync.py',
    category: 'config',
    description: 'Automatická synchronizace a záloha všech souborů na GitHub (Git CLI, GitHub API a systemd timer).',
    dependencies: ['subprocess', 'os', 'pathlib', 'json', 'datetime'],
    code: `"""
====================================================================
J.A.R.V.I.S. GitHub Synchronization & Backup Agent
Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)
Automatické ukládání a verzování zdrojových souborů na GitHub
====================================================================
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

PROJECT_ROOT = Path(__file__).resolve().parent.parent

class JarvisGitHubManager:
    def __init__(self, repo_url: str = "", branch: str = "main"):
        self.repo_url = repo_url
        self.branch = branch

    def verify_git_installed(self) -> bool:
        return shutil.which("git") is not None

    def initialize_repository(self, remote_url: str) -> Dict[str, Any]:
        """Inicializace lokálního Git repozitáře a nastavení remote origin."""
        if not self.verify_git_installed():
            return {"success": False, "error": "Git není nainstalován. Spusťte: sudo dnf install git -y"}

        try:
            # 1. git init pokud neexistuje
            if not (PROJECT_ROOT / ".git").exists():
                subprocess.run(["git", "init"], cwd=PROJECT_ROOT, check=True)
                subprocess.run(["git", "branch", "-M", self.branch], cwd=PROJECT_ROOT, check=True)

            # 2. Nastavení remote origin
            remotes = subprocess.check_output(["git", "remote"], cwd=PROJECT_ROOT, text=True).split()
            if "origin" in remotes:
                subprocess.run(["git", "remote", "set-url", "origin", remote_url], cwd=PROJECT_ROOT, check=True)
            else:
                subprocess.run(["git", "remote", "add", "origin", remote_url], cwd=PROJECT_ROOT, check=True)

            return {"success": True, "message": f"Git repozitář propojen s: {remote_url}"}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": str(e)}

    def commit_and_push(self, message: str = "") -> Dict[str, Any]:
        """Zálohování a push všech aktuálních souborů na GitHub."""
        if not message:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            message = f"J.A.R.V.I.S. automatická záloha: {timestamp}"

        try:
            subprocess.run(["git", "add", "."], cwd=PROJECT_ROOT, check=True)
            
            # Kontrola zda jsou změny
            status = subprocess.check_output(["git", "status", "--porcelain"], cwd=PROJECT_ROOT, text=True).strip()
            if not status:
                return {"success": True, "message": "Žádné nové změny k uložení na GitHub."}

            subprocess.run(["git", "commit", "-m", message], cwd=PROJECT_ROOT, check=True)
            subprocess.run(["git", "push", "-u", "origin", self.branch], cwd=PROJECT_ROOT, check=True)
            
            return {"success": True, "message": f"Soubory úspěšně uloženy a odeslány na GitHub (Commit: {message})"}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": f"Chyba při odesílání na GitHub: {e}"}

    def generate_systemd_timer(self) -> str:
        """Vygeneruje konfiguraci pro automatické denní zálohování přes systemd."""
        return """# /etc/systemd/user/jarvis-backup.service
[Unit]
Description=J.A.R.V.I.S. GitHub Daily Backup

[Service]
Type=oneshot
WorkingDirectory=%h/jarvis
ExecStart=/usr/bin/python3 %h/jarvis/git/github_sync.py --auto

# /etc/systemd/user/jarvis-backup.timer
[Unit]
Description=Spouští zálohu na GitHub každý den ve 22:00

[Timer]
OnCalendar=*-*-* 22:00:00
Persistent=true

[Install]
WantedBy=timers.target
"""

if __name__ == "__main__":
    manager = JarvisGitHubManager()
    if "--auto" in sys.argv:
        print("[J.A.R.V.I.S. GITHUB] Provádím plánovanou zálohu...")
        res = manager.commit_and_push()
        print(res)
    else:
        print("[J.A.R.V.I.S. GITHUB] Modul připraven. Použijte: python3 github_sync.py --auto")
`,
  },
  {
    id: 'core-main',
    filename: 'core/jarvis_main.py',
    category: 'core',
    description: 'Hlavní asynchronní smyčka asistenta J.A.R.V.I.S., správa stavu, integrace google-genai a dispečink událostí.',
    dependencies: ['google-genai', 'asyncio', 'pydantic', 'rich'],
    code: `"""
J.A.R.V.I.S. Core Orchestrator
Target: Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)
Hardware: AMD Ryzen 5 5600GT | 32 GB RAM | AMD Radeon RX 7600
"""

import asyncio
import os
import sys
from typing import Optional, List, Dict, Any
from google import genai
from google.genai import types
from rich.console import Console

console = Console()

class JarvisCore:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            console.print("[bold red]Varování:[/bold red] GEMINI_API_KEY není nastavena v proměnných prostředí.")
        
        # Inicializace moderního google-genai SDK klienta
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-2.5-flash"  # nebo gemini-3.8-flash dle dostupnosti
        
        self.system_prompt = (
            "Jsi J.A.R.V.I.S., pokročilý osobní AI asistent tvůrce (Filip).\\n"
            "Běžíš v prostředí Fedora Linux 44 (KDE Plasma 6.7.5, Wayland), "
            "AMD Ryzen 5 5600GT (12 vláken), 32 GB RAM, AMD Radeon RX 7600 (8 GB VRAM).\\n"
            "Vystupuj loajálně, s precizní britskou elegancí a lehkým suchým humorem. "
            "Při generování bash příkazů pro Fedoru a Python kódu dbej na maximální přesnost a bezpečnost."
        )
        
        self.history: List[Dict[str, Any]] = []
        console.print("[cyan]J.A.R.V.I.S. jádro inicializováno. Všechny subsystémy nominální, pane.[/cyan]")

    async def query(self, prompt: str) -> str:
        """Odeslání dotazu do modelu s asynchronním zpracováním."""
        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    temperature=0.7,
                )
            )
            return response.text or "Žádná odpověď z neuronové sítě."
        except Exception as e:
            console.print(f"[bold red]Chyba komunikace jádra:[/bold red] {e}")
            return f"Omlouvám se, pane. Došlo k chybě v komunikačním kanálu: {e}"

    async def run_interactive_loop(self):
        """Konzolová interaktivní smyčka pro vývojáře."""
        console.print("[bold green]=== J.A.R.V.I.S. ONLINE (Fedora 44 / KDE Plasma) ===[/bold green]")
        while True:
            try:
                user_input = input("\\nPane > ").strip()
                if not user_input:
                    continue
                if user_input.lower() in ("exit", "quit", "konec"):
                    console.print("[cyan]Ukládám stav a odpojuji subsystémy. Na shledanou, pane.[/cyan]")
                    break

                response = await self.query(user_input)
                console.print(f"[cyan]\\nJ.A.R.V.I.S.:[/cyan]\\n{response}")
            except KeyboardInterrupt:
                console.print("\\n[yellow]Přerušení uživatelem. Ukončuji relaci.[/yellow]")
                break

if __name__ == "__main__":
    jarvis = JarvisCore()
    asyncio.run(jarvis.run_interactive_loop())
`,
  },
  {
    id: 'agents-system',
    filename: 'agents/system_agent.py',
    category: 'agents',
    description: 'Modul pro správu Fedora Linuxu 44, bezpečné spouštění příkazů, parsování logů journalctl a KDE notifikace.',
    dependencies: ['subprocess', 'asyncio', 're', 'dataclasses'],
    code: `"""
J.A.R.V.I.S. System Administrator Agent
Specializace: Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)
Správa procesů, čtení logů journalctl a integrace s KDE Plasma.
"""

import asyncio
import subprocess
import shutil
from dataclasses import dataclass
from typing import List, Optional, Tuple

@dataclass
class CommandResult:
    command: str
    returncode: int
    stdout: str
    stderr: str
    success: bool

class FedoraSystemAgent:
    """Agent specializovaný na správu a diagnostiku systému Fedora 44."""
    
    # Whitelist bezpečných příkazů pro bezdotykové spuštění
    SAFE_COMMAND_PREFIXES = (
        "fastfetch", "uname", "uptime", "free", "df -h", "inxi", 
        "rocm-smi", "radeontop", "journalctl -p 3 -xb", "systemctl status",
        "dnf check-update", "pipewire --version", "kscreen-doctor -o", "qdbus6"
    )

    def is_safe_command(self, cmd: str) -> bool:
        cmd_clean = cmd.strip()
        return any(cmd_clean.startswith(prefix) for prefix in self.SAFE_COMMAND_PREFIXES)

    async def execute_command(self, cmd: str, require_safe: bool = True) -> CommandResult:
        """Asynchronní spuštění příkazu v shellu s bezpečnostní kontrolou."""
        if require_safe and not self.is_safe_command(cmd):
            return CommandResult(
                command=cmd,
                returncode=-1,
                stdout="",
                stderr="Příkaz vyžaduje explicitní autorizaci uživatele (není na whitelistu bezpečných příkazů).",
                success=False
            )

        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout_bytes, stderr_bytes = await process.communicate()
        
        return CommandResult(
            command=cmd,
            returncode=process.returncode or 0,
            stdout=stdout_bytes.decode('utf-8', errors='replace').strip(),
            stderr=stderr_bytes.decode('utf-8', errors='replace').strip(),
            success=(process.returncode == 0)
        )

    async def read_system_errors(self, lines: int = 20) -> List[str]:
        """Čtení kritických chyb ze systemd journalu (priorita err a vyšší)."""
        cmd = f"journalctl -p 3 -xb -n {lines} --no-pager"
        res = await self.execute_command(cmd, require_safe=False)
        if res.success and res.stdout:
            return res.stdout.splitlines()
        return [res.stderr or "Žádné kritické chyby v journalctl."]

    async def send_kde_notification(self, title: str, body: str, urgency: str = "normal") -> bool:
        """Odeslání systémové notifikace na plochu KDE Plasma přes notify-send."""
        if not shutil.which("notify-send"):
            return False
        cmd = f'notify-send -u {urgency} -a "J.A.R.V.I.S." "{title}" "{body}"'
        res = await self.execute_command(cmd, require_safe=False)
        return res.success

    async def get_hardware_telemetry(self) -> dict:
        """Získání reálného stavu CPU Ryzen 5600GT, RAM a Radeon RX 7600."""
        mem_res = await self.execute_command("free -m", require_safe=False)
        load_res = await self.execute_command("cat /proc/loadavg", require_safe=False)
        
        return {
            "memory_raw": mem_res.stdout,
            "load_average": load_res.stdout,
            "gpu_detected": "AMD Radeon RX 7600 (Navi 33)"
        }
`,
  },
  {
    id: 'agents-crew',
    filename: 'agents/crew_manager.py',
    category: 'agents',
    description: 'Multi-agentní orchestrace s CrewAI a LangChain: Specializované role pro kódování, audit Fedora systému a výzkum.',
    dependencies: ['crewai', 'langchain', 'langchain-google-genai'],
    code: `"""
J.A.R.V.I.S. Multi-Agent Crew
Knihovny: CrewAI, LangChain, google-genai
"""

from crewai import Agent, Crew, Process, Task
from langchain_google_genai import ChatGoogleGenerativeAI
import os

def create_jarvis_crew():
    # LLM konfigurace pro agenty (využívá Google Gemini)
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.4
    )

    # 1. Agent: Architekt zdrojového kódu (Python Core Developer)
    software_architect = Agent(
        role="Lead Python Architect for JARVIS",
        goal="Vylepšovat, optimalizovat a refaktorovat vlastní Python kód asistenta J.A.R.V.I.S.",
        backstory=(
            "Jsi elitní Python inženýr v týmu Tonyho Starka. Specializuješ se na asyncio, "
            "čistou architekturu, typové anotace v Pydantic a minimalizaci paměťových nároků."
        ),
        verbose=True,
        llm=llm
    )

    # 2. Agent: Systémový administrátor Fedora 44 & KDE Wayland
    sysadmin_agent = Agent(
        role="Fedora Linux & KDE Plasma Operations Specialist",
        goal="Poskytovat bezpečné, přesné a výkonné bash příkazy pro Fedora 44 a KDE Plasma 6.7.5.",
        backstory=(
            "Jsi veterán Linux administrace s hlubokou znalostí dnf5, Wayland compositors (KWin), "
            "PipeWire audia a ROCm ovladačů pro AMD grafické karty."
        ),
        verbose=True,
        llm=llm
    )

    # Definice úloh (Task)
    task_code_review = Task(
        description="Analyzuj aktuální modul J.A.R.V.I.S. a navrhni asynchronní rozšíření pro čtení systémových logů.",
        expected_output="Čistý Python kód s ošetřením výjimek a komentáři.",
        agent=software_architect
    )

    task_system_plan = Task(
        description="Připrav bash proceduru pro instalaci ROCm a konfiguraci Ollama pro AMD RX 7600 na Fedoře 44.",
        expected_output="Sada otestovaných bash příkazů s ověřením proměnných prostředí HSA_OVERRIDE_GFX_VERSION.",
        agent=sysadmin_agent
    )

    # Sestavení posádky
    crew = Crew(
        agents=[software_architect, sysadmin_agent],
        tasks=[task_code_review, task_system_plan],
        process=Process.sequential,
        verbose=True
    )

    return crew

if __name__ == "__main__":
    crew = create_jarvis_crew()
    result = crew.kickoff()
    print("\\n=== VÝSLEDEK CREWAI POSÁDKY ===\\n", result)
`,
  },
  {
    id: 'gpu-ollama',
    filename: 'gpu/ollama_bridge.py',
    category: 'gpu',
    description: 'Lokální fallback bridge pro Ollama s ROCm akcelerací na AMD Radeon RX 7600 (Navi 33, 8GB VRAM).',
    dependencies: ['httpx', 'asyncio', 'pydantic'],
    code: `"""
J.A.R.V.I.S. Local Ollama Bridge
Optimalizováno pro: AMD Radeon RX 7600 (8 GB GDDR6)
Architektura: RDNA 3 / Navi 33 (gfx1102)
Na Fedoře vyžaduje export proměnné: HSA_OVERRIDE_GFX_VERSION=11.0.0
"""

import os
import httpx
from typing import Optional, AsyncGenerator

class OllamaLocalBridge:
    def __init__(self, host: str = "http://localhost:11434", default_model: str = "qwen2.5-coder:7b"):
        self.host = host
        self.default_model = default_model
        
    async def check_service_health(self) -> bool:
        """Ověření, zda lokální Ollama služba běží."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.host}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def stream_local_completion(self, prompt: str, model: Optional[str] = None) -> AsyncGenerator[str, None]:
        """Streamování tokenů z lokálního modelu na RX 7600."""
        target_model = model or self.default_model
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": 0.6,
                "num_ctx": 4096,
                "num_gpu": 99  # Plný offload do 8GB VRAM naší RX 7600
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", f"{self.host}/api/generate", json=payload) as response:
                async for line in response.aiter_lines():
                    if line:
                        import json
                        data = json.loads(line)
                        yield data.get("response", "")

# Doporučený spouštěcí bash skript pro Fedoru:
FEDORA_RUN_COMMAND = """
# Spuštění Ollama s override pro gfx1102 (RX 7600):
export HSA_OVERRIDE_GFX_VERSION=11.0.0
export ROCR_VISIBLE_DEVICES=0
ollama serve
"""
`,
  },
  {
    id: 'voice-interface',
    filename: 'voice/audio_engine.py',
    category: 'voice',
    description: 'Hlasové rozhraní: Příprava pro offline Speech-to-Text (Faster-Whisper) a Text-to-Speech (Piper TTS).',
    dependencies: ['sounddevice', 'numpy', 'faster-whisper', 'piper-tts'],
    code: `"""
J.A.R.V.I.S. Audio Engine
Připraveno pro integraci mikrofonu a hlasového výstupu.
Využívá Ryzen 5 5600GT (12 vláken) pro rychlý offline STT inference.
"""

import asyncio
from typing import Optional

class JarvisVoiceEngine:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self.is_listening = False
        print(f"[AUDIO] Voice Engine připraven s modelem: {model_size}")

    async def listen_for_wake_word(self, wake_word: str = "jarvis") -> bool:
        """Detekce klíčového slova 'Jarvis'."""
        # V budoucnu integrace s openWakeWord nebo Porcupine
        await asyncio.sleep(0.1)
        return True

    def synthesize_speech(self, text: str, output_path: str = "/tmp/jarvis_reply.wav"):
        """Syntéza hlasu přes lehký lokální model Piper TTS nebo gTTS."""
        print(f"[AUDIO] Hovořím: '{text[:40]}...'")
        # cmd = f'echo "{text}" | piper --model cs_CZ-jirka-medium --output_file {output_path}'
        pass
`,
  },
  {
    id: 'config-env',
    filename: 'config/settings.py',
    category: 'config',
    description: 'Konfigurace prostředí, detekce venv, bezpečné proměnné a cesty projektu.',
    dependencies: ['pydantic-settings', 'dotenv'],
    code: `"""
J.A.R.V.I.S. Configuration & Environment Guard
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VENV_PATH = BASE_DIR / ".venv"

def verify_virtual_env() -> bool:
    """Kontrola, zda je skript spuštěn uvnitř dedikovaného venv."""
    return sys.prefix != sys.base_prefix

def get_system_summary() -> dict:
    return {
        "os": "Fedora Linux 44",
        "desktop": "KDE Plasma 6.7.5 (Wayland)",
        "cpu": "AMD Ryzen 5 5600GT (12 vCPUs)",
        "ram": "32 GB",
        "gpu": "AMD Radeon RX 7600 (8GB VRAM)",
        "venv_active": verify_virtual_env(),
        "python_version": sys.version.split()[0]
    }
`,
  },
  {
    id: 'installer-sh',
    filename: 'install.sh',
    category: 'config',
    description: 'Automatizovaný instalační a konfigurační skript pro Fedora 44 (vytvoří složky, venv, dnf balíčky a systemd).',
    dependencies: ['bash', 'dnf', 'python3-virtualenv'],
    code: `#!/usr/bin/env bash
# ====================================================================
# J.A.R.V.I.S. Automated Installer for Fedora Linux 44
# ====================================================================

set -e

TARGET_DIR="\${1:-$HOME/jarvis-core}"
echo "Instaluji J.A.R.V.I.S. do: $TARGET_DIR"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# 1. Vytvoření přehledné struktury složek
mkdir -p core agents gpu voice git config systemd logs
touch core/__init__.py agents/__init__.py gpu/__init__.py voice/__init__.py git/__init__.py config/__init__.py

# 2. Instalace Fedora systémových balíčků
sudo dnf install -y python3 python3-pip python3-virtualenv git gh libnotify

# 3. Vytvoření virtuálního prostředí
python3 -m venv .venv
source .venv/bin/activate

# 4. Instalace Python závislostí
pip install -r requirements.txt

# 5. Oprávnění
chmod +x run.sh jarvis_bridge.py install.sh

echo "Instalace dokončena! Spusťte: ./run.sh"
`,
  },
  {
    id: 'run-sh',
    filename: 'run.sh',
    category: 'core',
    description: 'Rychlý spouštěč celého systému J.A.R.V.I.S. a lokálního daemona ve virtuálním prostředí.',
    dependencies: ['bash', 'python3'],
    code: `#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

echo -e "\\033[0;36m[J.A.R.V.I.S.]\\033[0m Spouštím systémového daemona na portu 9099..."
python3 jarvis_bridge.py
`,
  },
  {
    id: 'systemd-unit',
    filename: 'systemd/jarvis-bridge.service',
    category: 'config',
    description: 'Systemd uživatelská služba pro trvalý běh J.A.R.V.I.S. daemona na pozadí systému.',
    dependencies: ['systemd'],
    code: `[Unit]
Description=J.A.R.V.I.S. Local System Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/jarvis-core
ExecStart=%h/jarvis-core/.venv/bin/python3 %h/jarvis-core/jarvis_bridge.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`,
  },
  {
    id: 'desktop-setup',
    filename: 'setup_desktop_app.sh',
    category: 'config',
    description: 'Integruje J.A.R.V.I.S.e jako samostatnou desktopovou aplikaci do KDE Plasma (nabídka aplikací, ikona v liště).',
    dependencies: ['bash', 'update-desktop-database'],
    code: `#!/usr/bin/env bash
# ====================================================================
# J.A.R.V.I.S. KDE Plasma Desktop Application Integrator
# ====================================================================
APP_DIR="\${1:-$HOME/jarvis-core}"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

mkdir -p "$ICON_DIR" "$DESKTOP_DIR"

# Nativní spouštěč .desktop
cat << EOF > "$DESKTOP_DIR/jarvis.desktop"
[Desktop Entry]
Name=J.A.R.V.I.S.
GenericName=AI Assistant & System Core
Comment=Autonomní AI asistent a systémové řízení pro Fedora Linux
Exec=$APP_DIR/jarvis-app.sh
Icon=jarvis
Terminal=false
Type=Application
Categories=Utility;System;Development;
StartupNotify=true
EOF

update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
echo "Aplikace byla úspěšně přidána do nabídky KDE Plasma!"
`,
  },
];
