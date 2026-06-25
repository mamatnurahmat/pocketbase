/**
 * Voice Input Extension for pi
 *
 * Records voice via browser Web Speech API, returns text to editor.
 * Usage: /voice
 *
 * Flow:
 * 1. Start temporary HTTP server on localhost
 * 2. Open browser to voice capture page
 * 3. User speaks → browser transcribes (Web Speech API)
 * 4. Text sent back to pi editor
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { BorderedLoader } from "@earendil-works/pi-coding-agent";
import { createServer, type Server } from "node:http";
import { randomBytes } from "node:crypto";


const HTML_PAGE = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Voice Input - pi</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
       background: #1a1b1e; color: #e4e4e7; display: flex; justify-content: center;
       align-items: center; min-height: 100vh; }
.container { text-align: center; max-width: 500px; padding: 2rem; }
h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
p { color: #a1a1aa; margin-bottom: 2rem; font-size: 0.9rem; }
.btn { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #6366f1;
       background: #27272a; color: #e4e4e7; font-size: 3rem; cursor: pointer;
       transition: all 0.2s; margin-bottom: 1.5rem; }
.btn:hover { background: #3f3f46; }
.btn.listening { background: #7c3aed; border-color: #a78bfa; box-shadow: 0 0 30px rgba(124,58,237,0.5);
                 animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 30px rgba(124,58,237,0.5); }
                   50% { box-shadow: 0 0 60px rgba(124,58,237,0.8); }
                   100% { box-shadow: 0 0 30px rgba(124,58,237,0.5); } }
.status { margin-bottom: 1rem; font-size: 0.85rem; min-height: 1.5rem; color: #a1a1aa; }
.result-box { background: #27272a; border: 1px solid #3f3f46; border-radius: 8px;
              padding: 1rem; min-height: 80px; max-height: 200px; overflow-y: auto;
              text-align: left; font-size: 1rem; line-height: 1.5; margin-bottom: 1rem;
              word-wrap: break-word; }
.result-box:empty::before { content: "Transcript will appear here..."; color: #52525b; }
.footer { display: flex; gap: 0.5rem; justify-content: center; }
.btn-sm { padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #3f3f46;
          background: #27272a; color: #e4e4e7; cursor: pointer; font-size: 0.85rem; }
.btn-sm:hover { background: #3f3f46; }
.btn-primary { background: #6366f1; border-color: #6366f1; color: white; }
.btn-primary:hover { background: #4f46e5; }
.lang-select { background: #27272a; border: 1px solid #3f3f46; color: #e4e4e7;
               padding: 0.3rem 0.5rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 1rem; }
</style>
</head>
<body>
<div class="container">
  <h1>🎤 Voice Input</h1>
  <p>Click mic to start. Speak clearly. Click again to stop.</p>
  <select class="lang-select" id="lang">
    <option value="id-ID">Bahasa Indonesia</option>
    <option value="en-US">English (US)</option>
    <option value="en-GB">English (UK)</option>
    <option value="ms-MY">Bahasa Melayu</option>
    <option value="jv-ID">Bahasa Jawa</option>
    <option value="su-ID">Bahasa Sunda</option>
    <option value="zh-CN">中文</option>
    <option value="ja-JP">日本語</option>
    <option value="ko-KR">한국어</option>
  </select>
  <button class="btn" id="btn">🎤</button>
  <div class="status" id="status">Click mic to start</div>
  <div class="result-box" id="result"></div>
  <div class="footer">
    <button class="btn-sm" id="clearBtn">Clear</button>
    <button class="btn-sm btn-primary" id="sendBtn">Send to pi ✓</button>
  </div>
</div>

<script>
let recognition = null;
let listening = false;
let finalTranscript = "";

const btn = document.getElementById('btn');
const status = document.getElementById('status');
const result = document.getElementById('result');
const lang = document.getElementById('lang');
const clearBtn = document.getElementById('clearBtn');
const sendBtn = document.getElementById('sendBtn');

function getLang() { return lang.value; }

function startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    status.textContent = "❌ Browser tidak support Web Speech API. Coba Chrome/Edge.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = getLang();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    if (final) {
      finalTranscript += (finalTranscript ? " " : "") + final;
    }
    result.textContent = finalTranscript + (interim ? "\\n" + interim + "..." : "");
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
      status.textContent = "No speech detected. Try again.";
      return;
    }
    status.textContent = "⚠ Error: " + event.error;
    stopListening();
  };

  recognition.onend = () => {
    if (listening) {
      // Auto-restart for continuous listening
      try { recognition.start(); } catch (e) {}
    }
  };

  try {
    recognition.start();
    listening = true;
    btn.classList.add('listening');
    btn.textContent = "⏹";
    status.textContent = "🔴 Listening..." + " (language: " + getLang() + ")";
  } catch (e) {
    status.textContent = "❌ Failed to start: " + e.message;
  }
}

function stopListening() {
  listening = false;
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
    recognition = null;
  }
  btn.classList.remove('listening');
  btn.textContent = "🎤";
  if (!finalTranscript) {
    status.textContent = "Click mic to start";
  } else {
    status.textContent = "✅ Done. Send or continue recording.";
  }
}

function toggleListening() {
  if (listening) {
    stopListening();
  } else {
    startRecognition();
  }
}

btn.onclick = toggleListening;

clearBtn.onclick = () => {
  finalTranscript = "";
  result.textContent = "";
  if (!listening) status.textContent = "Click mic to start";
};

sendBtn.onclick = async () => {
  if (!finalTranscript.trim()) {
    status.textContent = "⚠ Nothing to send";
    return;
  }
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";
  status.textContent = "⏳ Sending to pi...";
  try {
    const resp = await fetch("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: finalTranscript.trim() })
    });
    if (resp.ok) {
      status.textContent = "✅ Sent! Close this tab.";
      sendBtn.textContent = "✓ Sent";
    } else {
      status.textContent = "❌ Send failed: " + (await resp.text());
      sendBtn.disabled = false;
      sendBtn.textContent = "Send to pi ✓";
    }
  } catch (e) {
    status.textContent = "❌ Connection error: " + e.message;
    sendBtn.disabled = false;
    sendBtn.textContent = "Send to pi ✓";
  }
};

// Keyboard shortcut: spacebar toggle
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); toggleListening(); }
  if (e.code === 'Enter' && !sendBtn.disabled) sendBtn.click();
  if (e.code === 'Escape') {
    stopListening();
    if (finalTranscript.trim()) sendBtn.click();
  }
});
</script>
</body>
</html>`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("voice", {
		description: "Voice input via browser mic. Usage: /voice [port]",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/voice requires interactive TUI mode", "error");
				return;
			}

			// Parse optional port arg (for SSH port forwarding)
			const port = args ? parseInt(args.trim(), 10) : 0;
			if (args && (isNaN(port) || port < 1024 || port > 65535)) {
				ctx.ui.notify("Port must be number 1024-65535", "error");
				return;
			}
			const finalPort = port > 0 ? port : await findFreePort();
			const isSsh = port > 0;
			let serverUrl = `http://localhost:${finalPort}`;
			let textResult: string | null = null;
			const token = randomBytes(16).toString("hex");
			let server: Server = createServer((req, res) => {
				if (req.method === "POST" && req.url === "/send") {
					let body = "";
					req.on("data", (chunk) => (body += chunk));
					req.on("end", () => {
						try {
							const data = JSON.parse(body);
							if (data.token === token && data.text) {
								textResult = data.text;
							}
							res.writeHead(200, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ ok: true }));
						} catch (e) {
							res.writeHead(400);
							res.end("bad request");
						}
					});
					return;
				}
				if (req.url === "/token") {
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ token }));
					return;
				}
				// Serve HTML page
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(HTML_PAGE);
			});

			server.listen(finalPort, "127.0.0.1");
			server.unref();

			// Open browser (only if local, skip for SSH)
			if (!isSsh) {
				try {
					const { execSync } = await import("node:child_process");
					execSync(`xdg-open "${serverUrl}" 2>/dev/null || open "${serverUrl}" 2>/dev/null || sensible-browser "${serverUrl}" 2>/dev/null`, {
						stdio: "ignore",
						timeout: 3000,
					});
				} catch {
					// browser open is best-effort
				}
			}

			// Show loader while waiting for voice input
			await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				const msg = isSsh
					? `🎤 SSH mode: port ${finalPort} open\n\n${theme.fg("accent", "1. In another terminal:")}\n${theme.fg("bold", `   ssh -L ${finalPort}:localhost:${finalPort} user@host`)}
\n${theme.fg("accent", "2. Open browser on laptop:")}\n${theme.fg("bold", `   http://localhost:${finalPort}`)}
\n${theme.fg("dim", "3. Click 🎤 → Speak → Send to pi")}`
					: `🎤 Voice input open in browser\n${theme.fg("accent", serverUrl)}\n\n${theme.fg("dim", "Speak → click Send → text appears here")}`;

				const loader = new BorderedLoader(tui, theme, msg);
				loader.onAbort = () => {
					server.close();
					done(null);
				};

				// Poll for result
				const poll = setInterval(() => {
					if (textResult !== null) {
						clearInterval(poll);
						server.close();
						done(textResult);
					}
				}, 500);

				// Cleanup on abort
				const origAbort = loader.onAbort;
				loader.onAbort = () => {
					clearInterval(poll);
					server.close();
					origAbort?.();
				};

				return loader;
			});

			if (textResult !== null) {
				ctx.ui.setEditorText(textResult);
				ctx.ui.notify("✅ Voice text loaded into editor", "info");
			} else {
				ctx.ui.notify("Voice input cancelled", "info");
			}
		},
	});
}

async function findFreePort(): Promise<number> {
	const { createServer } = await import("node:net");
	return new Promise((resolve) => {
		const srv = createServer();
		srv.listen(0, "127.0.0.1", () => {
			const port = (srv.address() as { port: number }).port;
			srv.close(() => resolve(port));
		});
	});
}