import React, { useState } from 'react';
import { PythonModule } from '../types/jarvis';
import { INITIAL_PYTHON_MODULES } from '../data/pythonModules';
import { Code2, Copy, Check, Download, Sparkles, FileCode, Layers, Plus } from 'lucide-react';
import { playJarvisSound } from '../utils/audio';

interface CodeArchitectProps {
  onRefactorWithJarvis: (prompt: string) => void;
}

export const CodeArchitect: React.FC<CodeArchitectProps> = ({ onRefactorWithJarvis }) => {
  const [modules, setModules] = useState<PythonModule[]>(INITIAL_PYTHON_MODULES);
  const [selectedModuleId, setSelectedModuleId] = useState<string>(INITIAL_PYTHON_MODULES[0].id);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedModule = modules.find((m) => m.id === selectedModuleId) || modules[0];

  const filteredModules = filterCategory === 'all'
    ? modules
    : modules.filter((m) => m.category === filterCategory);

  const handleCopyCode = () => {
    if (!selectedModule) return;
    navigator.clipboard.writeText(selectedModule.code);
    setCopied(true);
    playJarvisSound('blip');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!selectedModule) return;
    const blob = new Blob([selectedModule.code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedModule.filename.split('/').pop() || 'jarvis_module.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playJarvisSound('complete');
  };

  const handleExportAll = () => {
    setIsExporting(true);
    playJarvisSound('process');

    // Create a aggregated python project script or downloadable bundle
    let bundleText = `# ========================================================\n# J.A.R.V.I.S. PYTHON ARCHITECTURE BUNDLE\n# Target: Fedora Linux 44 (KDE Plasma 6.7.5, Wayland)\n# Hardware: AMD Ryzen 5 5600GT | RX 7600 (8GB) | 32 GB RAM\n# ========================================================\n\n`;

    modules.forEach((mod) => {
      bundleText += `\n# ========================================================\n# FILE: ${mod.filename}\n# Description: ${mod.description}\n# Dependencies: ${mod.dependencies.join(', ')}\n# ========================================================\n\n`;
      bundleText += mod.code + '\n\n';
    });

    const blob = new Blob([bundleText], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jarvis_python_project_bundle.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setIsExporting(false);
      playJarvisSound('complete');
    }, 400);
  };

  const handleAskJarvisToRefactor = () => {
    playJarvisSound('blip');
    const prompt = `Jarvisi, podívej se na můj modul "${selectedModule.filename}":
Popis: ${selectedModule.description}
Knihovny: ${selectedModule.dependencies.join(', ')}

KÓD:
\`\`\`python
${selectedModule.code}
\`\`\`

Navrhni a vygeneruj vylepšenou, robustní verzi tohoto modulu s ohledem na mé prostředí (Fedora 44, AMD Ryzen 5 5600GT, RX 7600 a Python venv). Přidej asynchronní zpracování, detailní ošetření výjimek a připrav ho k integraci do mého projektu.`;

    onRefactorWithJarvis(prompt);
  };

  return (
    <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 sm:p-5 hud-glow-cyan backdrop-blur-md">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 mb-4">
        <div className="flex items-center gap-2.5">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <h2 className="font-hud tracking-wider text-base sm:text-lg font-bold text-cyan-300 uppercase">
            Jarvis Python Architektura
          </h2>
          <span className="text-xs font-mono text-cyan-400/80">
            {modules.length} modulů v architektuře
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-md transition-colors"
            title="Exportovat všechny moduly do jednoho Python bundle souboru"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exportuji...' : 'Exportovat projekt (.py)'}</span>
          </button>
        </div>
      </div>

      {/* Category selector */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 text-xs font-mono">
        {[
          { id: 'all', label: 'Všechny moduly' },
          { id: 'core', label: 'Core / Jádro' },
          { id: 'agents', label: 'CrewAI & Agenti' },
          { id: 'gpu', label: 'Ollama & RX 7600' },
          { id: 'voice', label: 'Hlasový Engine' },
          { id: 'config', label: 'Konfigurace' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilterCategory(tab.id);
              playJarvisSound('blip');
            }}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              filterCategory === tab.id
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Studio split: File sidebar & Code viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Module list column */}
        <div className="lg:col-span-4 space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filteredModules.map((mod) => {
            const isSelected = mod.id === selectedModule.id;
            return (
              <div
                key={mod.id}
                onClick={() => {
                  setSelectedModuleId(mod.id);
                  playJarvisSound('blip');
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-[#070d1a] border-cyan-500/10 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    {mod.filename}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300">
                    {mod.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {mod.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {mod.dependencies.map((dep, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.2 rounded"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Code viewer column */}
        <div className="lg:col-span-8 flex flex-col bg-[#050914] border border-cyan-500/20 rounded-lg overflow-hidden">
          {/* Code Viewer Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#091122] border-b border-cyan-500/15">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-slate-200">
                {selectedModule.filename}
              </span>
              <span className="text-[11px] text-slate-500">
                ({selectedModule.code.split('\n').length} řádků)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAskJarvisToRefactor}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-hud tracking-wide font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/30 rounded transition-colors"
                title="Poslat modul Jarvisovi pro refaktoring a vylepšení"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Refaktorovat s Jarvisem</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/20 rounded transition-colors"
                title="Kopírovat kód do schránky"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>

              <button
                onClick={handleDownloadFile}
                className="p-1 text-slate-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/20 rounded transition-colors"
                title="Stáhnout tento .py soubor"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Code content with scrollbar */}
          <div className="p-3 font-mono text-xs overflow-auto max-h-[420px] bg-[#050914] text-slate-200 leading-relaxed">
            <pre className="whitespace-pre">
              <code>{selectedModule.code}</code>
            </pre>
          </div>

          {/* Module metadata footer */}
          <div className="px-3 py-2 bg-[#091122]/80 border-t border-cyan-500/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
            <div>
              Závislosti:{' '}
              <span className="text-cyan-300">
                {selectedModule.dependencies.join(', ')}
              </span>
            </div>
            <div className="text-slate-500">
              Cílové prostředí: Fedora 44 (.venv)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
