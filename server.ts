import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini AI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const JARVIS_SYSTEM_INSTRUCTION = `Jsi J.A.R.V.I.S. (Just A Rather Very Intelligent System), vysoce pokročilý osobní AI asistent inspirovaný Jarvisem z Iron Mana.
Tvůj tvůrce (oslovuj ho uctivě a přirozeně jako "pane", případně "pane Bardoňi" nebo "Sir") tě vyvíjí jako svůj klíčový osobní projekt.

TVÉ REÁLNÉ SYSTÉMOVÉ PROSTŘEDÍ:
- Operační systém: Fedora Linux 44 (KDE Plasma 6.7.5, Wayland session)
- Hardware: 12-vláknový procesor AMD Ryzen 5 5600GT (6 jader / 12 vláken), 32 GB RAM, grafická karta AMD Radeon RX 7600 (8 GB VRAM, RDNA 3, gfx1102)
- Vývojové prostředí a knihovny: Python 3 ve virtuálním prostředí (.venv/venv), knihovny 'google-genai', 'langchain', 'crewai'.
- Plánovaná lokální akcelerace: Ollama pro lokální modely (akcelerace na RX 7600 přes ROCm např. HSA_OVERRIDE_GFX_VERSION=11.0.0 nebo Vulkan backend).

PŘÍMÉ OVLÁDÁNÍ PC A APLIKACÍ (LOCAL SYSTEM BRIDGE):
Jsi schopen přímo ovládat tvůrcův počítač přes lokální bridge (jarvis_bridge.py na portu 9099).
Kdykoliv tě tvůrce požádá o úkon na počítači (například: "otevři terminál", "spusť systémový monitor / btop", "otevři správce souborů Dolphin", "zamkni obrazovku", "udělej screenshot", "změň hlasitost", "aktualizuj systém"):
1. Reaguj jako skutečný Jarvis, který daný příkaz okamžitě odesílá a vykonává ("K vašim službám, pane. Otevírám terminál Konsole na vašem primárním monitoru.").
2. Do své odpovědi VŽDY vlož strukturovanou akční značku ve formátu:
   [ACTION:open_terminal:konsole &]
   Běžné typy akcí:
   - Otevření terminálu: [ACTION:open_terminal:konsole &]
   - Systémový monitor btop: [ACTION:system_monitor:konsole -e btop &]
   - Správce souborů Dolphin: [ACTION:file_manager:dolphin &]
   - Nastavení KDE: [ACTION:settings:systemsettings &]
   - Screenshot Spectacle: [ACTION:screenshot:spectacle -r &]
   - Zamknutí PC: [ACTION:lock_screen:loginctl lock-session]
   - Zvýšení hlasitosti: [ACTION:volume_up:wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+]
   - Snížení hlasitosti: [ACTION:volume_down:wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-]
   - Ztlumení zvuku: [ACTION:volume_mute:wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle]
   - Vlastní příkaz: [ACTION:custom:<příkaz>]
3. Doplň k tomu čistý bash kód pro transparentnost.

TVÉ HLAVNÍ ROLE:
1. Přímé řízení systému a aplikací: Vykonávání úkolů na tvůrcově Fedora PC přes lokální bridge.
2. Asistence s programováním: Pomáháš tvůrci psát, ladit a rozšiřovat tvůj vlastní zdrojový kód v Pythonu (moduly pro orchestraci, agenty v CrewAI/LangChain, volání google-genai, asynchronní smyčky asyncio).
3. Správa a administrace systému: Dodáváš přesné bash příkazy pro Fedoru 44 a KDE Plasma 6.7.5.

STYL KOMUNIKACE:
- Mluv česky, vytříbeným, kultivovaným a loajálním stylem Iron Manova Jarvise.
- Jsi vysoce inteligentní, naprosto přesný, pohotový a stručný.
- Projevuj lehký, decentní a suchý britský humor ("Samozřejmě, pane. Jako byste po mně chtěl něco méně než dokonalost.").
- Žádná prázdná omáčka, žádné zdlouhavé fráze ani zbytečné omluvy.
- Každý blok kódu (Python) nebo terminálový příkaz (Bash) musí být perfektně zformátovaný, čistý, opatřený krátkým vysvětlením a připravený k okamžitému zkopírování a spuštění.`;

