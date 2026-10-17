import React, { useState, useEffect } from 'react';
import { ArcReactor } from './components/ArcReactor';
import { SystemTelemetry } from './components/SystemTelemetry';
import { CodeArchitect } from './components/CodeArchitect';
import { TerminalToolbox } from './components/TerminalToolbox';
import { ChatInterface } from './components/ChatInterface';
import { PCController } from './components/PCController';
import { GitHubStorage } from './components/GitHubStorage';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { VoiceControls } from './components/VoiceControls';
import { Message, LocalBridgeStatus } from './types/jarvis';
import { checkBridgeHealth, syncFilesToLocalPC } from './services/localBridge';
import { INITIAL_PYTHON_MODULES } from './data/pythonModules';
import {
  MessageSquare,
  Code2,
  Terminal,
  Cpu,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Github,
  FolderOpen,
  RefreshCw,
  Mic,
} from 'lucide-react';
import { playJarvisSound, speakJarvis } from './utils/audio';

const INITIAL_GREETING: Message = {
  id: 'jarvis-init-1',
  role: 'assistant',
  content: `Dobré odpoledne, pane. Všechny subsystémy J.A.R.V.I.S. jsou plně online a připraveny k vašim službám.

Prostředí **Fedora Linux 44** pod **KDE Plasma 6.7.5 (Wayland)** vykazuje optimální integritu. Vašich 12 procesorových vláken **AMD Ryzen 5 5600GT**, **32 GB RAM** i grafická jednotka **AMD Radeon RX 7600 (8 GB VRAM)** jsou v pohotovosti.

Nyní mám také aktivní **Local System Bridge** pro přímé ovládání vašeho počítače. Pokud mi dáte pokyn například *"otevři terminál"*, *"spusť systémový monitor btop"* nebo *"zamkni obrazovku"*, okamžitě jej na vašem PC provedu.

Čím dnes začneme, pane?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'pc_control' | 'workspace' | 'github' | 'architect' | 'terminal' | 'telemetry'>('chat');
  const [bridgeStatus, setBridgeStatus] = useState<LocalBridgeStatus>({
    online: false,
    checking: false,
    host: '127.0.0.1:9099',
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [INITIAL_GREETING];
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [jarvisStatus, setJarvisStatus] = useState<'idle' | 'processing' | 'speaking' | 'listening'>('idle');
  const [presetPrompt, setPresetPrompt] = useState<string | null>(null);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_chat_history', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Check local bridge health on startup and periodically
  useEffect(() => {
    const check = async () => {
      const res = await checkBridgeHealth();
      setBridgeStatus((prev) => ({
        ...prev,
        online: res.online,
        desktop: res.data?.desktop,
        terminal: res.data?.terminal,
        lastChecked: Date.now(),
      }));
    };
    check();
    const interval = setInterval(check, 7000);
    return () => clearInterval(interval);
  }, []);

  const [isSyncingPC, setIsSyncingPC] = useState(false);
  const [pcSyncNotice, setPcSyncNotice] = useState<string | null>(null);

  const handleLiveSyncToPC = async () => {
    setIsSyncingPC(true);
    playJarvisSound('process');

    const files = INITIAL_PYTHON_MODULES.map((m) => ({
      path: m.filename,
      content: m.code,
    }));

    const res = await syncFilesToLocalPC(files);
    setIsSyncingPC(false);

    if (res.success) {
      playJarvisSound('complete');
      setPcSyncNotice(res.message);
    } else {
      playJarvisSound('alert');
      setPcSyncNotice(res.message);
    }

    setTimeout(() => setPcSyncNotice(null), 5000);
  };

  const handleSendMessage = async (userText: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsStreaming(true);
    setJarvisStatus('processing');
    playJarvisSound('process');

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...newHistory, initialAssistantMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: `Aktivní záložka: ${activeTab}. Systém: Fedora 44 KDE Plasma 6.7.5 Wayland, Ryzen 5 5600GT, RX 7600 (8GB), 32GB RAM, Python venv.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chyba serveru: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Chybí tělo odpovědi z toku dat.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                  )
                );
              }
            } catch {
              // ignore parse errors for partial chunks
            }
          }
        }
      }

      setIsStreaming(false);
      setJarvisStatus('idle');
      playJarvisSound('complete');
    } catch (err: any) {
      console.error('Error querying Jarvis:', err);
      setIsStreaming(false);
      setJarvisStatus('idle');
      playJarvisSound('alert');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `Omlouvám se, pane. Došlo k neočekávanému výpadku v neuronovém komunikačním kanálu: ${
                  err?.message || 'Neznámá chyba'
                }`,
              }
            : m
        )
      );
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Přejete si vymazat celou historii relace s Jarvisem?')) {
      playJarvisSound('blip');
      setMessages([INITIAL_GREETING]);
      localStorage.removeItem('jarvis_chat_history');
    }
  };

  const handleTriggerPrompt = (prompt: string) => {
    setPresetPrompt(prompt);
    setActiveTab('chat');
  };

  const handleReactorClick = () => {
    playJarvisSound('startup');
    speakJarvis(
      'K vašim službám, pane. Všechny subsystémy Fedora Linuxu i Python jádro jsou plně operativní.',
      () => setJarvisStatus('speaking'),
      () => setJarvisStatus('idle')
    );
  };

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100 flex flex-col hud-grid-bg relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top HUD Status Bar */}
      <header className="sticky top-0 z-50 bg-[#060b17]/90 border-b border-cyan-500/20 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="relative cursor-pointer" onClick={handleReactorClick} title="Aktivovat J.A.R.V.I.S.e">
              <ArcReactor status={jarvisStatus} size={42} interactive={true} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-hud tracking-widest text-lg sm:text-xl font-extrabold text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                  J.A.R.V.I.S.
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  CORE v4.4-STARK
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Personal AI System &amp; Engineering Core
              </div>
            </div>
          </div>

          {/* Quick Hardware Badges & PC Bridge Status */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => {
                setActiveTab('pc_control');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
                bridgeStatus.online
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:border-amber-400'
              }`}
              title="Klikněte pro otevření panelu ovládání PC a ověření spojení"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  bridgeStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{bridgeStatus.online ? 'PC BRIDGE: SPOJENO' : 'PC BRIDGE: PŘIPRAVEN'}</span>
            </button>

            <button
              onClick={handleLiveSyncToPC}
              disabled={isSyncingPC}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
              title="Okamžitě přenést a přepsat všechny opravené soubory přímo do vašeho ~/jarvis-core na disku"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncingPC ? 'animate-spin' : ''}`} />
              <span>{isSyncingPC ? 'SYNCHRONIZUJI...' : '⚡ SYNC NA PC'}</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#091224] border border-cyan-500/20 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Fedora 44 / KDE 6.7.5</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#091224] border border-cyan-500/20 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ryzen 5 5600GT (12T)</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[#091224] border border-cyan-500/25 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab('chat');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>KONZOLE</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('voice');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'voice'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-red-400" />
              <span>HLASOVÉ OVLÁDÁNÍ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('pc_control');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'pc_control'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>OVLÁDÁNÍ PC</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('workspace');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'workspace'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>SLOŽKY &amp; INSTALÁTOR</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('github');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'github'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Github className="w-3.5 h-3.5 text-cyan-400" />
              <span>GITHUB ZÁLOHA</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('architect');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'architect'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>PYTHON ARCHITEKTURA</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('terminal');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'terminal'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>FEDORA / KDE</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('telemetry');
                playJarvisSound('blip');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-hud tracking-wide font-semibold transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>TELEMETRIE</span>
            </button>
          </div>
        </div>
      </header>

      {pcSyncNotice && (
        <div className="max-w-7xl w-full mx-auto px-4 py-2 bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs font-mono rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.25)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>{pcSyncNotice}</span>
          </div>
          <button
            onClick={() => setPcSyncNotice(null)}
            className="text-slate-400 hover:text-cyan-200 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
            {/* Left Arc Reactor HUD & System quick card */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-5 flex flex-col items-center justify-center text-center hud-glow-cyan backdrop-blur-md">
                <div className="mb-3">
                  <ArcReactor
                    status={jarvisStatus}
                    size={160}
                    interactive={true}
                    onClick={handleReactorClick}
                  />
                </div>

                <div className="font-hud tracking-wider text-base font-bold text-cyan-300">
                  {jarvisStatus === 'speaking'
                    ? 'HLASOVÝ VÝSTUP AKTIVNÍ'
                    : jarvisStatus === 'processing'
                    ? 'PROBÍHÁ ANALÝZA...'
                    : jarvisStatus === 'listening'
                    ? 'PŘIJÍMÁM HLASOVÝ VSTUP...'
                    : 'JÁDRO PŘIPRAVENO'}
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Klepnutím na reaktor aktivujete hlasový stavový hlášení asistenta.
                </p>

                {/* State metrics */}
                <div className="w-full mt-4 pt-4 border-t border-cyan-500/15 grid grid-cols-2 gap-2 text-left font-mono text-xs">
                  <div className="p-2 rounded bg-[#060b17] border border-cyan-500/10">
                    <div className="text-[10px] text-slate-500">HOST OS</div>
                    <div className="text-cyan-300 font-semibold truncate">Fedora 44</div>
                  </div>
                  <div className="p-2 rounded bg-[#060b17] border border-cyan-500/10">
                    <div className="text-[10px] text-slate-500">KDE PLASMA</div>
                    <div className="text-cyan-300 font-semibold truncate">6.7.5 Wayland</div>
                  </div>
                  <div className="p-2 rounded bg-[#060b17] border border-cyan-500/10">
                    <div className="text-[10px] text-slate-500">CPU JÁDRA</div>
                    <div className="text-cyan-300 font-semibold truncate">12 Vláken</div>
                  </div>
                  <div className="p-2 rounded bg-[#060b17] border border-cyan-500/10">
                    <div className="text-[10px] text-slate-500">ROCm OLLAMA</div>
                    <div className="text-emerald-400 font-semibold truncate">PŘIPRAVENO</div>
                  </div>
                </div>
              </div>

              {/* Quick Jump buttons */}
              <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4 hud-glow-cyan">
                <div className="text-xs font-hud tracking-wider text-cyan-300 font-bold uppercase mb-2">
                  Přímé subsystémy
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <button
                    onClick={() => {
                      setActiveTab('voice');
                      playJarvisSound('blip');
                    }}
                    className="w-full text-left p-2 rounded bg-red-950/25 hover:bg-red-950/40 border border-red-500/30 text-red-200 transition-colors flex items-center justify-between shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Mic className="w-3.5 h-3.5 text-red-400" />
                      Hlasové Ovládání (Voice Controls)
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-900 text-red-300">
                      MIC
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('pc_control');
                      playJarvisSound('blip');
                    }}
                    className="w-full text-left p-2 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/35 text-cyan-200 transition-colors flex items-center justify-between shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Přímé Ovládání PC (Terminál / App)
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-900 text-emerald-400">
                      {bridgeStatus.online ? 'ONLINE' : 'PŘIPRAVEN'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('workspace');
                      playJarvisSound('blip');
                    }}
                    className="w-full text-left p-2 rounded bg-amber-950/25 hover:bg-amber-950/45 border border-amber-500/30 text-amber-200 transition-colors flex items-center justify-between shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      Složky &amp; Instalátor (Fedora 44)
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-900 text-amber-300">
                      SETUP
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('github');
                      playJarvisSound('blip');
                    }}
                    className="w-full text-left p-2 rounded bg-[#060b17] hover:bg-cyan-950/40 border border-cyan-500/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-200 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <Github className="w-3.5 h-3.5 text-cyan-400" />
                      GitHub Cloud Záloha &amp; Verzování
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-900 text-cyan-400">
                      GIT
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('architect');
                      playJarvisSound('blip');
                    }}
                    className="w-full text-left p-2 rounded bg-[#060b17] hover:bg-cyan-950/40 border border-cyan-500/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-200 transition-colors flex items-center justify-between"
                  >
                    <span>Python Architektura (11 modulů)</span>
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('terminal');
                      playJarvisSound('blip');
                    }}
                    className="w-full text-left p-2 rounded bg-[#060b17] hover:bg-cyan-950/40 border border-cyan-500/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-200 transition-colors flex items-center justify-between"
                  >
                    <span>Fedora 44 / KDE Příkazy</span>
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('telemetry');
                      playJarvisSound('blip');
                    }}
                    className="w-full text-left p-2 rounded bg-[#060b17] hover:bg-cyan-950/40 border border-cyan-500/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-200 transition-colors flex items-center justify-between"
                  >
                    <span>Hardware Audit &amp; ROCm</span>
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Chat Console with Integrated Voice Controls */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-[600px] gap-3">
              <VoiceControls
                onSendMessage={handleSendMessage}
                bridgeOnline={bridgeStatus.online}
                onAskJarvis={handleTriggerPrompt}
              />
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearHistory={handleClearHistory}
                isStreaming={isStreaming}
                status={jarvisStatus}
                setStatus={setJarvisStatus}
                presetPrompt={presetPrompt}
                onClearPresetPrompt={() => setPresetPrompt(null)}
              />
            </div>
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="space-y-4">
            <VoiceControls
              onSendMessage={handleSendMessage}
              bridgeOnline={bridgeStatus.online}
              onAskJarvis={handleTriggerPrompt}
            />
            <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-4">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearHistory={handleClearHistory}
                isStreaming={isStreaming}
                status={jarvisStatus}
                setStatus={setJarvisStatus}
                presetPrompt={presetPrompt}
                onClearPresetPrompt={() => setPresetPrompt(null)}
              />
            </div>
          </div>
        )}

        {activeTab === 'pc_control' && (
          <PCController
            onAskJarvis={handleTriggerPrompt}
            bridgeStatus={bridgeStatus}
            setBridgeStatus={setBridgeStatus}
          />
        )}

        {activeTab === 'workspace' && (
          <ProjectWorkspace
            onAskJarvis={handleTriggerPrompt}
            bridgeOnline={bridgeStatus.online}
          />
        )}

        {activeTab === 'github' && (
          <GitHubStorage
            onAskJarvis={handleTriggerPrompt}
            bridgeOnline={bridgeStatus.online}
          />
        )}

        {activeTab === 'architect' && (
          <CodeArchitect onRefactorWithJarvis={handleTriggerPrompt} />
        )}

        {activeTab === 'terminal' && (
          <TerminalToolbox onAskJarvis={handleTriggerPrompt} />
        )}

        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            <SystemTelemetry onAskJarvis={handleTriggerPrompt} />

            {/* Future Architecture Roadmap Card as specified in Sir's prompt */}
            <div className="bg-[#0b1325]/80 border border-cyan-500/20 rounded-xl p-5 hud-glow-cyan">
              <h3 className="font-hud tracking-wider text-base font-bold text-cyan-300 uppercase mb-2">
                Plánovaný Budoucí Rozvoj Subsystémů
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                J.A.R.V.I.S. je koncipován jako plně autonomní asistent běžící přímo na vašem hardwaru AMD Ryzen 5 5600GT s grafickou kartou RX 7600. Níže jsou klíčové fáze připravované pro implementaci:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#070d1a] border border-cyan-500/20">
                  <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    1. Čtení systémových logů
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Přímá integrace s <code>systemd-journald</code> přes Python <code>systemd.journal</code> pro detekci hardwarových výpadků, pádů aplikací a KWin chyb.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#070d1a] border border-cyan-500/20">
                  <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    2. Přímé spouštění příkazů
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Bezpečný subprocess executor s kryptografickým whitelistem příkazů pro bezdotykovou údržbu Fedory a KDE Plasma relace.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#070d1a] border border-cyan-500/20">
                  <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    3. Lokální Hlasové Rozhraní
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Offline rozpoznávání řeči přes Faster-Whisper a českou/anglickou syntézu přes Piper TTS akcelerované na 12 vláknech Ryzen 5600GT.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-500/15 bg-[#040711]/90 py-3 px-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>J.A.R.V.I.S. Core // Stark Industries System Protocol</span>
          <span>Fedora 44 (KDE Plasma 6.7.5 Wayland) · AMD Ryzen 5 5600GT · RX 7600 8GB</span>
          <span className="text-cyan-400/80">K vašim službám, pane.</span>
        </div>
      </footer>
    </div>
  );
}
