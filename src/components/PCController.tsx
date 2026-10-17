import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Activity,
  Folder,
  Cpu,
  Camera,
  Settings,
  Lock,
  Volume2,
  Volume1,
  VolumeX,
  RefreshCw,
  Download,
  Copy,
  Check,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { PCAction, LocalBridgeStatus } from '../types/jarvis';
import { PREDEFINED_PC_ACTIONS, checkBridgeHealth, executeOnPC } from '../services/localBridge';
import { playJarvisSound } from '../utils/audio';

interface PCControllerProps {
  onAskJarvis: (prompt: string) => void;
  bridgeStatus: LocalBridgeStatus;
  setBridgeStatus: React.Dispatch<React.SetStateAction<LocalBridgeStatus>>;
}

export const PCController: React.FC<PCControllerProps> = ({
  onAskJarvis,
  bridgeStatus,
  setBridgeStatus,
}) => {
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [customCommand, setCustomCommand] = useState('');
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const getActionIcon = (iconName?: string) => {
    switch (iconName) {
      case 'terminal':
        return <Terminal className="w-4 h-4 text-cyan-400" />;
      case 'activity':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'folder':
        return <Folder className="w-4 h-4 text-blue-400" />;
      case 'cpu':
        return <Cpu className="w-4 h-4 text-amber-400" />;
      case 'camera':
        return <Camera className="w-4 h-4 text-purple-400" />;
      case 'settings':
        return <Settings className="w-4 h-4 text-slate-400" />;
      case 'lock':
        return <Lock className="w-4 h-4 text-red-400" />;
      case 'volume-2':
        return <Volume2 className="w-4 h-4 text-cyan-300" />;
      case 'volume-1':
        return <Volume1 className="w-4 h-4 text-cyan-300" />;
      case 'volume-x':
        return <VolumeX className="w-4 h-4 text-slate-400" />;
      case 'download':
        return <Download className="w-4 h-4 text-emerald-400" />;
      default:
        return <Terminal className="w-4 h-4 text-cyan-400" />;
    }
  };

  const handleRefreshBridge = async () => {
    setBridgeStatus((prev) => ({ ...prev, checking: true }));
    playJarvisSound('process');

    const result = await checkBridgeHealth();
    setBridgeStatus((prev) => ({
      ...prev,
      online: result.online,
      checking: false,
      desktop: result.data?.desktop || prev.desktop,
      terminal: result.data?.terminal || prev.terminal,
      lastChecked: Date.now(),
    }));

    if (result.online) {
      playJarvisSound('complete');
    } else {
      playJarvisSound('alert');
    }
  };

  const handleExecuteAction = async (action: PCAction) => {
    setExecutingActionId(action.id);
    playJarvisSound('blip');

    const result = await executeOnPC(action.type, action.command);

    setBridgeStatus((prev) => ({
      ...prev,
      lastExecutedCommand: action.command,
      lastExecutionResult: {
        success: result.success,
        message: result.message,
        pid: result.pid,
      },
    }));

    setExecutingActionId(null);
    playJarvisSound('complete');
  };

  const handleExecuteCustom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customCommand.trim()) return;

    const cmd = customCommand.trim();
    setExecutingActionId('custom');
    playJarvisSound('blip');

    const result = await executeOnPC('custom', cmd);

    setBridgeStatus((prev) => ({
      ...prev,
      lastExecutedCommand: cmd,
      lastExecutionResult: {
        success: result.success,
        message: result.message,
        pid: result.pid,
      },
    }));

    setExecutingActionId(null);
    playJarvisSound('complete');
  };

  const handleCopyBridgeCommand = () => {
    const cmd = 'python3 jarvis_bridge.py';
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    playJarvisSound('blip');
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleDownloadBridge = () => {
    const link = document.createElement('a');
    link.href = '/api/bridge-script';
    link.download = 'jarvis_bridge.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playJarvisSound('complete');
  };

  return (
    <div className="space-y-4">
      {/* Top Bridge Status Banner */}
      <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                bridgeStatus.online
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                  : 'bg-amber-400 animate-ping'
              }`}
            />
            <h2 className="font-hud tracking-wider text-base sm:text-lg font-bold text-cyan-300 uppercase">
              Přímé Ovládání PC (Local System Bridge)
            </h2>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded border ${
                bridgeStatus.online
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}
            >
              {bridgeStatus.online ? 'BRIDGE SPOJEN // FEDORA 44' : 'OFFLINE // ČEKÁ NA DAEMON'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshBridge}
              disabled={bridgeStatus.checking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-md transition-colors"
              title="Znovu otestovat spojení s lokálním daemonem na http://127.0.0.1:9099"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${bridgeStatus.checking ? 'animate-spin text-cyan-400' : ''}`}
              />
              <span>{bridgeStatus.checking ? 'Ověřuji...' : 'Ověřit spojení'}</span>
            </button>
          </div>
        </div>

        {/* Bridge Connection Guide / Instruction Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-8 text-xs text-slate-300 leading-relaxed space-y-1">
            <p>
              Tento subsystém umožňuje J.A.R.V.I.S.ovi přímo spouštět aplikace na vaší ploše{' '}
              <strong className="text-cyan-300">Fedora Linux 44 KDE Wayland</strong>.
            </p>
            {!bridgeStatus.online ? (
              <p className="text-amber-300/90">
                Pro aktivaci přímého spouštění stačí ve vašem terminálu spustit lokálního daemona:
              </p>
            ) : (
              <p className="text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Lokální daemon je aktivní na portu 9099. Příkazy se ihned spouštějí ve vašem okně
                KDE!
              </p>
            )}
          </div>

          <div className="md:col-span-4 flex flex-col gap-2">
            <div className="flex items-center gap-1 bg-[#050914] border border-cyan-500/30 rounded px-2.5 py-1.5 font-mono text-xs text-cyan-300 justify-between">
              <span className="truncate">python3 jarvis_bridge.py</span>
              <button
                onClick={handleCopyBridgeCommand}
                className="text-slate-400 hover:text-cyan-300 ml-2"
                title="Kopírovat spouštěcí příkaz"
              >
                {copiedCommand ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              onClick={handleDownloadBridge}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors"
              title="Stáhnout jarvis_bridge.py do vašeho počítače"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Stáhnout skript daemona (.py)</span>
            </button>
          </div>
        </div>

        {/* Last execution report if present */}
        {bridgeStatus.lastExecutionResult && (
          <div className="mt-3 pt-3 border-t border-cyan-500/15 flex items-center justify-between text-xs font-mono text-slate-300 bg-[#060b17] p-2.5 rounded border border-cyan-500/10">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">POSLEDNÍ VÝKON:</span>
              <code className="text-amber-300 font-semibold">
                {bridgeStatus.lastExecutedCommand}
              </code>
            </div>
            <div className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{bridgeStatus.lastExecutionResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* 1-Click Action Grid */}
      <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15 mb-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" />
            <h3 className="font-hud tracking-wider text-base font-bold text-cyan-300 uppercase">
              Přímé Systémové Úkoly na PC
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">12 připravených akcí</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PREDEFINED_PC_ACTIONS.map((action) => {
            const isExecuting = executingActionId === action.id;
            return (
              <div
                key={action.id}
                className="bg-[#070d1a] border border-cyan-500/15 hover:border-cyan-500/40 rounded-lg p-3.5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                      {getActionIcon(action.icon)}
                      {action.label}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-400">
                      {action.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    {action.description}
                  </p>

                  <div className="bg-[#040711] border border-cyan-500/20 rounded px-2 py-1 font-mono text-[11px] text-cyan-300/90 truncate">
                    <code>{action.command}</code>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleExecuteAction(action)}
                    disabled={isExecuting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-hud tracking-wider font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 rounded transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] group-hover:border-cyan-400"
                  >
                    <Play className="w-3 h-3 text-cyan-300" />
                    <span>{isExecuting ? 'PROVÁDÍM...' : 'SPUSTIT NA PC'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onAskJarvis(
                        `Jarvisi, spusť na mém PC akci '${action.label}' (příkaz: ${action.command}) a vysvětli její parametry.`
                      );
                    }}
                    className="px-2 py-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700/60"
                    title="Požádat Jarvise v chatu"
                  >
                    Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Command Dispatcher Form */}
      <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
        <h3 className="font-hud tracking-wider text-base font-bold text-cyan-300 uppercase mb-2">
          Vlastní Bash Příkaz pro Spuštění na PC
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Zadejte libovolný příkaz (např. <code className="text-cyan-300">kate &amp;</code>,{' '}
          <code className="text-cyan-300">firefox &amp;</code> nebo{' '}
          <code className="text-cyan-300">notify-send 'Test' 'Ahoj'</code>), který bude předán do
          vašeho Fedora prostředí:
        </p>

        <form onSubmit={handleExecuteCustom} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-xs">
              $
            </span>
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="např. konsole -e fastfetch &"
              className="w-full bg-[#050914] border border-cyan-500/25 focus:border-cyan-400 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={!customCommand.trim() || executingActionId === 'custom'}
            className="flex items-center gap-1.5 px-4 py-2 font-hud tracking-wider font-bold text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 rounded-lg disabled:opacity-40 transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)]"
          >
            <span>VYKONAT</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
