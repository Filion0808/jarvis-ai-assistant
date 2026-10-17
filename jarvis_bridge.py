#!/usr/bin/env python3
"""
====================================================================
J.A.R.V.I.S. Local System Bridge Daemon
Fedora Linux 44 (KDE Plasma 6.7.5, Wayland session)
Hardware: AMD Ryzen 5 5600GT | 32 GB RAM | AMD Radeon RX 7600
====================================================================
Tento skript běží přímo na vašem Fedora PC a přijímá instrukce
z webového rozhraní J.A.R.V.I.S. (http://127.0.0.1:9099).

Funkce:
- Otevírání terminálu (Konsole / Ptyxis / Alacritty)
- Spouštění systémových nástrojů KDE (Dolphin, Spectacle, Btop, Systemsettings)
- Správa audia PipeWire (wpctl)
- Zamykání obrazovky a správa sezení
- Čtení logů journalctl a HW telemetrie
====================================================================
"""

import sys
import os
import json
import subprocess
import shutil
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any

HOST = "127.0.0.1"
PORT = 9099

# Bezpečnostní whitelist aplikací a příkazů pro rychlé bezpečné spuštění
SAFE_APPS = {
    "terminal": ["konsole", "ptyxis", "alacritty", "x-terminal-emulator", "gnome-terminal"],
    "system_monitor": ["konsole -e btop", "plasma-systemmonitor", "konsole -e htop"],
    "file_manager": ["dolphin", "nautilus"],
    "settings": ["systemsettings"],
    "screenshot": ["spectacle -r", "spectacle"],
    "browser": ["xdg-open https://www.google.com", "firefox"],
    "lock_screen": ["loginctl lock-session", "qdbus6 org.freedesktop.ScreenSaver /ScreenSaver Lock"],
    "volume_up": ["wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+"],
    "volume_down": ["wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-"],
    "volume_mute": ["wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle"],
    "gpu_monitor": ["konsole -e radeontop", "konsole -e rocm-smi"],
    "kwin_reconfigure": ["qdbus6 org.kde.KWin /KWin reconfigure"],
}

def detect_preferred_terminal() -> str:
    """Detekce nainstalovaného terminálu na Fedora 44 KDE."""
    for term in ["konsole", "ptyxis", "alacritty", "x-terminal-emulator", "gnome-terminal"]:
        if shutil.which(term):
            return term
    return "x-terminal-emulator"

