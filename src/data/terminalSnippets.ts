import { TerminalSnippet } from '../types/jarvis';

export const TERMINAL_SNIPPETS: TerminalSnippet[] = [
  {
    id: 'fedora-update',
    title: 'Aktualizace systému (DNF 5)',
    category: 'fedora',
    riskLevel: 'system',
    command: 'sudo dnf upgrade --refresh -y && flatpak update -y',
    description: 'Kompletní aktualizace balíčků Fedora 44 včetně Flatpak aplikací s obnovením repozitářových metadat.',
    simulatedOutput: `Updating and loading repositories:
 Fedora 44 - x86_64                                   100% |  12.4 MB/s |  28.2 MB
 Fedora 44 openh264 (Cisco DRM)                       100% |   4.2 kB/s |   2.1 kB
 Fedora 44 - Updates                                  100% |   8.1 MB/s |  14.3 MB
Nothing to do. Complete!
Looking for Flatpak updates...
Nothing to update.`,
  },
  {
    id: 'fedora-journal-errors',
    title: 'Analýza kritických chyb v journalctl',
    category: 'logs',
    riskLevel: 'safe',
    command: 'journalctl -p 3 -xb --no-pager',
    description: 'Zobrazí pouze závažné systémové chyby (priority 0-3: emerg, alert, crit, err) od posledního startu systému.',
    simulatedOutput: `-- Boot 68e914df5a0242a7b6cf2158f967ad00 --
Oct 11 08:14:22 fedora kernel: ACPI BIOS Warning (bug): Optional FADT field [PM2_CONTROL_BLOCK] has zero length.
Oct 11 08:14:25 fedora systemd[1]: Failed to start dkms.service - Builds and install new kernel modules.
Oct 11 08:14:30 fedora kwin_wayland[2104]: kf.kirigami: Failed to find requested icon`,
  },
  {
    id: 'fedora-pipewire',
    title: 'Stav audio subsystému PipeWire',
    category: 'fedora',
    riskLevel: 'safe',
    command: 'systemctl --user status pipewire wireplumber',
    description: 'Ověření běhu moderního zvukového serveru PipeWire a správce relací WirePlumber pro hlasového asistenta.',
    simulatedOutput: `● pipewire.service - PipeWire Multimedia Service
     Loaded: loaded (/usr/lib/systemd/user/pipewire.service; enabled; preset: enabled)
     Active: active (running) since Sat 2026-10-11 08:14:28 CEST; 6h ago
   Main PID: 2012 (pipewire)
● wireplumber.service - Multimedia Service Session Manager
     Loaded: loaded (/usr/lib/systemd/user/wireplumber.service; enabled; preset: enabled)
     Active: active (running) since Sat 2026-10-11 08:14:28 CEST; 6h ago`,
  },
  {
    id: 'kde-wayland-restart',
    title: 'Znovunačtení KDE Plasma 6 KWin (Wayland)',
    category: 'kde',
    riskLevel: 'caution',
    command: 'qdbus6 org.kde.KWin /KWin reconfigure',
    description: 'Čisté znovunačtení konfigurace okenního manažeru KWin na Waylandu bez nutnosti ukončení uživatelské relace.',
    simulatedOutput: `Reconfiguration signal dispatched to org.kde.KWin via DBus (Wayland compositor).
KWin configuration reloaded successfully.`,
  },
  {
    id: 'kde-displays',
    title: 'Diagnostika monitorů (KScreen Doctor)',
    category: 'kde',
    riskLevel: 'safe',
    command: 'kscreen-doctor -o',
    description: 'Výpis aktivních monitorů, obnovovacích frekvencí a Wayland škálování pod KDE Plasma.',
    simulatedOutput: `Output: 1 DisplayPort-1 enabled connected priority 1
  Geometry: 0,0 2560x1440
  Scale: 1
  Rotation: 1
  Refresh Rate: 165.00 Hz
  Modes: 2560x1440@165*, 2560x1440@144, 1920x1080@165`,
  },
  {
    id: 'python-venv-setup',
    title: 'Inicializace Python 3 venv pro JARVIS',
    category: 'python',
    riskLevel: 'safe',
    command: 'python3 -m venv .venv && source .venv/bin/activate && pip install --upgrade pip setuptools wheel',
    description: 'Vytvoření izolovaného virtuálního prostředí a aktualizace základních balíčkovacích nástrojů.',
    simulatedOutput: `Created virtual environment in /home/filip/jarvis/.venv
Using Python 3.12.8 in .venv
Requirement already satisfied: pip in ./.venv/lib/python3.12/site-packages
Successfully upgraded pip to 24.3.1`,
  },
  {
    id: 'python-install-stack',
    title: 'Instalace AI knihoven (google-genai, crewai, langchain)',
    category: 'python',
    riskLevel: 'safe',
    command: 'pip install google-genai langchain langchain-google-genai crewai pydantic rich',
    description: 'Instalace kompletního AI stacku potřebného pro běh J.A.R.V.I.S.e.',
    simulatedOutput: `Collecting google-genai
  Downloading google_genai-2.4.0-py3-none-any.whl (210 kB)
Collecting langchain
  Downloading langchain-0.3.14-py3-none-any.whl (1.0 MB)
Collecting crewai
  Downloading crewai-0.86.0-py3-none-any.whl (420 kB)
Successfully installed google-genai-2.4.0 langchain-0.3.14 crewai-0.86.0`,
  },
  {
    id: 'gpu-rx7600-monitor',
    title: 'Monitorování AMD Radeon RX 7600 (radeontop)',
    category: 'gpu',
    riskLevel: 'safe',
    command: 'radeontop -d -',
    description: 'Zobrazení vytížení grafického jádra Navi 33, grafické paměti VRAM a shader enginu v reálném čase.',
    simulatedOutput: `1728648123.00: bus 03, gpu 12.40%, ee 0.00%, vgt 4.10%, ta 11.20%, tc 10.80%, sx 8.10%, sh 12.00%, spi 14.50%, smx 0.00%, crs 0.00%, vram 24.80% 2031MB / 8192MB, gtt 8.20% 670MB`,
  },
  {
    id: 'gpu-ollama-rx7600',
    title: 'Spuštění Ollama s akcelerací na RX 7600 (ROCm)',
    category: 'gpu',
    riskLevel: 'caution',
    command: 'export HSA_OVERRIDE_GFX_VERSION=11.0.0 && export ROCR_VISIBLE_DEVICES=0 && ollama serve',
    description: 'Spustí Ollama server s přepsáním architektury GFX na 11.0.0 pro plnou podporu AMD Radeon RX 7600 pod ROCm 6.',
    simulatedOutput: `[GIN] 2026/10/11 - 14:30:15 | 200 |    52.12µs | 127.0.0.1 | GET "/"
time=2026-10-11T14:30:15.112+02:00 level=INFO source=gpu.go:199 msg="detected AMD GPU gfx1102, overriding to gfx1100"
time=2026-10-11T14:30:15.114+02:00 level=INFO source=server.go:374 msg="Ollama is listening on 127.0.0.1:11434 (GPU Offload Enabled: 8192 MB VRAM)"`,
  },
  {
    id: 'fedora-kde-notification-test',
    title: 'Test odeslání KDE notifikace z terminálu',
    category: 'kde',
    riskLevel: 'safe',
    command: 'notify-send -u normal -a "J.A.R.V.I.S." "Systémový stav" "Všechny subsystémy Fedora 44 KDE jsou nominální, pane."',
    description: 'Otestuje vizuální vyskakovací oznámení v KDE Plasma oznamovacím centru.',
    simulatedOutput: `[KDE Notification dispatched to org.freedesktop.Notifications]`,
  },
  {
    id: 'fedora-hardware-overview',
    title: 'Detailní HW audit (Ryzen 5 5600GT & RX 7600)',
    category: 'fedora',
    riskLevel: 'safe',
    command: 'inxi -Fxz',
    description: 'Kompletní přehled hardwarových komponent, jader CPU, grafických ovladačů a systémových senzorů.',
    simulatedOutput: `System:
  Host: fedora-desktop Kernel: 6.14.0-64.fc44.x86_64 arch: x86_64 bits: 64
  Desktop: KDE Plasma v: 6.7.5 Distro: Fedora Linux 44
CPU:
  Info: 6-core (12-mt) model: AMD Ryzen 5 5600GT with Radeon Graphics bits: 64
    type: MT MCP cache: L2: 3 MiB L3: 16 MiB
  Speed (MHz): avg: 3600 min/max: 400/4650
Graphics:
  Device-1: Advanced Micro Devices [AMD/ATI] Navi 33 [Radeon RX 7600] driver: amdgpu
  Display: wayland server: Xwayland with: KWin
Memory:
  System RAM: total: 32 GiB available: 31.2 GiB used: 7.4 GiB (23.7%)`,
  },
];
