import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Github,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Clock,
  Terminal,
  FileCode,
  Download,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';
import { PythonModule, GitHubSyncConfig, GitHubSyncLog } from '../types/jarvis';
import { INITIAL_PYTHON_MODULES } from '../data/pythonModules';
import { playJarvisSound } from '../utils/audio';
import { executeOnPC } from '../services/localBridge';

interface GitHubStorageProps {
  onAskJarvis: (prompt: string) => void;
  bridgeOnline: boolean;
}

export const GitHubStorage: React.FC<GitHubStorageProps> = ({ onAskJarvis, bridgeOnline }) => {
  const [config, setConfig] = useState<GitHubSyncConfig>(() => {
    try {
      const saved = localStorage.getItem('jarvis_github_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.repoOwner === 'filip-bardon') {
          parsed.repoOwner = 'Filion0808';
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      repoOwner: 'Filion0808',
      repoName: 'jarvis-ai-assistant',
      branch: 'main',
      token: '',
      isPrivate: false,
      autoSync: false,
      lastSyncTime: '',
      lastCommitMessage: '',
    };
  });

  const [showToken, setShowToken] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [logs, setLogs] = useState<GitHubSyncLog[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_github_logs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'init-log',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'info',
        message: 'GitHub Storage modul inicializován. Připraven k synchronizaci souborů.',
      },
    ];
  });

  // Save config
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_github_config', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Save logs
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_github_logs', JSON.stringify(logs));
    } catch {
      // ignore
    }
  }, [logs]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playJarvisSound('blip');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDirectGitHubSync = async () => {
    if (!config.repoOwner || !config.repoName) {
      alert('Zadejte prosím vaše GitHub uživatelské jméno a název repozitáře.');
      return;
    }

    if (!config.token) {
      alert(
        'Pro přímé nahrání z webu zadejte váš GitHub Personal Access Token (PAT). Případně můžete níže použít terminálové příkazy přes Git CLI.'
      );
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');
    playJarvisSound('process');

    const filesToSync = INITIAL_PYTHON_MODULES.map((m) => ({
      path: m.filename,
      content: m.code,
    }));

    // Add README.md and .gitignore
    filesToSync.push({
      path: 'README.md',
      content: `# J.A.R.V.I.S. Personal AI System & Engineering Core
Autonomní osobní asistent inspirovaný Jarvisem z Iron Mana.

## Systémové Prostředí:
- **Host OS:** Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)
- **CPU:** AMD Ryzen 5 5600GT (6C/12T @ 4.6 GHz)
- **RAM:** 32 GB DDR4
- **GPU:** AMD Radeon RX 7600 (8 GB VRAM, RDNA 3, gfx1102)
- **Vývojové prostředí:** Python 3 (.venv) s \`google-genai\`, \`langchain\`, \`crewai\` a lokální \`Ollama\` (ROCm).

## Spuštění lokálního daemona:
\`\`\`bash
python3 jarvis_bridge.py
\`\`\`
`,
    });

    filesToSync.push({
      path: '.gitignore',
      content: `__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
ENV/
.env
*.log
.DS_Store
dist/
node_modules/
`,
    });

    filesToSync.push({
      path: 'requirements.txt',
      content: `google-genai>=2.4.0
langchain>=0.3.0
langchain-google-genai>=2.0.0
crewai>=0.86.0
pydantic>=2.10.0
rich>=13.9.0
httpx>=0.28.0
`,
    });

    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.repoOwner.trim(),
          repo: config.repoName.trim(),
          branch: config.branch || 'main',
          token: config.token.trim(),
          files: filesToSync,
          commitMessage: `J.A.R.V.I.S. Core synchronizace: ${new Date().toLocaleString()}`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncStatus('success');
        setStatusMessage(data.message);
        setRepoUrl(data.repoUrl);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setConfig((prev) => ({
          ...prev,
          lastSyncTime: now,
          lastCommitMessage: `Synchronizováno ${data.syncedCount} souborů`,
        }));

        setLogs((prev) => [
          {
            id: `log-${Date.now()}`,
            timestamp: now,
            status: 'success',
            message: `Úspěšně zálohováno ${data.syncedCount}/${data.totalCount} souborů do ${data.repoUrl}`,
          },
          ...prev.slice(0, 15),
        ]);

        playJarvisSound('complete');
      } else {
        throw new Error(data.error || 'Neznámá chyba při synchronizaci');
      }
    } catch (err: any) {
      setSyncStatus('error');
      setStatusMessage(err.message || 'Chyba spojení s GitHubem');
      setLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'error',
          message: `Chyba zálohy: ${err.message}`,
        },
        ...prev.slice(0, 15),
      ]);
      playJarvisSound('alert');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunGitPushOnPC = async () => {
    const gitCommand = `cd ~/jarvis 2>/dev/null || cd ~; git add . && git commit -m "J.A.R.V.I.S. backup: $(date)" && git push origin ${config.branch || 'main'}`;
    playJarvisSound('blip');
    const res = await executeOnPC('custom', gitCommand);
    if (res.success) {
      setLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'success',
          message: `Příkaz 'git push' byl odeslán do vašeho terminálu Fedora 44.`,
        },
        ...prev,
      ]);
      playJarvisSound('complete');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 mb-4">
          <div className="flex items-center gap-2.5">
            <Github className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud tracking-wider text-base sm:text-lg font-bold text-cyan-300 uppercase">
              GitHub Cloud Storage &amp; Automatická Záloha
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
              GIT SYNC // ONLINE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onAskJarvis(
                  `Jarvisi, jak nejlépe nastavit a strukturovat GitHub repozitář pro náš projekt s ohledem na automatické verzování zdrojových souborů a zálohování na Fedoře 44?`
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-hud tracking-wide font-semibold text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-md transition-colors"
            >
              <span>Poradit se s Jarvisem</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl mb-3">
          Tento modul se stará o to, aby veškerý váš zdrojový kód J.A.R.V.I.S.e (Python moduly,
          konfigurace, skript lokálního daemona) byl bezpečně uložen a uchováván ve vašem vzdáleném{' '}
          <strong className="text-cyan-300">GitHub repozitáři</strong>.
        </p>

        {/* Credentials FAQ & Explainer Box */}
        <div className="bg-[#050a17] border border-cyan-500/25 rounded-lg p-3 text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Jak zjistit svůj GitHub Username a Password / Token:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
            <div className="bg-[#081226] p-2.5 rounded border border-cyan-500/15">
              <div className="text-cyan-400 font-semibold mb-1">1. Uživatelské jméno (Username):</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Vaše jméno/přezdívka na <a href="https://github.com" target="_blank" rel="noreferrer" className="text-cyan-300 underline">github.com</a> (např. <code className="text-amber-300 font-semibold">filip-bardon</code>).
                Zjistíte jej po přihlášení na github.com vpravo nahoře pod svou ikonou profilu. Pokud ještě nemáte účet, zaregistrujte se zdarma na{' '}
                <a href="https://github.com/signup" target="_blank" rel="noreferrer" className="text-cyan-300 underline">github.com/signup</a>.
              </p>
            </div>

            <div className="bg-[#081226] p-2.5 rounded border border-cyan-500/15">
              <div className="text-amber-400 font-semibold mb-1">2. Heslo (Password vs Token):</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                GitHub <strong>již od roku 2021 nepovoluje</strong> zadávat klasické heslo k účtu při nahrávání kódu.
                Místo hesla se používá buď bezpečný <strong className="text-slate-200">Personal Access Token</strong> (vytvoříte jedním klikem na{' '}
                <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noreferrer" className="text-cyan-300 underline">github.com/settings/tokens</a> s právem <em>repo</em>),
                nebo v terminálu jednoduše spustíte <code className="text-cyan-300">gh auth login</code> (kde se heslo nezadává vůbec).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: GitHub Credentials & Direct Web Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Settings Column */}
        <div className="lg:col-span-6 bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/15">
              <FolderGit2 className="w-4 h-4 text-cyan-400" />
              <h3 className="font-hud tracking-wider text-sm font-bold text-cyan-300 uppercase">
                Konfigurace Vašeho Repozitáře
              </h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  GitHub Uživatelské jméno / Organizace:
                </label>
                <input
                  type="text"
                  value={config.repoOwner}
                  onChange={(e) => setConfig({ ...config, repoOwner: e.target.value })}
                  placeholder="např. filip-bardon"
                  className="w-full bg-[#050914] border border-cyan-500/25 focus:border-cyan-400 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Název repozitáře:</label>
                <input
                  type="text"
                  value={config.repoName}
                  onChange={(e) => setConfig({ ...config, repoName: e.target.value })}
                  placeholder="např. jarvis-ai-assistant"
                  className="w-full bg-[#050914] border border-cyan-500/25 focus:border-cyan-400 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Větev (Branch):</label>
                  <input
                    type="text"
                    value={config.branch}
                    onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                    placeholder="main"
                    className="w-full bg-[#050914] border border-cyan-500/25 focus:border-cyan-400 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Viditelnost:</label>
                  <div className="px-3 py-2 bg-[#050914] border border-cyan-500/25 rounded-lg text-cyan-300">
                    Veřejný / Public
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-400" />
                    GitHub Token (PAT - Personal Access Token):
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Vytvořit token</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={config.token || ''}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#050914] border border-cyan-500/25 focus:border-cyan-400 rounded-lg pl-3 pr-10 py-2 text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Token se ukládá pouze ve vašem lokálním prohlížeči. Vyžaduje oprávnění{' '}
                  <code className="text-cyan-300">repo</code>.
                </span>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="mt-4 pt-3 border-t border-cyan-500/15">
            <button
              onClick={handleDirectGitHubSync}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-hud tracking-wider font-bold text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4 text-cyan-300" />
              <span>{isSyncing ? 'SYNCHRONIZUJI S GITHUBEM...' : 'ULOŽIT VŠECHNY SOUBORY NA GITHUB'}</span>
            </button>

            {syncStatus === 'success' && (
              <div className="mt-2 text-xs font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{statusMessage}</span>
                </div>
                {repoUrl && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-300 hover:underline flex items-center gap-1 ml-2 flex-shrink-0"
                  >
                    <span>Otevřít repo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {syncStatus === 'error' && (
              <div className="mt-2 text-xs font-mono text-red-300 bg-red-950/40 border border-red-500/30 p-2.5 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Git CLI & Fedora 44 Automation Setup */}
        <div className="lg:col-span-6 bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500/15">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="font-hud tracking-wider text-sm font-bold text-cyan-300 uppercase">
                  Nastavení Přes Git CLI na Fedoře 44
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Terminálový postup</span>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Pokud preferujete oficiální nástroj <strong className="text-cyan-300">GitHub CLI (`gh`)</strong> přímo
              v terminálu vašeho systému Fedora 44, stačí spustit tyto 3 jednoduché kroky:
            </p>

            <div className="space-y-3 font-mono text-xs">
              {/* Step 1 */}
              <div className="bg-[#050914] border border-cyan-500/20 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-cyan-400 font-semibold">1. Instalace Git a GitHub CLI</span>
                  <button
                    onClick={() => handleCopy('sudo dnf install -y git gh', 'cli-1')}
                    className="text-slate-400 hover:text-cyan-300"
                    title="Kopírovat příkaz"
                  >
                    {copiedKey === 'cli-1' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <code className="text-slate-200">sudo dnf install -y git gh</code>
              </div>

              {/* Step 2 */}
              <div className="bg-[#050914] border border-cyan-500/20 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-cyan-400 font-semibold">2. Jednorázové přihlášení k účtu</span>
                  <button
                    onClick={() => handleCopy('gh auth login', 'cli-2')}
                    className="text-slate-400 hover:text-cyan-300"
                    title="Kopírovat příkaz"
                  >
                    {copiedKey === 'cli-2' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <code className="text-slate-200">gh auth login</code>
              </div>

              {/* Step 3 */}
              <div className="bg-[#050914] border border-cyan-500/20 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-cyan-400 font-semibold">3. Inicializace a vytvoření repozitáře</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `git init && git branch -M main && git add . && git commit -m "Initial commit: J.A.R.V.I.S. Core" || true; gh repo create ${config.repoName} --public --source=. --remote=origin --push`,
                        'cli-3'
                      )
                    }
                    className="text-slate-400 hover:text-cyan-300"
                    title="Kopírovat příkaz"
                  >
                    {copiedKey === 'cli-3' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <code className="text-cyan-300/90 break-all text-[11px]">
                  git init && git branch -M main && git add . && git commit -m "Initial J.A.R.V.I.S." ; gh repo create {config.repoName} --public --source=. --remote=origin --push
                </code>
              </div>
            </div>
          </div>

          {/* Quick Git Push on PC button */}
          <div className="mt-4 pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
            <button
              onClick={handleRunGitPushOnPC}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-hud tracking-wide font-bold bg-slate-900 hover:bg-cyan-950/50 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-200 rounded transition-all"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>SPUSTIT 'GIT PUSH' NA VAŠEM PC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automated Systemd Daily Backup Card & Sync History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Systemd Daily Timer */}
        <div className="lg:col-span-7 bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500/15">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-hud tracking-wider text-sm font-bold text-cyan-300 uppercase">
                Automatická Denní Záloha (Systemd Timer ve Fedora 44)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Automatizace</span>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Můžete nastavit, aby váš počítač každý den automaticky uložil všechny změny v J.A.R.V.I.S.i
            na GitHub pomocí uživatelského systemd časovače bez nutnosti zadávat heslo root:
          </p>

          <div className="bg-[#050914] border border-cyan-500/20 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
              <span>Příkaz pro aktivaci denního časovače:</span>
              <button
                onClick={() =>
                  handleCopy(
                    `mkdir -p ~/.config/systemd/user && python3 ~/jarvis/git/github_sync.py && systemctl --user daemon-reload && systemctl --user enable --now jarvis-backup.timer`,
                    'timer-cmd'
                  )
                }
                className="text-slate-400 hover:text-cyan-300"
              >
                {copiedKey === 'timer-cmd' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <pre className="text-cyan-300 overflow-x-auto text-[11px] whitespace-pre-wrap">
              systemctl --user enable --now jarvis-backup.timer
            </pre>
          </div>
        </div>

        {/* Sync History Logs */}
        <div className="lg:col-span-5 bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500/15">
            <span className="font-hud tracking-wider text-sm font-bold text-cyan-300 uppercase">
              Historie Záloh &amp; Záznamy
            </span>
            <span className="text-[10px] font-mono text-slate-400">{logs.length} záznamů</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded bg-[#060b17] border border-cyan-500/10 text-slate-300 flex items-start gap-2"
              >
                <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                  {log.timestamp}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    log.status === 'success'
                      ? 'bg-emerald-400'
                      : log.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-cyan-400'
                  }`}
                />
                <span className="text-xs flex-1 break-words leading-relaxed">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