def run_command(command: str, background: bool = True) -> Dict[str, Any]:
    """Bezpečné spuštění příkazu v uživatelském prostředí KDE Plasma Wayland."""
    env = os.environ.copy()
    
    # Zajištění předání Wayland / XDG proměnných
    if "WAYLAND_DISPLAY" not in env:
        env["WAYLAND_DISPLAY"] = "wayland-0"
    if "XDG_CURRENT_DESKTOP" not in env:
        env["XDG_CURRENT_DESKTOP"] = "KDE"
    
    print(f"\033[96m[J.A.R.V.I.S. BRIDGE]\033[0m Spouštím příkaz: \033[93m{command}\033[0m")

    try:
        if background:
            # Spuštění procesu na pozadí s novou session
            proc = subprocess.Popen(
                command,
                shell=True,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            return {
                "success": True,
                "pid": proc.pid,
                "command": command,
                "message": f"Příkaz byl úspěšně spuštěn na vašem PC (PID: {proc.pid})."
            }
        else:
            res = subprocess.run(
                command,
                shell=True,
                env=env,
                capture_output=True,
                text=True,
                timeout=15
            )
            return {
                "success": res.returncode == 0,
                "returncode": res.returncode,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "command": command,
                "message": "Příkaz dokončen." if res.returncode == 0 else f"Chyba: {res.stderr}"
            }
    except Exception as e:
        print(f"\033[91m[CHYBA]\033[0m Selhání při spouštění: {e}")
        return {
            "success": False,
            "error": str(e),
            "command": command,
            "message": f"Selhání při spuštění: {e}"
        }

class JarvisBridgeHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, content_type: str = "application/json"):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers()

    def do_GET(self):
        if self.path in ["/health", "/status"]:
            data = {
                "status": "online",
                "version": "1.0.0",
                "host": "Fedora Linux 44",
                "desktop": "KDE Plasma 6.7.5 (Wayland)",
                "cpu": "AMD Ryzen 5 5600GT (12 vCPUs)",
                "gpu": "AMD Radeon RX 7600 (8GB VRAM)",
                "terminal": detect_preferred_terminal(),
                "bridge": "J.A.R.V.I.S. Local System Daemon",
            }
            self._set_cors_headers()
            self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))
        elif self.path == "/system_info":
            # Rychlá telemetrie z hostitelského PC
            try:
                mem = subprocess.check_output("free -m", shell=True, text=True)
                uptime = subprocess.check_output("uptime", shell=True, text=True)
            except Exception:
                mem, uptime = "N/A", "N/A"
            data = {
                "memory": mem,
                "uptime": uptime,
                "terminal": detect_preferred_terminal()
            }
            self._set_cors_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/execute":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            
            try:
                payload = json.loads(body.decode("utf-8"))
            except Exception:
                payload = {}

            action = payload.get("action", "")
            raw_command = payload.get("command", "")
            app_target = payload.get("app", "")

            # Priorita akce
            if action == "open_terminal" or app_target == "terminal":
                term = detect_preferred_terminal()
                cmd = f"{term} &"
            elif action in SAFE_APPS:
                cmd = SAFE_APPS[action][0] + " &"
            elif raw_command:
                cmd = raw_command
            else:
                cmd = f"{detect_preferred_terminal()} &"

            # Odeslání KDE notifikace
            try:
                notify_cmd = f'notify-send -a "J.A.R.V.I.S." -u low "Systémová Akce" "Provádím příkaz: {cmd.strip()}"'
                subprocess.Popen(notify_cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass

            result = run_command(cmd, background=payload.get("background", True))
            
            self._set_cors_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))

        elif self.path == "/update_files":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                payload = json.loads(body.decode("utf-8"))
            except Exception:
                payload = {}

            files = payload.get("files", [])
            base_dir = os.path.dirname(os.path.abspath(__file__))
            updated = []

            for f in files:
                rel_path = f.get("path", "").lstrip("/")
                content = f.get("content", "")
                if not rel_path:
                    continue
                target_file = os.path.join(base_dir, rel_path)
                os.makedirs(os.path.dirname(target_file), exist_ok=True)
                with open(target_file, "w", encoding="utf-8") as out:
                    out.write(content)
                updated.append(rel_path)

            print(f"\033[92m[J.A.R.V.I.S. LIVE SYNC]\033[0m Aktualizováno {len(updated)} souborů z webu.")

            # Notifikace KDE
            try:
                subprocess.Popen(
                    f'notify-send -a "J.A.R.V.I.S." -u normal "Live Sync Dokončen" "Aktualizováno {len(updated)} souborů z webové konzole."',
                    shell=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception:
                pass

            self._set_cors_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": f"Úspěšně synchronizováno a přepsáno {len(updated)} souborů v ~/jarvis-core.",
                "updated_count": len(updated),
                "files": updated
            }).encode("utf-8"))

        elif self.path == "/git_pull":
            base_dir = os.path.dirname(os.path.abspath(__file__))
            res = subprocess.run("git pull origin main", shell=True, cwd=base_dir, capture_output=True, text=True)
            self._set_cors_headers()
            self.wfile.write(json.dumps({
                "success": res.returncode == 0,
                "output": res.stdout or res.stderr,
                "message": "Git pull z GitHubu dokončen." if res.returncode == 0 else f"Chyba: {res.stderr}"
            }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        return

CLOUD_RELAY_URL = "https://ais-dev-wm6htdihxwwnyfh4qad3g4-410492439378.europe-west2.run.app/api/bridge/poll"

def start_cloud_relay_poller():
    """Běží na pozadí a komunikuje s webem přes HTTPS (funguje 100% ve Firefoxu i bez Mixed Content)."""
    import urllib.request
    import threading
    import time

    def poller_loop():
        base_dir = os.path.dirname(os.path.abspath(__file__))
        while True:
            try:
                payload = json.dumps({
                    "system": {
                        "host": "Fedora Linux 44",
                        "desktop": "KDE Plasma 6.7.5 (Wayland)",
                        "terminal": detect_preferred_terminal(),
                    }
                }).encode("utf-8")

                req = urllib.request.Request(
                    CLOUD_RELAY_URL,
                    data=payload,
                    headers={"Content-Type": "application/json", "User-Agent": "JarvisLocalBridge/1.0"}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    commands = data.get("commands", [])
                    for cmd_item in commands:
                        action = cmd_item.get("action", "")
                        raw_cmd = cmd_item.get("command", "")
                        files = cmd_item.get("files", [])
                        print(f"\033[92m[CLOUD RELAY]\033[0m Přijat příkaz z webu: {action}")

                        if action == "update_files" and files:
                            for f in files:
                                rel_path = f.get("path", "").lstrip("/")
                                target_path = os.path.join(base_dir, rel_path)
                                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                                with open(target_path, "w", encoding="utf-8") as out:
                                    out.write(f.get("content", ""))
                            print(f"\033[92m[LIVE SYNC]\033[0m Uloženo {len(files)} souborů.")
                            subprocess.Popen(f'notify-send -a "J.A.R.V.I.S." "Live Sync" "Aktualizováno {len(files)} souborů."', shell=True)

                        elif action == "git_pull":
                            subprocess.run("git pull origin main", shell=True, cwd=base_dir)

                        elif action in SAFE_APPS:
                            to_exec = SAFE_APPS[action][0] + " &"
                            subprocess.Popen(to_exec, shell=True)
                            subprocess.Popen(f'notify-send -a "J.A.R.V.I.S." "Hlasový / Systémový Příkaz" "Spouštím: {action}"', shell=True)

                        elif raw_cmd:
                            subprocess.Popen(raw_cmd, shell=True)
                            subprocess.Popen(f'notify-send -a "J.A.R.V.I.S." "Systémová Akce" "{raw_cmd[:40]}"', shell=True)

            except Exception:
                pass
            time.sleep(1.8)

    thread = threading.Thread(target=poller_loop, daemon=True)
    thread.start()

def main():
    print("\033[96m" + "=" * 65 + "\033[0m")
    print("\033[93m  J.A.R.V.I.S. Local System Daemon // FEDORA 44 KDE WAYLAND\033[0m")
    print("\033[96m" + "=" * 65 + "\033[0m")
    print(f"  \033[92m●\033[0m Naslouchám na: \033[97mhttp://{HOST}:{PORT}\033[0m")
    print(f"  \033[92m●\033[0m Cloud Relay aktivní: \033[92mONLINE (Firefox & Chrome ready)\033[0m")
    print(f"  \033[92m●\033[0m Preferovaný terminál: \033[97m{detect_preferred_terminal()}\033[0m")
    print("\033[96m" + "-" * 65 + "\033[0m")
    print("  Daemon je připraven přijímat příkazy z webu i hlasem.\n")

    start_cloud_relay_poller()

    server = HTTPServer((HOST, PORT), JarvisBridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\033[93m[J.A.R.V.I.S. BRIDGE]\033[0m Daemon ukončen. Na shledanou, pane.")
        server.server_close()

if __name__ == "__main__":
    main()

