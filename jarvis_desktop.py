#!/usr/bin/env python3
"""
J.A.R.V.I.S. Native Desktop Application
Samostatné desktopové okno pro Fedora Linux 44 KDE Plasma 6.7.5 Wayland
Není závislé na Firefoxu ani běžném prohlížeči.
"""

import sys
import os
import subprocess
import time

APP_URL = "https://ais-dev-wm6htdihxwwnyfh4qad3g4-410492439378.europe-west2.run.app"
CORE_DIR = os.path.dirname(os.path.abspath(__file__))

def ensure_bridge_running():
    bridge_script = os.path.join(CORE_DIR, "jarvis_bridge.py")
    if not os.path.exists(bridge_script):
        bridge_script = os.path.expanduser("~/jarvis-core/jarvis_bridge.py")
    
    # Rychlý test, zda daemon odpovídá
    try:
        import urllib.request
        urllib.request.urlopen("http://127.0.0.1:9099/health", timeout=0.8)
    except Exception:
        if os.path.exists(bridge_script):
            print("[J.A.R.V.I.S.] Startuji lokálního systémového daemona...")
            subprocess.Popen([sys.executable, bridge_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(0.5)

def run_native_app():
    ensure_bridge_running()
    
    try:
        import webview
        print("[J.A.R.V.I.S.] Spouštím nativní desktopové okno...")
        window = webview.create_window(
            title="J.A.R.V.I.S. Core // Stark Industries",
            url=APP_URL,
            width=1400,
            height=900,
            min_size=(1024, 700),
            background_color="#050914"
        )
        webview.start(private_mode=False)
        return True
    except ImportError:
        return False

if __name__ == "__main__":
    if not run_native_app():
        print("[INFO] Knihovna pywebview není nainstalována. Spouštím v Chromium --app režimu...")
        # Fallback na Chromium --app
        subprocess.run(["chromium", f"--app={APP_URL}"])
