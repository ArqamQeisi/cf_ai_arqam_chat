# PROMPTS.md

Prompts used during development as required by the assignment.

---

## 1. Initial architecture


Prompt:
> I need to build a Cloudflare Workers app with 4 things: Llama 3.3 via Workers AI, Durable Objects for coordination and memory, a chat UI, and persistent state. What's the simplest architecture that actually works without overcomplicating it?

Used: the suggestion to embed the HTML as a template literal in the Worker so the whole thing deploys in one `wrangler deploy` instead of needing Pages separately.

---

## 2. Durable Object structure


Prompt:
> Write a Durable Object class in TypeScript that stores chat history as an array of role/content objects and handles POST /chat, GET /history, DELETE /reset. Use the new DurableObject base class from cloudflare:workers.

Used: base structure of the ChatSession class. Added the slice(-20) myself to avoid token overflow.

---

## 3. UI


Prompt:
> Write a minimal dark-mode HTML/JS chat interface with no frameworks. Message bubbles left/right, text input, send button, reset button. GitHub dark theme colours. Random session ID generated on load, sent as X-Session-Id header.

Used: CSS layout. Trimmed the JS down quite a bit from what it gave me.

---

## 4. DO env access bug


Prompt:
> Workers AI binding works in my main Worker but I'm getting undefined inside the Durable Object. How do I access env.AI from inside a DO?

Used: learned that with the new DurableObject base class, this.env is available automatically, switched from passing env in the body to using this.env directly.
