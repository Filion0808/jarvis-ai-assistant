import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Command,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { playJarvisSound, speakJarvis } from '../utils/audio';
import { executeOnPC, syncFilesToLocalPC } from '../services/localBridge';

interface VoiceControlsProps {
  onSendMessage: (text: string) => void;
  bridgeOnline: boolean;
  onAskJarvis: (prompt: string) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  onSendMessage,
  bridgeOnline,
  onAskJarvis,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastExecutedCommand, setLastExecutedCommand] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('Připraven k poslechu hlasových pokynů.');
  const [voiceVolume, setVoiceVolume] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setFeedbackMessage('Web Speech API není v tomto prohlížeči podporováno.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'cs-CZ'; // Čeština pro pana Filipa

      recognition.onstart = () => {
        setIsListening(true);
        playJarvisSound('blip');
        setFeedbackMessage('Poslouchám váš hlas, pane...');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalPhrase = event.results[i][0].transcript.trim();
            handleRecognizedSpeech(finalPhrase);
          } else {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          setFeedbackMessage(`Chyba mikrofonu: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleRecognizedSpeech = async (phrase: string) => {
    const lower = phrase.toLowerCase();
    setTranscript(phrase);
    setLastExecutedCommand(phrase);
    playJarvisSound('blip');

    // 1. Zkontroluj přímé systémové příkazy
    if (lower.includes('terminál') || lower.includes('konzole') || lower.includes('terminal')) {
      const reply = 'Rozumím, pane. Otevírám terminál Konsole na vašem PC.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('open_terminal', 'konsole &');
      return;
    }

    if (lower.includes('btop') || lower.includes('monitor') || lower.includes('procesor') || lower.includes('ryzen')) {
      const reply = 'Spouštím systémový monitor btop pro Ryzen 5600GT.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('system_monitor', 'konsole -e btop &');
      return;
    }

    if (lower.includes('dolphin') || lower.includes('správce souborů') || lower.includes('soubory') || lower.includes('složku')) {
      const reply = 'Otevírám správce souborů Dolphin.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('file_manager', 'dolphin &');
      return;
    }

    if (lower.includes('grafik') || lower.includes('radeon') || lower.includes('gpu')) {
      const reply = 'Aktivuji monitoring grafiky Radeon RX 7600.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('gpu_monitor', 'konsole -e radeontop &');
      return;
    }

    if (lower.includes('snímek') || lower.includes('screenshot') || lower.includes('vyfotit') || lower.includes('vyfoť')) {
      const reply = 'Spouštím nástroj Spectacle pro snímek obrazovky.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('screenshot', 'spectacle -r &');
      return;
    }

    if (lower.includes('zamkni') || lower.includes('zamknout')) {
      const reply = 'Zamykám obrazovku KDE Plasma.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('lock_screen', 'loginctl lock-session');
      return;
    }

    if (lower.includes('ztlumit') || lower.includes('ztlum') || lower.includes('vypni zvuk')) {
      const reply = 'Ztlumuji zvukové výstupy.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('volume_mute', 'wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle');
      return;
    }

    if (lower.includes('zesílit') || lower.includes('přidej zvuk')) {
      const reply = 'Zvyšuji hlasitost.';
      setFeedbackMessage(reply);
      if (voiceVolume) speakJarvis(reply);
      await executeOnPC('volume_up', 'wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+');
      return;
    }

    // 2. Pokud to není systémový příkaz, předat do AI chatu Jarvisovi
    setFeedbackMessage(`Zpracovávám váš dotaz: "${phrase}"`);
    onSendMessage(phrase);
  };

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Váš prohlížeč nepodporuje hlasové rozpoznávání Web Speech API. Doporučujeme Chromium nebo Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setFeedbackMessage('Hlasový odposlech pozastaven.');
    } else {
      try {
        recognitionRef.current?.start();
      } catch {
        recognitionRef.current?.stop();
        setTimeout(() => recognitionRef.current?.start(), 150);
      }
    }
  };

  return (
    <div className="bg-[#0b1325]/90 border border-cyan-500/30 rounded-xl p-4 hud-glow-cyan backdrop-blur-md">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 mb-3">
        <div className="flex items-center gap-2.5">
          <Radio className={`w-5 h-5 ${isListening ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
          <h3 className="font-hud tracking-wider text-sm sm:text-base font-bold text-cyan-300 uppercase">
            Hlasové Ovládání // J.A.R.V.I.S. Voice Controls
          </h3>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isListening
                ? 'bg-red-950/80 border-red-500/40 text-red-300 animate-pulse'
                : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
            }`}
          >
            {isListening ? 'MIKROFON AKTIVNÍ' : 'POHOTOVOST'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceVolume(!voiceVolume)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              voiceVolume
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Přepnout hlasovou odpověď Jarvise"
          >
            {voiceVolume ? <Volume2 className="w-3.5 h-3.5 text-cyan-300" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{voiceVolume ? 'HLAS ZAPNUT' : 'HLAS ZTLUMEN'}</span>
          </button>
        </div>
      </div>

      {/* Main Microphone Interaction Unit */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Big Mic Button */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-[#060b17] border border-cyan-500/20 rounded-xl text-center">
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 relative ${
              isListening
                ? 'bg-red-500/30 text-red-300 border-2 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)] scale-105'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-2 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-105'
            }`}
            title={isListening ? 'Klikněte pro zastavení odposlechu' : 'Klikněte pro aktivaci hlasového ovládání'}
          >
            {isListening ? (
              <Mic className="w-8 h-8 text-red-300 animate-pulse" />
            ) : (
              <MicOff className="w-8 h-8 text-cyan-300" />
            )}
            {isListening && (
              <span className="absolute -inset-1 rounded-full border border-red-400/50 animate-ping opacity-75" />
            )}
          </button>

          <span className="mt-3 font-hud tracking-wide font-bold text-xs text-slate-300">
            {isListening ? 'KLIKNĚTE PRO VYPNUTÍ' : 'KLIKNĚTE A MLUVTE'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5">Jazyk: Čeština (cs-CZ)</span>
        </div>

        {/* Right: Live Transcript & Voice Commands */}
        <div className="md:col-span-8 space-y-2.5">
          {/* Transcript Box */}
          <div className="p-3 bg-[#040814] border border-cyan-500/25 rounded-lg min-h-[75px] flex flex-col justify-between font-mono text-xs">
            <div className="text-slate-400 flex items-center justify-between pb-1 mb-1 border-b border-cyan-500/10">
              <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Živý přepis vašeho hlasu:
              </span>
              {transcript && (
                <span className="text-[10px] text-emerald-400 animate-pulse">Zachycuje...</span>
              )}
            </div>

            <p className="text-slate-200 text-sm italic py-1">
              {transcript ? `"${transcript}"` : 'Zatím jste nic neřekl, pane. Klikněte na mikrofon a zadejte pokyn.'}
            </p>

            <div className="text-[11px] text-cyan-300/80 pt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span>{feedbackMessage}</span>
            </div>
          </div>

          {/* Quick Voice Hints */}
          <div className="bg-[#060b17] border border-cyan-500/15 rounded-lg p-2.5 text-xs font-mono text-slate-300">
            <div className="text-[11px] text-amber-300 font-semibold mb-1 flex items-center gap-1">
              <Command className="w-3 h-3 text-amber-400" />
              <span>Vyzkoušejte vyslovit tyto pokyny (česky):</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/25 text-cyan-200">
                „Otevři terminál“
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/25 text-cyan-200">
                „Spusť monitor btop“
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/25 text-cyan-200">
                „Otevři soubory“
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/25 text-cyan-200">
                „Vyfoť obrazovku“
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/25 text-cyan-200">
                „Ztlumit zvuk“
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/25 text-cyan-200">
                „Zamkni obrazovku“
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
