# Leakline — AI Website Conversion Auditor

Paste a homepage URL, get a free AI audit of where the site loses customers, plus rewritten copy.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Cheerio for HTML extraction
- OpenAI (`gpt-4o-mini`) for analysis and copy rewrites
- Zod for validation

## Setup

```bash
npm install
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

`POST /api/audit`

```json
{ "url": "https://example.com" }
```

Returns summary + conversion issues with optional `improvedCopy`.
