import React, { useState } from 'react';
import { Cpu, HardDrive, Monitor, Terminal, CheckCircle2, RefreshCw, Copy, Check } from 'lucide-react';
import { playJarvisSound } from '../utils/audio';

interface SystemTelemetryProps {
  onAskJarvis: (prompt: string) => void;
}

export const SystemTelemetry: React.FC<SystemTelemetryProps> = ({ onAskJarvis }) => {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopySpecs = () => {
    const specsText = `OS: Fedora Linux 44
DE: KDE Plasma 6.7.5 (Wayland session)
CPU: AMD Ryzen 5 5600GT (6C/12T @ 4.6 GHz)
RAM: 32 GB DDR4
GPU: AMD Radeon RX 7600 (8 GB GDDR6, Navi 33, gfx1102)
Env: Python 3 (.venv) | google-genai, langchain, crewai | Ollama ROCm ready`;
    navigator.clipboard.writeText(specsText);
    setCopied(true);
    playJarvisSound('blip');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    playJarvisSound('process');
    setTimeout(() => {
      setIsRefreshing(false);
      playJarvisSound('complete');
    }, 600);
  };

  return (
    <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="font-hud tracking-wider text-base sm:text-lg font-bold text-cyan-300 uppercase">
            Systémové Prostředí &amp; Telemetrie
          </h2>
          <span className="text-xs font-mono text-cyan-400/70 border border-cyan-500/30 px-2 py-0.5 rounded">
            STARK-RIG // ONLINE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySpecs}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/20 rounded transition-colors"
            title="Kopírovat systémové specifikace"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Zkopírováno' : 'Kopírovat specifikace'}</span>
          </button>

          <button
            onClick={handleRefresh}
            className="p-1.5 text-slate-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/20 rounded transition-colors"
            title="Obnovit telemetrii"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of hardware and environment specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* OS & Desktop Environment */}
        <div className="bg-[#070d1a] border border-cyan-500/15 rounded-lg p-3 hover:border-cyan-500/35 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <Monitor className="w-3.5 h-3.5" />
              OS &amp; DE
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Wayland
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-100">Fedora Linux 44</div>
          <div className="text-xs text-slate-400 mt-0.5">KDE Plasma 6.7.5</div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>KWin Compositor</span>
            <span className="text-cyan-300">Aktivní</span>
          </div>
        </div>

        {/* CPU Hardware */}
        <div className="bg-[#070d1a] border border-cyan-500/15 rounded-lg p-3 hover:border-cyan-500/35 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <Cpu className="w-3.5 h-3.5" />
              PROCESOR
            </span>
            <span className="text-cyan-300 font-mono">12 Vláken</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate">AMD Ryzen 5 5600GT</div>
          <div className="text-xs text-slate-400 mt-0.5">6 jader / 12 vláken @ 4.6 GHz</div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Architektura</span>
            <span className="text-cyan-300">Zen 3 (x86_64)</span>
          </div>
        </div>

        {/* Memory & RAM */}
        <div className="bg-[#070d1a] border border-cyan-500/15 rounded-lg p-3 hover:border-cyan-500/35 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <HardDrive className="w-3.5 h-3.5" />
              OPERAČNÍ PAMĚŤ
            </span>
            <span className="text-emerald-400 font-mono">32 GB</span>
          </div>
          <div className="text-sm font-semibold text-slate-100">32 GB DDR4 RAM</div>
          <div className="text-xs text-slate-400 mt-0.5">Dual-Channel konfigurace</div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Vyhrazeno pro AI/LLM</span>
            <span className="text-cyan-300">&gt; 24 GB volno</span>
          </div>
        </div>

        {/* Dedicated GPU (AMD Radeon RX 7600) */}
        <div className="bg-[#070d1a] border border-cyan-500/15 rounded-lg p-3 hover:border-cyan-500/35 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              GRAFICKÁ KARTA
            </span>
            <span className="text-amber-400 font-mono">8 GB VRAM</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate">AMD Radeon RX 7600</div>
          <div className="text-xs text-slate-400 mt-0.5">RDNA 3 / Navi 33 (gfx1102)</div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Ollama ROCm Override</span>
            <span className="text-amber-300 font-mono">11.0.0</span>
          </div>
        </div>
      </div>

      {/* Python Dev Stack & Quick Diagnostic actions */}
      <div className="mt-4 pt-3 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
          <span className="text-cyan-400 font-semibold flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5" />
            AI Vývojový Stack:
          </span>
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-cyan-300">
            Python 3 (.venv)
          </span>
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-emerald-300">
            google-genai
          </span>
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-indigo-300">
            langchain
          </span>
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-amber-300">
            crewai
          </span>
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-purple-300">
            Ollama (RX 7600)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playJarvisSound('blip');
              onAskJarvis(
                'Jarvisi, proveď kompletní diagnostiku mého prostředí: Fedora 44, KDE Plasma 6.7.5, Ryzen 5 5600GT, RX 7600 8GB a Python venv stack. Jaké optimalizace navrhuješ?'
              );
            }}
            className="px-3 py-1.5 text-xs font-hud tracking-wider font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 rounded-md transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            AUDIT PROSTŘEDÍ JARVISEM
          </button>
        </div>
      </div>
    </div>
  );
};