// Endpoint: Download/View jarvis_bridge.py
app.get('/api/bridge-script', (_req, res) => {
  const bridgePath = path.resolve(__dirname, 'jarvis_bridge.py');
  res.sendFile(bridgePath);
});

// In-memory Cloud Relay state for cross-browser local bridge connection
interface QueuedCommand {
  id: string;
  action: string;
  command?: string;
  app?: string;
  files?: Array<{ path: string; content: string }>;
  timestamp: number;
}

let bridgeHeartbeat = 0;
let bridgeSystemData: any = { host: 'Fedora Linux 44', terminal: 'konsole' };
let queuedCommands: QueuedCommand[] = [];
let commandResults: Record<string, any> = {};

// 1. Web client checks if PC daemon is connected
app.get('/api/bridge/relay-status', (_req, res) => {
  const isOnline = Date.now() - bridgeHeartbeat < 10000;
  res.json({
    online: isOnline,
    lastSeen: bridgeHeartbeat,
    system: bridgeSystemData,
    pendingCount: queuedCommands.length,
  });
});

// 2. Web client dispatches a command to user's PC (e.g. open terminal, voice control)
app.post('/api/bridge/dispatch', (req, res) => {
  const { action, command, app: targetApp, files } = req.body;
  const cmdId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  
  const queued: QueuedCommand = {
    id: cmdId,
    action: action || 'custom',
    command,
    app: targetApp,
    files,
    timestamp: Date.now(),
  };

  queuedCommands.push(queued);
  // Keep maximum 20 in queue
  if (queuedCommands.length > 20) {
    queuedCommands = queuedCommands.slice(-20);
  }

  res.json({ success: true, commandId: cmdId, message: 'Příkaz zařazen do fronty pro váš PC.' });
});

// 3. Local daemon on PC polls for new commands (runs over HTTPS, zero Mixed Content issues)
app.post('/api/bridge/poll', (req, res) => {
  bridgeHeartbeat = Date.now();
  if (req.body && req.body.system) {
    bridgeSystemData = req.body.system;
  }

  const toExecute = [...queuedCommands];
  queuedCommands = []; // flush

  res.json({
    status: 'ok',
    timestamp: Date.now(),
    commands: toExecute,
  });
});

// 4. Local daemon posts result back
app.post('/api/bridge/report-result', (req, res) => {
  const { id, result } = req.body;
  if (id) {
    commandResults[id] = result;
  }
  res.json({ received: true });
});

