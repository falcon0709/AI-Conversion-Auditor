import OpenAI from "openai";
import {
  auditResultSchema,
  ISSUE_CATEGORIES,
  type AuditResult,
  type PageSignals,
} from "./types";

const SYSTEM_PROMPT = `You are Leakline, an expert conversion-rate auditor for small business websites.
Analyze the extracted page signals and identify where the site is losing customers.

You MUST evaluate these categories (use these exact ids):
${ISSUE_CATEGORIES.map((id) => `- ${id}`).join("\n")}

Rules:
- Return 4–8 issues that actually apply. Skip categories that look solid.
- Be specific and practical. Cite evidence from the signals.
- severity: high = likely losing leads now; medium = clear friction; low = polish.
- For copy problems (headline, CTA, pricing, FAQ, trust), include improvedCopy: concrete rewrite the business can paste.
- For technical/UX issues without copy (images, mobile viewport, SEO meta), omit improvedCopy or set null.
- Write for non-technical small business owners. No jargon walls.
- summary: one punchy sentence like "Your website is losing customers in these N places."`;

function buildUserPrompt(signals: PageSignals): string {
  return `Audit this homepage for conversion leaks.

URL: ${signals.finalUrl}
Title: ${signals.title ?? "(missing)"}
Meta description: ${signals.metaDescription ?? "(missing)"}
H1s: ${JSON.stringify(signals.h1)}
H2s: ${JSON.stringify(signals.h2.slice(0, 10))}
CTAs found: ${JSON.stringify(signals.ctas)}
Nav links: ${JSON.stringify(signals.navLinks.slice(0, 15))}
Pricing snippets: ${JSON.stringify(signals.pricingSnippets)}
Has FAQ section: ${signals.hasFaq}
FAQ-like snippets: ${JSON.stringify(signals.faqSnippets)}
Trust signals: ${JSON.stringify(signals.trustSignals)}
Images: ${signals.imageCount} total, ${signals.imagesWithoutLazy} without loading=lazy, ${signals.imagesMissingAlt} missing alt
Has viewport meta: ${signals.hasViewportMeta}
Has Open Graph / Twitter cards: ${signals.hasOpenGraph}
Approx word count: ${signals.wordCount}
Body text sample:
"""
${signals.bodyTextSample}
"""

Respond with JSON only matching:
{
  "summary": string,
  "issues": [
    {
      "id": one of ${JSON.stringify(ISSUE_CATEGORIES)},
      "title": string,
      "severity": "high" | "medium" | "low",
      "why": string,
      "evidence": string,
      "improvedCopy": string | null
    }
  ]
}`;
}

export async function runAudit(signals: PageSignals): Promise<AuditResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(signals) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  const result = auditResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("OpenAI response failed validation.");
  }

  return result.data;
}
