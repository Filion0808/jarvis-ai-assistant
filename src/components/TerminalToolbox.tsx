import React, { useState } from 'react';
import { TerminalSnippet } from '../types/jarvis';
import { TERMINAL_SNIPPETS } from '../data/terminalSnippets';
import { Terminal, Copy, Check, Play, HelpCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { playJarvisSound } from '../utils/audio';

interface TerminalToolboxProps {
  onAskJarvis: (prompt: string) => void;
}

export const TerminalToolbox: React.FC<TerminalToolboxProps> = ({ onAskJarvis }) => {
  const [snippets] = useState<TerminalSnippet[]>(TERMINAL_SNIPPETS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSandboxSnippet, setActiveSandboxSnippet] = useState<TerminalSnippet | null>(null);
  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);

  const filteredSnippets = selectedCategory === 'all'
    ? snippets
    : snippets.filter((s) => s.category === selectedCategory);

  const handleCopy = (snippet: TerminalSnippet) => {
    navigator.clipboard.writeText(snippet.command);
    setCopiedId(snippet.id);
    playJarvisSound('blip');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunSandbox = (snippet: TerminalSnippet) => {
    setActiveSandboxSnippet(snippet);
    setSandboxRunning(true);
    playJarvisSound('process');

    setTimeout(() => {
      setSandboxRunning(false);
      playJarvisSound('complete');
    }, 450);
  };

  const handleExplain = (snippet: TerminalSnippet) => {
    playJarvisSound('blip');
    const prompt = `Jarvisi, vysvětli mi detailně tento příkaz pro Fedoru 44 / KDE Plasma a navrhni případné parametry či alternativy:
Příkaz: \`${snippet.command}\`
Účel: ${snippet.description}`;
    onAskJarvis(prompt);
  };

  return (
    <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 mb-4">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h2 className="font-hud tracking-wider text-base sm:text-lg font-bold text-cyan-300 uppercase">
            Fedora 44 &amp; KDE Plasma Terminálová Konzole
          </h2>
          <span className="text-xs font-mono text-cyan-400/80">
            Ověřené systémové příkazy
          </span>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 text-xs font-mono">
        {[
          { id: 'all', label: 'Všechny příkazy' },
          { id: 'fedora', label: 'Fedora DNF & Systém' },
          { id: 'kde', label: 'KDE Plasma (Wayland)' },
          { id: 'gpu', label: 'AMD RX 7600 & ROCm' },
          { id: 'python', label: 'Python .venv & AI' },
          { id: 'logs', label: 'Systemd Logy' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCategory(tab.id);
              playJarvisSound('blip');
            }}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              selectedCategory === tab.id
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Snippet cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {filteredSnippets.map((snippet) => (
          <div
            key={snippet.id}
            className="bg-[#070d1a] border border-cyan-500/15 hover:border-cyan-500/35 rounded-lg p-3.5 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  {snippet.riskLevel === 'safe' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : snippet.riskLevel === 'caution' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  {snippet.title}
                </span>

                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300">
                  {snippet.category}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                {snippet.description}
              </p>

              {/* Command box */}
              <div className="bg-[#040711] border border-cyan-500/20 rounded p-2 font-mono text-xs text-cyan-300 overflow-x-auto select-all">
                <code>{snippet.command}</code>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <button
                onClick={() => handleRunSandbox(snippet)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/20 rounded transition-colors"
                title="Simulovat spuštění v sandbox terminálu"
              >
                <Play className="w-3 h-3 text-cyan-400" />
                <span>Testovat výstup</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExplain(snippet)}
                  className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                  title="Požádat Jarvise o vysvětlení a kontext"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleCopy(snippet)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-200 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/50 rounded transition-colors"
                >
                  {copiedId === snippet.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Zkopírováno</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopírovat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Sandbox Output Drawer */}
      {activeSandboxSnippet && (
        <div className="bg-[#03060f] border border-cyan-500/30 rounded-lg p-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 mb-2">
            <span className="text-cyan-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              fedora@desktop: ~ (Wayland Session)
            </span>
            <button
              onClick={() => setActiveSandboxSnippet(null)}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded hover:bg-slate-800"
            >
              Zavřít výstup
            </button>
          </div>

          <div className="text-slate-400 mb-1">
            <span className="text-emerald-400 font-bold">$ </span>
            <span className="text-slate-200">{activeSandboxSnippet.command}</span>
          </div>

          {sandboxRunning ? (
            <div className="text-cyan-400 animate-pulse py-2">
              [SYSTEM] Spouštím v subsystému Fedora 44...
            </div>
          ) : (
            <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {activeSandboxSnippet.simulatedOutput || 'Příkaz proběhl bez výstupu (návratový kód 0).'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