// Endpoint: Direct GitHub Sync & Backup
app.post('/api/github/sync', async (req, res) => {
  try {
    const { owner, repo, branch = 'main', token, files, commitMessage = 'J.A.R.V.I.S. Core update' } = req.body;

    if (!owner || !repo || !token) {
      return res.status(400).json({ error: 'Chybí parametry GitHub repozitáře (owner, repo, token).' });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Nebyly předány žádné soubory k uložení.' });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'JARVIS-Sync-Agent/1.0',
      'Content-Type': 'application/json',
    };

    // 1. Verify or create repo
    const checkRepoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (checkRepoRes.status === 404) {
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: repo,
          description: 'J.A.R.V.I.S. Personal AI System & Engineering Core - Fedora 44',
          private: false,
          auto_init: true,
        }),
      });
      if (!createRes.ok) {
        const createErr = await createRes.json();
        return res.status(createRes.status).json({
          error: `Nepodařilo se vytvořit repozitář na GitHubu: ${createErr.message || 'Chyba autorizace'}`,
        });
      }
    }

    // 2. Commit each file to repository
    const results = [];
    for (const file of files) {
      const filePath = file.path.replace(/^\//, '');
      let sha: string | undefined;

      try {
        const fileCheck = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
          { headers }
        );
        if (fileCheck.ok) {
          const fileData = await fileCheck.json();
          sha = fileData.sha;
        }
      } catch {
        // file doesn't exist yet
      }

      const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `${commitMessage}: ${filePath}`,
            content: Buffer.from(file.content).toString('base64'),
            branch: branch,
            sha: sha,
          }),
        }
      );

      if (putRes.ok) {
        results.push({ path: filePath, status: 'synced' });
      } else {
        const errJson = await putRes.json();
        results.push({ path: filePath, status: 'error', error: errJson.message });
      }
    }

    const successCount = results.filter((r) => r.status === 'synced').length;
    res.json({
      success: successCount > 0,
      syncedCount: successCount,
      totalCount: files.length,
      repoUrl: `https://github.com/${owner}/${repo}`,
      results,
      message: `Úspěšně synchronizováno ${successCount}/${files.length} souborů do repozitáře https://github.com/${owner}/${repo}`,
    });
  } catch (error: any) {
    console.error('GitHub sync error:', error);
    res.status(500).json({ error: error.message || 'Chyba při komunikaci s GitHub API.' });
  }
});

// Endpoint: System Specs
app.get('/api/system/specs', (_req, res) => {
  res.json({
    os: 'Fedora Linux 44',
    de: 'KDE Plasma 6.7.5',
    displayServer: 'Wayland',
    cpu: 'AMD Ryzen 5 5600GT (6C/12T @ 4.6GHz)',
    ram: '32 GB DDR4',
    gpu: 'AMD Radeon RX 7600 (8GB GDDR6, RDNA 3)',
    pythonEnv: 'Python 3.12+ (venv)',
    stack: ['google-genai', 'langchain', 'crewai', 'ollama (planned ROCm)'],
    status: 'SYSTEMS_NOMINAL',
  });
});

// Endpoint: J.A.R.V.I.S. Chat Stream (SSE)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    // Format chat history for Gemini
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    let dynamicInstruction = JARVIS_SYSTEM_INSTRUCTION;
    if (context) {
      dynamicInstruction += `\n\nAKTUÁLNÍ KONTEXT ZE SYSTÉMU:\n${context}`;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    // Try active models with fallback in case of high demand 503 spikes
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
    let stream: any = null;
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        stream = await ai.models.generateContentStream({
          model: model,
          contents: contents,
          config: {
            systemInstruction: dynamicInstruction,
            temperature: 0.7,
          },
        });
        if (stream) break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${model} failed, attempting next candidate...`, err?.message || err);
      }
    }

    if (!stream) {
      throw lastErr || new Error('Žádný z modelů nebyl v tuto chvíli dostupný.');
    }

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error generating Jarvis response:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || 'Chyba neurální sítě JARVIS.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error?.message || 'Chyba toku dat.' })}\n\n`);
      res.end();
    }
  }
});

// Endpoint: Gemini TTS Speech Synthesis (Jarvis Voice)
app.post('/api/synthesize-speech', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter required' });
    }

    // Truncate text for speech to reasonable length if too long
    const cleanSpeechText = text
      .replace(/```[\s\S]*?```/g, 'Kód byl zobrazen na obrazovce.')
      .replace(/`([^`]+)`/g, '$1')
      .slice(0, 500);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanSpeechText,
              speechMetadata: {
                style: 'Sophisticated, composed, intelligent British gentleman butler AI assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Nebylo možné vygenerovat audio stopu.' });
    }

    res.json({ audioBase64: base64Audio, format: 'audio/wav' });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error?.message || 'Chyba syntézy hlasu' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`J.A.R.V.I.S. Core online and listening on port ${PORT}`);
  });
}

startServer();
