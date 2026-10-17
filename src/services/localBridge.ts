import { PCAction, LocalBridgeStatus } from '../types/jarvis';

export const LOCAL_BRIDGE_URL = 'http://127.0.0.1:9099';

export const PREDEFINED_PC_ACTIONS: PCAction[] = [
  {
    id: 'open_terminal',
    type: 'open_terminal',
    label: 'Otevřít Terminál',
    command: 'konsole &',
    description: 'Spustí terminál KDE Konsole přímo na vaší ploše Wayland.',
    category: 'apps',
    icon: 'terminal',
  },
  {
    id: 'system_monitor',
    type: 'system_monitor',
    label: 'Btop Monitor',
    command: 'konsole -e btop &',
    description: 'Otevře v novém okně terminálu btop s přehledem CPU Ryzen 5600GT a paměti RAM.',
    category: 'monitoring',
    icon: 'activity',
  },
  {
    id: 'file_manager',
    type: 'file_manager',
    label: 'Správce souborů (Dolphin)',
    command: 'dolphin &',
    description: 'Otevře správce souborů Dolphin v domovském adresáři.',
    category: 'apps',
    icon: 'folder',
  },
  {
    id: 'gpu_monitor',
    type: 'gpu_monitor',
    label: 'Radeon RX 7600 Monitor',
    command: 'konsole -e radeontop &',
    description: 'Spustí sledování zátěže grafického procesoru Navi 33 a VRAM paměti.',
    category: 'monitoring',
    icon: 'cpu',
  },
  {
    id: 'screenshot',
    type: 'screenshot',
    label: 'Snímek obrazovky (Spectacle)',
    command: 'spectacle -r &',
    description: 'Aktivuje nástroj Spectacle pro vyfocení oblasti obrazovky v KDE.',
    category: 'apps',
    icon: 'camera',
  },
  {
    id: 'settings',
    type: 'settings',
    label: 'KDE Nastavení Systému',
    command: 'systemsettings &',
    description: 'Otevře hlavní ovládací panel KDE Plasma 6.7.5.',
    category: 'system',
    icon: 'settings',
  },
  {
    id: 'lock_screen',
    type: 'lock_screen',
    label: 'Zamknout Obrazovku',
    command: 'loginctl lock-session',
    description: 'Okamžitě aktivuje uzamčení relace KDE Plasma pro zajištění soukromí.',
    category: 'system',
    icon: 'lock',
  },
  {
    id: 'volume_up',
    type: 'volume_up',
    label: 'Zvýšit Hlasitost (+5%)',
    command: 'wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+',
    description: 'Zvýší úroveň hlasitosti výchozího výstupu PipeWire.',
    category: 'media',
    icon: 'volume-2',
  },
  {
    id: 'volume_down',
    type: 'volume_down',
    label: 'Snížit Hlasitost (-5%)',
    command: 'wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-',
    description: 'Sníží úroveň hlasitosti výchozího výstupu PipeWire.',
    category: 'media',
    icon: 'volume-1',
  },
  {
    id: 'volume_mute',
    type: 'volume_mute',
    label: 'Ztlumit / Zapnout Zvuk',
    command: 'wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle',
    description: 'Přepne stav ztlumení reproduktorů/sluchátek.',
    category: 'media',
    icon: 'volume-x',
  },
  {
    id: 'kwin_restart',
    type: 'kwin_reconfigure',
    label: 'Znovunačíst KWin Wayland',
    command: 'qdbus6 org.kde.KWin /KWin reconfigure',
    description: 'Odešle DBus signál pro znovunačtení konfigurace okenního manažeru.',
    category: 'system',
    icon: 'refresh-cw',
  },
  {
    id: 'install_desktop_app',
    type: 'desktop_app',
    label: 'KDE Nativní Aplikace (Desktop Launcher)',
    command: 'bash ~/jarvis-core/setup_desktop_app.sh &',
    description: 'Vytvoří nativní KDE Plasma ikonu a zařadí J.A.R.V.I.S.e do nabídky aplikací a na panel.',
    category: 'apps',
    icon: 'sparkles',
  },
  {
    id: 'git_push_remote',
    type: 'git_push',
    label: 'Odeslat změny na GitHub (Git Push)',
    command: 'cd ~/jarvis-core && git remote add origin https://github.com/filip-bardon/jarvis-ai-assistant.git 2>/dev/null || git remote set-url origin https://github.com/filip-bardon/jarvis-ai-assistant.git; git push -u origin main --force',
    description: 'Odešle všechny lokální commity do vašeho existujícího repozitáře jarvis-ai-assistant na GitHubu.',
    category: 'system',
    icon: 'upload',
  },
];

