import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Download,
  Terminal,
  Play,
  Copy,
  Check,
  CheckCircle2,
  Cpu,
  Layers,
  Settings,
  Shield,
  ExternalLink,
  Code2,
  Sparkles,
} from 'lucide-react';
import { INITIAL_PYTHON_MODULES } from '../data/pythonModules';
import { playJarvisSound } from '../utils/audio';
import { executeOnPC } from '../services/localBridge';

interface ProjectWorkspaceProps {
  onAskJarvis: (prompt: string) => void;
  bridgeOnline: boolean;
}

interface TreeItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  category?: string;
  description?: string;
  content?: string;
  children?: TreeItem[];
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  onAskJarvis,
  bridgeOnline,
}) => {
  const [selectedFile, setSelectedFile] = useState<string>('install.sh');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [installerStatus, setInstallerStatus] = useState<string | null>(null);

  // Define complete workspace tree with folders and files
  const workspaceTree: TreeItem[] = [
    {
      id: 'root-install',
      name: 'install.sh',
      path: 'install.sh',
      type: 'file',
      category: 'installer',
      description: 'Automatizovaný instalační a konfigurační skript pro Fedora 44 (KDE Wayland).',
      content:
        INITIAL_PYTHON_MODULES.find((m) => m.filename === 'install.sh')?.code ||
        '#!/usr/bin/env bash\n# J.A.R.V.I.S. Installer',
    },
    {
      id: 'root-run',
      name: 'run.sh',
      path: 'run.sh',
      type: 'file',
      category: 'starter',
      description: 'Rychlý spouštěč celého systému J.A.R.V.I.S. a lokálního daemona.',
      content:
        INITIAL_PYTHON_MODULES.find((m) => m.filename === 'run.sh')?.code ||
        '#!/usr/bin/env bash\npython3 jarvis_bridge.py',
    },
    {
      id: 'root-bridge',
      name: 'jarvis_bridge.py',
      path: 'jarvis_bridge.py',
      type: 'file',
      category: 'daemon',
      description: 'Lokální daemon pro přímé spouštění aplikací na PC (port 9099).',
      content: INITIAL_PYTHON_MODULES.find((m) => m.filename === 'jarvis_bridge.py')?.code || '',
    },
    {
      id: 'root-req',
      name: 'requirements.txt',
      path: 'requirements.txt',
      type: 'file',
      category: 'config',
      description: 'Seznam Python závislostí pro pip instalaci.',
      content: `google-genai>=2.4.0
langchain>=0.3.0
langchain-google-genai>=2.0.0
crewai>=0.86.0
pydantic>=2.10.0
rich>=13.9.0
httpx>=0.28.0
psutil>=6.1.0
`,
    },
    {
      id: 'root-env',
      name: '.env.example',
      path: '.env.example',
      type: 'file',
      category: 'config',
      description: 'Vzorový konfigurační soubor proměnných prostředí.',
      content: `GEMINI_API_KEY=your_gemini_api_key_here
JARVIS_HOST=127.0.0.1
JARVIS_PORT=9099
ROCM_GFX_VERSION=11.0.0
HSA_OVERRIDE_GFX_VERSION=11.0.0
`,
    },
    {
      id: 'root-ignore',
      name: '.gitignore',
      path: '.gitignore',
      type: 'file',
      category: 'git',
      description: 'Filtrování souborů pro čistý Git repozitář.',
      content: `__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
.env
logs/*.log
*.pid
dist/
`,
    },
    {
      id: 'root-readme',
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      category: 'docs',
      description: 'Kompletní dokumentace systému, architektury a parametrů hardware.',
      content: `# J.A.R.V.I.S. Personal AI System & Engineering Core
Autonomní osobní asistent vytvořený na míru pro Fedora Linux 44.

## Systémové Parametry:
- **Host OS:** Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)
- **CPU:** AMD Ryzen 5 5600GT (6C/12T @ 4.6 GHz)
- **RAM:** 32 GB DDR4
- **GPU:** AMD Radeon RX 7600 (8 GB VRAM, RDNA 3, gfx1102)

## Instalace a Spuštění:
\`\`\`bash
bash install.sh
./run.sh
\`\`\`
`,
    },
    {
      id: 'folder-core',
      name: 'core/',
      path: 'core',
      type: 'folder',
      description: 'Jádro asistenta, hlavní asynchronní smyčka a napojení na google-genai.',
      children: [
        {
          id: 'file-core-init',
          name: '__init__.py',
          path: 'core/__init__.py',
          type: 'file',
          content: '"""J.A.R.V.I.S. Core Module"""\n',
        },
        {
          id: 'file-core-main',
          name: 'jarvis_main.py',
          path: 'core/jarvis_main.py',
          type: 'file',
          description: 'Hlavní smyčka asistenta, správa stavu a volání LLM.',
          content:
            INITIAL_PYTHON_MODULES.find((m) => m.filename === 'core/jarvis_main.py')?.code || '',
        },
      ],
    },
    {
      id: 'folder-agents',
      name: 'agents/',
      path: 'agents',
      type: 'folder',
      description: 'Multi-agentní orchestrace (CrewAI, LangChain) a správce Fedora procesů.',
      children: [
        {
          id: 'file-agents-init',
          name: '__init__.py',
          path: 'agents/__init__.py',
          type: 'file',
          content: '"""J.A.R.V.I.S. Agents Module"""\n',
        },
        {
          id: 'file-agents-sys',
          name: 'system_agent.py',
          path: 'agents/system_agent.py',
          type: 'file',
          description: 'Správce Fedora procesů, bezpečný shell whitelist a notifikace.',
          content:
            INITIAL_PYTHON_MODULES.find((m) => m.filename === 'agents/system_agent.py')?.code || '',
        },
        {
          id: 'file-agents-crew',
          name: 'crew_manager.py',
          path: 'agents/crew_manager.py',
          type: 'file',
          description: 'CrewAI multi-agent orchestrátor pro analýzu chyb a systémových úloh.',
          content:
            INITIAL_PYTHON_MODULES.find((m) => m.filename === 'agents/crew_manager.py')?.code || '',
        },
      ],
    },
    {
      id: 'folder-gpu',
      name: 'gpu/',
      path: 'gpu',
      type: 'folder',
      description: 'ROCm akcelerace pro AMD Radeon RX 7600 a lokální Ollama.',
      children: [
        {
          id: 'file-gpu-init',
          name: '__init__.py',
          path: 'gpu/__init__.py',
          type: 'file',
          content: '"""J.A.R.V.I.S. GPU ROCm Module"""\n',
        },
        {
          id: 'file-gpu-ollama',
          name: 'ollama_bridge.py',
          path: 'gpu/ollama_bridge.py',
          type: 'file',
          description: 'Most pro lokální LLM přes Ollama s ROCm parametrem pro Navi 33.',
          content:
            INITIAL_PYTHON_MODULES.find((m) => m.filename === 'gpu/ollama_bridge.py')?.code || '',
        },
      ],
    },
    {
      id: 'folder-voice',
      name: 'voice/',
      path: 'voice',
      type: 'folder',
      description: 'Hlasové rozhraní (STT Whisper, TTS syntéza řeči).',
      children: [
        {
          id: 'file-voice-init',
          name: '__init__.py',
          path: 'voice/__init__.py',
          type: 'file',
          content: '"""J.A.R.V.I.S. Voice Engine Module"""\n',
        },
        {
          id: 'file-voice-engine',
          name: 'audio_engine.py',
          path: 'voice/audio_engine.py',
          type: 'file',
          description: 'Hlasový modul pro syntézu řeči a detekci klíčového slova Jarvis.',
          content:
            INITIAL_PYTHON_MODULES.find((m) => m.filename === 'voice/audio_engine.py')?.code || '',
        },
      ],
    },
    {
      id: 'folder-git',
      name: 'git/',
      path: 'git',
      type: 'folder',
      description: 'Synchronizace a ukládání repozitáře na GitHub.',
      children: [
        {
          id: 'file-git-init',
          name: '__init__.py',
          path: 'git/__init__.py',
          type: 'file',
          content: '"""J.A.R.V.I.S. Git Automation Module"""\n',
        },
        {
          id: 'file-git-sync',
          name: 'github_sync.py',
          path: 'git/github_sync.py',
          type: 'file',
          description: 'Automatické ukládání a verzování souborů na GitHub.',
          content:
            INITIAL_PYTHON_MODULES.find((m) => m.filename === 'git/github_sync.py')?.code || '',
        },
      ],
    },
    {
      id: 'folder-config',
      name: 'config/',
      path: 'config',
      type: 'folder',
      description: 'Konfigurace cest, detekce virtuálního prostředí a bezpečnosti.',
      children: [
        {
          id: 'file-config-init',
          name: '__init__.py',
          path: 'config/__init__.py',
          type: 'file',
          content: '"""J.A.R.V.I.S. Config Module"""\n',
        },
        {
          id: 'file-config-settings',
          name: 'settings.py',
          path: 'config/settings.py',
          type: 'file',
          description: 'Konfigurace prostředí, detekce venv a hardwarový audit.',
          content:
            INITIAL_PYTHON_MODULES.find((m) => m.filename === 'config/settings.py')?.code || '',
        },
      ],
    },
    {
      id: 'folder-systemd',
      name: 'systemd/',
      path: 'systemd',
      type: 'folder',
      description: 'Systemd uživatelské služby a časovače pro Fedora Linux.',
      children: [
        {
          id: 'file-systemd-service',
          name: 'jarvis-bridge.service',
          path: 'systemd/jarvis-bridge.service',
          type: 'file',
          description: 'Uživatelská služba pro trvalý běh na pozadí.',
          content: `[Unit]
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
      ],
    },
  ];

  // Flat map for quick file retrieval
  const allFiles: Record<string, { name: string; path: string; content: string; desc?: string }> =
    {};
  const populateFiles = (items: TreeItem[]) => {
    items.forEach((item) => {
      if (item.type === 'file') {
        allFiles[item.path] = {
          name: item.name,
          path: item.path,
          content: item.content || '',
          desc: item.description,
        };
      }
      if (item.children) {
        populateFiles(item.children);
      }
    });
  };
  populateFiles(workspaceTree);

  const activeFileData = allFiles[selectedFile] || allFiles['install.sh'];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playJarvisSound('blip');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    playJarvisSound('process');

    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('jarvis-core') || zip;

      Object.values(allFiles).forEach((f) => {
        rootFolder.file(f.path, f.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'jarvis-core-workspace.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      playJarvisSound('complete');
    } catch (e) {
      console.error(e);
      playJarvisSound('alert');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExecuteInstallerOnPC = async () => {
    setInstallerStatus('Spouštím instalátor na vašem PC...');
    playJarvisSound('blip');

    const cmd = `curl -sSL http://localhost:3000/api/installer | bash`;
    const res = await executeOnPC('custom', cmd);

    if (res.success) {
      setInstallerStatus('Instalátor byl spuštěn na vašem stroji Fedora 44.');
      playJarvisSound('complete');
    } else {
      setInstallerStatus('Chyba při spuštění instalátoru.');
      playJarvisSound('alert');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 mb-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud tracking-wider text-base sm:text-lg font-bold text-cyan-300 uppercase">
              Přehledná Struktura Složek &amp; Automatický Instalátor
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
              FEDORA 44 READY
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-hud tracking-wide font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 rounded-lg transition-all shadow-[0_0_12px_rgba(6,182,212,0.18)]"
              title="Stáhnout kompletní ZIP archiv se všemi složkami"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span>{isExportingZip ? 'BALÍM ZIP...' : 'STÁHNOUT ZIP ARCHIV'}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Kompletní, čistá adresářová architektura pro váš projekt{' '}
          <strong className="text-cyan-300">jarvis-core</strong> na{' '}
          <strong className="text-cyan-300">Fedora Linux 44 (KDE Wayland)</strong>. Obsahuje modulární
          podadresáře pro jádro, agenty, GPU akceleraci na Radeonu RX 7600, hlasové rozhraní a
          spustitelný instalátor <code className="text-amber-300 font-semibold">install.sh</code>.
        </p>
      </div>

      {/* Direct Methods to populate ~/jarvis-core */}
      <div className="bg-[#050a17] border border-cyan-500/25 rounded-xl p-4 font-mono text-xs text-slate-200 hud-glow-cyan space-y-3">
        <div className="flex items-center gap-2 text-cyan-300 font-bold border-b border-cyan-500/15 pb-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Jak okamžitě naplnit složku ~/jarvis-core všemi soubory:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Method A: ZIP Download */}
          <div className="bg-[#081226] border border-cyan-500/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                1. Přes stažený ZIP (Doporučeno)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Klikněte vpravo nahoře na <strong className="text-cyan-300">STÁHNOUT ZIP ARCHIV</strong> a v terminálu spusťte:
            </p>
            <div className="bg-[#040814] p-2 rounded border border-cyan-500/20 flex items-center justify-between">
              <code className="text-emerald-300 text-[11px] truncate">
                unzip -o ~/Downloads/jarvis-core-workspace.zip -d ~/jarvis-core && cd ~/jarvis-core
              </code>
              <button
                onClick={() =>
                  handleCopy(
                    'unzip -o ~/Downloads/jarvis-core-workspace.zip -d ~/jarvis-core && cd ~/jarvis-core && ls -la',
                    'copy-unzip'
                  )
                }
                className="ml-2 text-slate-400 hover:text-cyan-300 flex-shrink-0"
                title="Kopírovat"
              >
                {copiedKey === 'copy-unzip' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Method B: Direct Terminal Generator */}
          <div className="bg-[#081226] border border-cyan-500/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                2. Přímé vytvoření v terminálu
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    `mkdir -p ~/jarvis-core/{core,agents,gpu,voice,git,config,systemd,logs} && cd ~/jarvis-core && touch core/__init__.py agents/__init__.py gpu/__init__.py voice/__init__.py git/__init__.py config/__init__.py && echo -e '# J.A.R.V.I.S. Core\\n\\nPersonal AI Core for Fedora 44.' > README.md && echo -e '__pycache__/\\n.venv/\\n.env' > .gitignore && echo -e 'google-genai>=2.4.0\\nlangchain>=0.3.0\\ncrewai>=0.86.0\\nrich>=13.9.0' > requirements.txt && echo -e '#!/usr/bin/env bash\\npython3 jarvis_bridge.py' > run.sh && chmod +x run.sh && ls -la`,
                    'copy-direct'
                  )
                }
                className="text-slate-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                title="Kopírovat příkaz"
              >
                {copiedKey === 'copy-direct' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Zkopírováno</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Kopírovat příkaz</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Zkopírujte příkaz a vložte jej do terminálu. Vytvoří celou strukturu složek i souborů ihned na disku.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Directory Tree (Left) vs Code Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Interactive Directory Tree */}
        <div className="lg:col-span-5 bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 hud-glow-cyan backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-cyan-500/15 mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="font-hud tracking-wider text-sm font-bold text-cyan-300 uppercase">
                Adresářová Struktura
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">~/jarvis-core</span>
          </div>

          <div className="space-y-1 font-mono text-xs select-none">
            {workspaceTree.map((item) => {
              if (item.type === 'folder') {
                return (
                  <div key={item.id} className="space-y-1 pt-1">
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold px-2 py-1 rounded bg-amber-950/20 border border-amber-500/15">
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.name}</span>
                    </div>

                    <div className="pl-4 space-y-0.5 border-l border-cyan-500/15 ml-2">
                      {item.children?.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            setSelectedFile(child.path);
                            playJarvisSound('blip');
                          }}
                          className={`w-full text-left flex items-center justify-between px-2 py-1 rounded transition-colors text-xs ${
                            selectedFile === child.path
                              ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                              : 'text-slate-300 hover:text-cyan-200 hover:bg-[#070d1c]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCode className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                            <span className="truncate">{child.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              // Root level files
              const isSelected = selectedFile === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedFile(item.path);
                    playJarvisSound('blip');
                  }}
                  className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                      : 'text-slate-300 hover:text-cyan-200 hover:bg-[#070d1c]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {item.name.endsWith('.sh') ? (
                      <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : item.name.endsWith('.py') ? (
                      <Code2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="font-semibold truncate">{item.name}</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {item.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code Viewer & Actions */}
        <div className="lg:col-span-7 bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl overflow-hidden hud-glow-cyan backdrop-blur-md">
          {/* File Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#081226] border-b border-cyan-500/15">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-cyan-400 font-bold">{activeFileData.path}</span>
              {activeFileData.desc && (
                <span className="hidden sm:inline text-slate-400 text-[11px]">
                  · {activeFileData.desc}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(activeFileData.content, activeFileData.path)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/25 rounded transition-colors"
              >
                {copiedKey === activeFileData.path ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Zkopírováno</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Kopírovat soubor</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onAskJarvis(
                    `Jarvisi, analyzuj a vysvětli modul '${activeFileData.path}' v naší architektuře a navrhni případné optimalizace pro Fedoru 44.`
                  );
                }}
                className="px-2.5 py-1 text-xs font-mono text-cyan-300 hover:text-cyan-100 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded transition-colors"
                title="Konzultovat soubor s Jarvisem v chatu"
              >
                Konzultovat
              </button>
            </div>
          </div>

          {/* Code display block */}
          <div className="p-4 bg-[#040813] text-xs font-mono text-slate-200 overflow-x-auto max-h-[580px] leading-relaxed">
            <pre className="whitespace-pre">
              <code>{activeFileData.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
