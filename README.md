# Leakline — AI Website Conversion Auditor

Paste a homepage URL, get a free AI audit of where the site loses customers, plus rewritten copy.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Cheerio for HTML extraction
- Multi-provider AI (OpenAI, OpenRouter, Groq, Mistral, Gemini, Hugging Face, Cloudflare)
- Zod for validation

## Setup

```bash
npm install
cp .env.example .env
# Set AI_PROVIDER + AI_API_KEY (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## AI providers

Set these in `.env`:

| `AI_PROVIDER` | Key from | Default model |
|---|---|---|
| `openai` | [platform.openai.com](https://platform.openai.com) | `gpt-4o-mini` |
| `openrouter` | [openrouter.ai](https://openrouter.ai) | `openai/gpt-4o-mini` |
| `groq` | [console.groq.com](https://console.groq.com) | `llama-3.3-70b-versatile` |
| `mistral` | [console.mistral.ai](https://console.mistral.ai) | `mistral-small-latest` |
| `gemini` | [aistudio.google.com](https://aistudio.google.com) | `gemini-2.0-flash` |
| `huggingface` | [huggingface.co](https://huggingface.co/settings/tokens) | `meta-llama/Meta-Llama-3-8B-Instruct` |
| `cloudflare` | [dash.cloudflare.com](https://dash.cloudflare.com) API token | `@cf/meta/llama-3.1-8b-instruct` |

Also set:

- `AI_API_KEY` — your key from that platform  
- `AI_MODEL` — optional override  
- `AI_BASE_URL` — optional custom OpenAI-compatible endpoint  
- `CLOUDFLARE_ACCOUNT_ID` — required for `cloudflare`

Example (Gemini):

```env
AI_PROVIDER=gemini
AI_API_KEY=AIza...
AI_MODEL=gemini-2.0-flash
```

Legacy `OPENAI_API_KEY` still works if `AI_API_KEY` is unset (treated as OpenAI).

## API

`POST /api/audit`

```json
{ "url": "https://example.com" }
```

Returns summary + conversion issues with optional `improvedCopy`.
