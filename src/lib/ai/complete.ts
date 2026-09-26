import OpenAI from "openai";
import { getAiConfig, type AiConfig, type AiProvider } from "./config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Keep completion size bounded (helps OpenRouter low-credit keys). */
const MAX_OUTPUT_TOKENS = 2000;

function openAiCompatibleBaseUrl(config: AiConfig): string | undefined {
  if (config.provider === "cloudflare") {
    return `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/ai/v1`;
  }
  if (config.provider === "openai") {
    return config.baseUrl; // undefined = OpenAI default
  }
  return config.baseUrl;
}

function supportsJsonObjectMode(provider: AiProvider): boolean {
  return (
    provider === "openai" ||
    provider === "openrouter" ||
    provider === "groq" ||
    provider === "mistral"
  );
}

async function completeOpenAiCompatible(
  config: AiConfig,
  messages: ChatMessage[],
  temperature: number,
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: openAiCompatibleBaseUrl(config),
    defaultHeaders:
      config.provider === "openrouter"
        ? {
            "HTTP-Referer": "https://leakline.app",
            "X-Title": "Leakline",
          }
        : undefined,
  });

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature,
      max_tokens: MAX_OUTPUT_TOKENS,
      ...(supportsJsonObjectMode(config.provider)
        ? { response_format: { type: "json_object" as const } }
        : {}),
      messages,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI provider returned an empty response.");
    }
    return content;
  } catch (error) {
    if (config.provider === "ollama") {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("ECONNREFUSED") ||
        message.includes("fetch failed") ||
        message.includes("Connection error")
      ) {
        throw new Error(
          "Could not reach Ollama at " +
            (config.baseUrl ?? "http://127.0.0.1:11434/v1") +
            ". Start Ollama and pull your model (e.g. `ollama pull llama3.2`).",
        );
      }
    }
    throw error;
  }
}

async function completeGemini(
  config: AiConfig,
  messages: ChatMessage[],
  temperature: number,
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
  );
  url.searchParams.set("key", config.apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gemini request failed (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ""}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}

export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export async function completeChatJson(
  messages: ChatMessage[],
  temperature = 0.4,
): Promise<string> {
  const config = getAiConfig();

  if (config.provider === "gemini") {
    return completeGemini(config, messages, temperature);
  }

  return completeOpenAiCompatible(config, messages, temperature);
}
