export const AI_PROVIDERS = [
  "openai",
  "openrouter",
  "groq",
  "mistral",
  "gemini",
  "huggingface",
  "cloudflare",
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  cloudflareAccountId?: string;
};

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-small-latest",
  gemini: "gemini-2.0-flash",
  huggingface: "meta-llama/Meta-Llama-3-8B-Instruct",
  cloudflare: "@cf/meta/llama-3.1-8b-instruct",
};

const DEFAULT_BASE_URLS: Partial<Record<AiProvider, string>> = {
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  huggingface: "https://router.huggingface.co/v1",
};

function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export function getAiConfig(): AiConfig {
  const providerRaw = (
    process.env.AI_PROVIDER ||
    (process.env.OPENAI_API_KEY && !process.env.AI_API_KEY ? "openai" : "") ||
    "openai"
  )
    .trim()
    .toLowerCase();

  if (!isAiProvider(providerRaw)) {
    throw new Error(
      `Invalid AI_PROVIDER "${providerRaw}". Use one of: ${AI_PROVIDERS.join(", ")}.`,
    );
  }

  const apiKey =
    process.env.AI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY is not configured. Set AI_API_KEY (or legacy OPENAI_API_KEY) in .env.",
    );
  }

  const model =
    process.env.AI_MODEL?.trim() || DEFAULT_MODELS[providerRaw];

  const baseUrl =
    process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URLS[providerRaw];

  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

  if (providerRaw === "cloudflare" && !cloudflareAccountId) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID is required when AI_PROVIDER=cloudflare.",
    );
  }

  return {
    provider: providerRaw,
    apiKey,
    model,
    baseUrl,
    cloudflareAccountId,
  };
}