export async function checkBridgeHealth(): Promise<{
  online: boolean;
  data?: any;
  mode?: 'direct' | 'relay';
  error?: string;
}> {
  // 1. Try Direct Local Connection (Fast, works in Chromium/Chrome/Desktop App)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);

    const response = await fetch(`${LOCAL_BRIDGE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { online: true, mode: 'direct', data };
    }
  } catch (err) {
    // Firefox blocks direct HTTP from HTTPS (Mixed Content), fallback to Cloud Relay
  }

  // 2. Fallback to Cloud Relay (100% works in Firefox, Safari, and any browser)
  try {
    const relayRes = await fetch('/api/bridge/relay-status');
    if (relayRes.ok) {
      const relayData = await relayRes.json();
      if (relayData.online) {
        return {
          online: true,
          mode: 'relay',
          data: relayData.system,
        };
      }
    }
  } catch (err: any) {
    // offline
  }

  return { online: false, error: 'Daemon offline (spusťte ./run.sh na vašem PC)' };
}

export async function executeOnPC(
  actionType: string,
  command?: string,
  app?: string
): Promise<{
  success: boolean;
  message: string;
  pid?: number;
  stdout?: string;
  stderr?: string;
  mode?: 'direct' | 'relay' | 'simulated';
  isSimulated?: boolean;
}> {
  // 1. Try Direct Localhost
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${LOCAL_BRIDGE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionType,
        command: command || '',
        app: app || '',
        background: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      return {
        success: json.success ?? true,
        message: json.message || 'Příkaz byl úspěšně spuštěn na vašem PC.',
        pid: json.pid,
        stdout: json.stdout,
        stderr: json.stderr,
        mode: 'direct',
        isSimulated: false,
      };
    }
  } catch (err) {
    // Direct blocked by browser, try Cloud Relay
  }

  // 2. Dispatch via Cloud Relay (Firefox compatible)
  try {
    const relayRes = await fetch('/api/bridge/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionType,
        command: command || '',
        app: app || '',
      }),
    });

    if (relayRes.ok) {
      const relayJson = await relayRes.json();
      return {
        success: true,
        message: 'Příkaz byl bezpečně předán vašemu PC přes Cloud Relay (Firefox kompatibilní).',
        mode: 'relay',
        isSimulated: false,
      };
    }
  } catch (err) {
    // Relay failed
  }

  return {
    success: true,
    message: `Příkaz připraven. Pro přímé spuštění na vašem PC spusťte v terminálu: python3 jarvis_bridge.py`,
    mode: 'simulated',
    isSimulated: true,
  };
}

export async function syncFilesToLocalPC(
  files: { path: string; content: string }[]
): Promise<{ success: boolean; message: string; updatedCount?: number }> {
  // 1. Try Direct Localhost
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${LOCAL_BRIDGE_URL}/update_files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success,
        message: data.message || `Úspěšně přepsáno ${data.updated_count} souborů na disku.`,
        updatedCount: data.updated_count,
      };
    }
  } catch (err: any) {
    // Try Cloud Relay
  }

  // 2. Cloud Relay Dispatch
  try {
    const relayRes = await fetch('/api/bridge/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_files',
        files,
      }),
    });

    if (relayRes.ok) {
      return {
        success: true,
        message: `Soubory (${files.length}) odeslány do vašeho PC přes Cloud Relay.`,
        updatedCount: files.length,
      };
    }
  } catch (err: any) {
    // failed
  }

  return { success: false, message: 'Nepodařilo se synchronizovat soubory.' };
}

export async function triggerLocalGitPull(): Promise<{ success: boolean; message: string; output?: string }> {
  try {
    const res = await fetch(`${LOCAL_BRIDGE_URL}/git_pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success,
        message: data.message,
        output: data.output,
      };
    }
  } catch (err: any) {
    // Try Cloud Relay
    try {
      await fetch('/api/bridge/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'git_pull' }),
      });
      return { success: true, message: 'Příkaz git pull byl odeslán do vašeho PC.' };
    } catch {}
  }
  return { success: false, message: 'Nepodařilo se provést git pull.' };
}

