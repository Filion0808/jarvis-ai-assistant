import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types/jarvis';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Cpu,
  Code2,
  Play,
  CheckCircle2,
  Zap,
  Github,
  ExternalLink,
  Key,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { playJarvisSound, speakJarvis, stopSpeaking, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { executeOnPC } from '../services/localBridge';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  onClearHistory: () => void;
  isStreaming: boolean;
  status: 'idle' | 'processing' | 'speaking' | 'listening';
  setStatus: (status: 'idle' | 'processing' | 'speaking' | 'listening') => void;
  presetPrompt?: string | null;
  onClearPresetPrompt?: () => void;
  onNavigateTab?: (tab: 'chat' | 'pc_control' | 'github' | 'architect' | 'terminal' | 'telemetry') => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onClearHistory,
  isStreaming,
  status,
  setStatus,
  presetPrompt,
  onClearPresetPrompt,
  onNavigateTab,
}) => {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [autoRunPC, setAutoRunPC] = useState(true);
  const [executedActions, setExecutedActions] = useState<Record<string, { success: boolean; message: string; pid?: number }>>({});
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [isListening, setIsListening] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (presetPrompt) {
      setInput(presetPrompt);
      if (onClearPresetPrompt) onClearPresetPrompt();
    }
  }, [presetPrompt, onClearPresetPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Handle voice recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'cs-CZ';

      recognition.onstart = () => {
        setIsListening(true);
        setStatus('listening');
        playJarvisSound('blip');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          playJarvisSound('complete');
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setStatus('idle');
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatus('idle');
      };

      recognitionRef.current = recognition;
    }
  }, [setStatus]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setBannerNotice('Web Speech Recognition API není v tomto prohlížeči podporováno. Můžete zadávat text přes klávesnici.');
      setTimeout(() => setBannerNotice(null), 5000);
      playJarvisSound('alert');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatus('idle');
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const messageText = input.trim();
    setInput('');
    playJarvisSound('blip');

    await onSendMessage(messageText);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(id);
    playJarvisSound('blip');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSpeakMessage = (text: string) => {
    if (status === 'speaking') {
      stopSpeaking();
      setStatus('idle');
      return;
    }

    setStatus('speaking');
    playJarvisSound('process');
    speakJarvis(
      text,
      () => setStatus('speaking'),
      () => setStatus('idle')
    );
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playJarvisSound('startup');
  };

  const handleTriggerAction = async (msgId: string, actionType: string, command: string) => {
    const key = `${msgId}-${actionType}`;
    setRunningActionKey(key);
    playJarvisSound('blip');
    const res = await executeOnPC(actionType, command);
    setExecutedActions((prev) => ({
      ...prev,
      [key]: { success: res.success, message: res.message, pid: res.pid },
    }));
    setRunningActionKey(null);
    playJarvisSound('complete');
  };

  // Auto-run action on PC if enabled when stream finishes
  useEffect(() => {
    if (isStreaming) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;

    const actionMatch = /\[ACTION:([^:]+):([^\]]+)\]/.exec(lastMsg.content);
    if (actionMatch && autoRunPC) {
      const actionType = actionMatch[1];
      const command = actionMatch[2];
      const key = `${lastMsg.id}-${actionType}`;
      if (!executedActions[key]) {
        handleTriggerAction(lastMsg.id, actionType, command);
      }
    }
  }, [messages, isStreaming, autoRunPC]);

  // Render message formatting with markdown blocks & code snippets & PC actions
  const renderFormattedContent = (content: string, msgId: string) => {
    // Check for [ACTION:type:command]
    const actionMatch = /\[ACTION:([^:]+):([^\]]+)\]/.exec(content);
    const actionData = actionMatch
      ? { type: actionMatch[1].trim(), command: actionMatch[2].trim() }
      : null;

    // Detect if GitHub access is mentioned
    const mentionsGitHub =
      content.includes('github.com') ||
      content.includes('gh auth') ||
      content.includes('Personal Access Token') ||
      content.toLowerCase().includes('přístup do github') ||
      content.toLowerCase().includes('přístup k github');

    // Clean action tag from text display
    const cleanContent = content.replace(/\[ACTION:[^:]+:[^\]]+\]/g, '').trim();

    // Split by code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockCount = 0;

    while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: cleanContent.slice(lastIndex, match.index),
        });
      }

      parts.push({
        type: 'code',
        language: match[1] || 'bash',
        code: match[2].trim(),
        id: `${msgId}-block-${blockCount++}`,
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleanContent.length) {
      parts.push({
        type: 'text',
        content: cleanContent.slice(lastIndex),
      });
    }

    const actionKey = actionData ? `${msgId}-${actionData.type}` : '';
    const executionStatus = actionData ? executedActions[actionKey] : null;
    const isRunningThisAction = runningActionKey === actionKey;

    return (
      <div className="space-y-3">
        {/* Render Action Card if assistant triggered an action */}
        {actionData && (
          <div className="my-2 p-3 rounded-lg border border-cyan-500/35 bg-[#030712] shadow-[0_0_15px_rgba(6,182,212,0.12)]">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-cyan-500/20">
              <span className="font-hud tracking-wider text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Příkaz pro vaše PC // Fedora 44
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                {actionData.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs font-mono mb-2">
              <div className="bg-[#060b17] border border-cyan-500/20 rounded px-2.5 py-1 text-cyan-200 flex-1 truncate">
                <code>{actionData.command}</code>
              </div>

              <button
                onClick={() => handleTriggerAction(msgId, actionData.type, actionData.command)}
                disabled={isRunningThisAction}
                className="flex items-center gap-1.5 px-3 py-1 font-hud tracking-wide font-bold text-xs bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 rounded transition-all hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              >
                <Play className="w-3 h-3 text-cyan-300" />
                <span>{isRunningThisAction ? 'PROVÁDÍM...' : 'SPUSTIT NA PC'}</span>
              </button>
            </div>

            {executionStatus && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 px-2 py-1 rounded">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{executionStatus.message}</span>
                {executionStatus.pid && (
                  <span className="text-slate-400">(PID: {executionStatus.pid})</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Render GitHub Quick-Access Card if relevant to the conversation */}
        {mentionsGitHub && onNavigateTab && (
          <div className="my-2 p-3 rounded-lg border border-amber-500/30 bg-[#060e1d] shadow-[0_0_12px_rgba(245,158,11,0.15)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-amber-400" />
              <div className="text-xs font-hud font-bold text-amber-200">
                CENTRUM PŘÍSTUPU DO GITHUB &amp; SYNCHRONIZACE
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => onNavigateTab('github')}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold transition-all"
              >
                Otevřít Záložku GitHub
              </button>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:user,workflow&description=JARVIS-Fedora44-Core"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700 flex items-center gap-1 transition-all"
              >
                <span>Vytvořit Token</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {parts.map((part, idx) => {
          if (part.type === 'code') {
            const isCopied = copiedIndex === part.id;
            const isBash = part.language === 'bash' || part.language === 'sh';
            return (
              <div
                key={idx}
                className="my-2 rounded-lg border border-cyan-500/25 bg-[#040813] overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#081226] border-b border-cyan-500/15 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    {isBash ? (
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{part.language || 'code'}</span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(part.code!, part.id!)}
                    className="flex items-center gap-1 text-slate-300 hover:text-cyan-300 transition-colors px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/20"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Zkopírováno</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Kopírovat kód</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                  <pre className="whitespace-pre">
                    <code>{part.code}</code>
                  </pre>
                </div>
              </div>
            );
          }

          // Format regular text (handle inline code, bold, lists)
          return (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed">
              {part.content?.split('\n').map((line, lIdx) => {
                // Highlight inline code
                const inlineParts = line.split(/(`[^`]+`)/g);
                return (
                  <p key={lIdx} className="min-h-[1.25rem]">
                    {inlineParts.map((sub, sIdx) => {
                      if (sub.startsWith('`') && sub.endsWith('`')) {
                        return (
                          <code
                            key={sIdx}
                            className="px-1.5 py-0.5 mx-0.5 bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 rounded font-mono text-xs"
                          >
                            {sub.slice(1, -1)}
                          </code>
                        );
                      }
                      return sub;
                    })}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#081020]/90 border border-cyan-500/20 rounded-xl overflow-hidden hud-glow-cyan backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a1428] border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-hud tracking-wider text-sm font-bold text-cyan-300 uppercase">
            J.A.R.V.I.S. Neuronové Komunikační Rozhraní
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 ml-2">
            Model: gemini-3.8-flash // Fedora 44 Environment
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoRunPC(!autoRunPC)}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors flex items-center gap-1 ${
              autoRunPC
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Při detekci akce (např. 'Otevři terminál') automaticky spustit na vašem PC"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Auto-PC: {autoRunPC ? 'ZAP' : 'VYP'}</span>
          </button>

          <button
            onClick={toggleSound}
            className={`p-1.5 rounded transition-colors ${
              soundOn
                ? 'text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={soundOn ? 'Zvukové efekty zapnuty' : 'Zvukové efekty vypnuty'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
              autoSpeak
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                : 'border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Automaticky předčítat odpovědi hlasem"
          >
            Hlas: {autoSpeak ? 'ZAP' : 'VYP'}
          </button>

          <button
            onClick={onClearHistory}
            className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
            title="Vymazat historii relace"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Top Notice Banner */}
      {bannerNotice && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs font-mono text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{bannerNotice}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-amber-400 hover:text-amber-200 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[380px] max-h-[560px]">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-slate-400">
                <span>{isAssistant ? 'J.A.R.V.I.S.' : 'Sir (Tvůrce)'}</span>
                <span>·</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  isAssistant
                    ? 'bg-[#060c18] border border-cyan-500/20 text-slate-200 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
                    : 'bg-cyan-950/50 border border-cyan-500/35 text-cyan-100'
                }`}
              >
                {renderFormattedContent(msg.content, msg.id)}

                {/* Assistant footer speech toggle */}
                {isAssistant && (
                  <div className="mt-2 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="text-cyan-400/70">Subsystém nominální</span>
                    <button
                      onClick={() => handleSpeakMessage(msg.content)}
                      className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Předčíst odpověď"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Přečíst</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs py-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>J.A.R.V.I.S. počítá neuronovou odpověď...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-2 bg-[#060b17] border-t border-cyan-500/15 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs font-mono whitespace-nowrap">
          <span className="text-cyan-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Rychlé příkazy:
          </span>

          {[
            {
              label: '🔑 Dej mi přístup do GitHubu',
              prompt: 'Jarvisi, dej mi přístup do GitHubu, vygeneruj odkaz na autorizaci a vysvětli postup pro mou Fedoru 44.',
            },
            {
              label: '▶ Otevři terminál (Konsole)',
              prompt: 'Jarvisi, otevři terminál na mém počítači.',
            },
            {
              label: '☁ Uložit soubory na GitHub',
              prompt: 'Jarvisi, jak mohu uložit a automaticky synchronizovat všechny naše zdrojové soubory na GitHub?',
            },
            {
              label: '⚡ Spusť monitor btop',
              prompt: 'Jarvisi, spusť systémový monitor btop na mém PC.',
            },
            {
              label: '🛡️ Vygeneruj SSH klíč pro GitHub',
              prompt: 'Jarvisi, vygeneruj pro mě SSH klíč pro GitHub bez hesla pro mou Fedoru 44.',
            },
            {
              label: '▶ Otevři správce souborů Dolphin',
              prompt: 'Jarvisi, otevři správce souborů Dolphin na mé ploše.',
            },
            {
              label: '▶ Zamkni obrazovku mého PC',
              prompt: 'Jarvisi, zamkni obrazovku mého počítače.',
            },
            {
              label: 'Kontrola .venv a balíčků',
              prompt: 'Jarvisi, zkontroluj stav mého Python virtuálního prostředí (.venv), nainstalované verze google-genai, langchain a crewai a navrhni případné aktualizace.',
            },
            {
              label: 'CrewAI agent pro logy',
              prompt: 'Navrhni a napiš kompletní Python skript s CrewAI a LangChain pro agenta, který automaticky čte systémové chyby z journalctl na Fedoře 44 a generuje zprávu.',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(item.prompt);
                playJarvisSound('blip');
              }}
              className="px-2.5 py-1 rounded bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar Form */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-[#091122] border-t border-cyan-500/15 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`p-2.5 rounded-lg border transition-all ${
            isListening
              ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              : 'bg-slate-900 border-cyan-500/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40'
          }`}
          title={isListening ? 'Zastavit poslech' : 'Aktivovat hlasový vstup (Mikrofon)'}
        >
          {isListening ? <Mic className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isListening
              ? 'Poslouchám váš hlas, pane...'
              : 'Zadejte instrukci pro J.A.R.V.I.S.e (např. otevři terminál, dej mi přístup do GitHubu)...'
          }
          disabled={isStreaming}
          className="flex-1 bg-[#050914] border border-cyan-500/25 focus:border-cyan-400 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
        />

        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="flex items-center gap-1.5 px-4 py-2 font-hud tracking-wider font-bold text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
        >
          <span>PROVÉST</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
