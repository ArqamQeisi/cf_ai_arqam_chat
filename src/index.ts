import { DurableObject } from "cloudflare:workers";

export interface Env {
  AI: Ai;
  CHAT_SESSIONS: DurableObjectNamespace<ChatSession>;
}

export class ChatSession extends DurableObject {
  private messages: { role: string; content: string }[] = [];

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/chat") {
      const body = (await request.json()) as { message: string };

      this.messages.push({ role: "user", content: body.message });

      const context = this.messages.slice(-20);

      const result = await (this.env as Env).AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant. Be concise.",
            },
            ...context,
          ],
        }
      );

      const reply = (result as { response?: string }).response ?? "";
      this.messages.push({ role: "assistant", content: reply });

      return Response.json({ reply, history: this.messages });
    }

    if (request.method === "GET" && url.pathname === "/history") {
      return Response.json({ history: this.messages });
    }

    if (request.method === "DELETE" && url.pathname === "/reset") {
      this.messages = [];
      return Response.json({ ok: true });
    }

    return new Response("not found", { status: 404 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname.startsWith("/api/")) {
      const sessionId = request.headers.get("X-Session-Id") ?? "default";
      const id = env.CHAT_SESSIONS.idFromName(sessionId);
      const stub = env.CHAT_SESSIONS.get(id);

      const doUrl = new URL(request.url);
      doUrl.pathname = url.pathname.replace("/api", "");

      let body: BodyInit | null = null;
      if (request.method === "POST") {
        const original = await request.json();
        body = JSON.stringify(original);
      }

      const doReq = new Request(doUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body,
      });

      const doRes = await stub.fetch(doReq);
      return new Response(doRes.body, {
        status: doRes.status,
        headers: { ...Object.fromEntries(doRes.headers), ...cors },
      });
    }

    if (url.pathname === "/") {
      return new Response(UI, {
        headers: { "Content-Type": "text/html", ...cors },
      });
    }

    return new Response("not found", { status: 404 });
  },
};

const UI = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>cf_ai_arqam_chat</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px;
      background: #0d1117;
      color: #e6edf3;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 22px 32px 18px;
      border-bottom: 1px solid #21262d;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    header h1 { font-size: 1.25rem; font-weight: 600; }
    header span { font-size: 0.85rem; color: #8b949e; }
    #chat-box {
      flex: 1;
      overflow-y: auto;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .msg {
      max-width: 70%;
      padding: 14px 18px;
      border-radius: 14px;
      line-height: 1.6;
      font-size: 1rem;
      word-break: break-word;
    }
    .msg.user {
      background: #1f6feb;
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .msg.bot {
      background: #161b22;
      border: 1px solid #21262d;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .msg.pending { color: #8b949e; font-style: italic; }
    footer {
      padding: 18px 32px 28px;
      display: flex;
      gap: 10px;
      border-top: 1px solid #21262d;
      flex-shrink: 0;
    }
    input {
      flex: 1;
      background: #161b22;
      border: 1px solid #30363d;
      color: #e6edf3;
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 1rem;
      outline: none;
    }
    input:focus { border-color: #1f6feb; }
    button {
      background: #1f6feb;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 14px 22px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      white-space: nowrap;
    }
    button:hover { background: #388bfd; }
    #reset { background: #21262d; color: #8b949e; }
    #reset:hover { background: #30363d; color: #e6edf3; }
  </style>
</head>
<body>
  <header>
    <h1>cf_ai_arqam_chat</h1>
    <span>llama-3.3-70b · Workers AI · Durable Objects</span>
  </header>
  <div id="chat-box">
    <div class="msg bot">Running on Llama 3.3 via Cloudflare Workers AI. Memory persists per session using Durable Objects.</div>
  </div>
  <footer>
    <input id="inp" type="text" placeholder="Message..." autofocus />
    <button onclick="send()">Send</button>
    <button id="reset" onclick="reset()">Reset</button>
  </footer>
  <script>
    const sid = 'sess-' + Math.random().toString(36).slice(2, 9);
    const box = document.getElementById('chat-box');
    const inp = document.getElementById('inp');

    inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    function addMsg(text, cls) {
      const el = document.createElement('div');
      el.className = 'msg ' + cls;
      el.textContent = text;
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
      return el;
    }

    async function send() {
      const text = inp.value.trim();
      if (!text) return;
      inp.value = '';
      addMsg(text, 'user');
      const pending = addMsg('...', 'bot pending');
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        pending.remove();
        addMsg(data.reply, 'bot');
      } catch {
        pending.remove();
        addMsg('Error.', 'bot');
      }
    }

    async function reset() {
      await fetch('/api/reset', { method: 'DELETE', headers: { 'X-Session-Id': sid } });
      box.innerHTML = '<div class="msg bot">Reset.</div>';
    }
  </script>
</body>
</html>`;
