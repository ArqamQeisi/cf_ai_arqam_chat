# cf_ai_arqam_chat

AI chat app built on Cloudflare Workers AI + Durable Objects. Built for the Cloudflare SWE internship optional assignment.

## Stack

- LLM: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via Workers AI
- Memory: Durable Objects (one per session, stores message history)
- Coordination: Worker routes requests to the correct DO by session ID
- UI: Plain HTML/JS served from the Worker itself, no Pages needed

## How to run

```bash
npm install
npx wrangler login
npx wrangler dev        # local: http://localhost:8787
npx wrangler deploy     # push to Cloudflare
```

## API

| Route | Method | Description |
|---|---|---|
| `/` | GET | Chat UI |
| `/api/chat` | POST | Send message, get reply |
| `/api/history` | GET | Full session history |
| `/api/reset` | DELETE | Clear memory |

Pass `X-Session-Id` header to separate sessions.

## Structure

```
src/index.ts      - Worker + ChatSession DO + HTML UI
wrangler.toml     - AI binding + DO binding + migration
package.json
tsconfig.json
PROMPTS.md
```
