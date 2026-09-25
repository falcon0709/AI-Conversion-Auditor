import dns from "node:dns/promises";
import net from "node:net";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;

export class FetchPageError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FetchPageError";
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIp(ip: string): boolean {
  const normalized = ip.replace(/^\[|\]$/g, "");
  if (net.isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (net.isIP(normalized) === 6) {
    const lower = normalized.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
    if (lower.startsWith("::ffff:")) {
      const mapped = lower.slice(7);
      if (net.isIP(mapped) === 4) return isPrivateIpv4(mapped);
    }
    return false;
  }
  return true;
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0"
  ) {
    throw new FetchPageError("That host cannot be audited.");
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new FetchPageError("That host cannot be audited.");
    }
    return;
  }

  let addresses: string[];
  try {
    const result = await dns.lookup(host, { all: true, verbatim: true });
    addresses = result.map((entry) => entry.address);
  } catch {
    throw new FetchPageError("Could not resolve that website.");
  }

  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new FetchPageError("That host cannot be audited.");
  }
}

function validateAuditUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new FetchPageError("Enter a valid website URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new FetchPageError("Only http and https URLs are supported.");
  }

  if (parsed.username || parsed.password) {
    throw new FetchPageError("URLs with credentials are not allowed.");
  }

  return parsed;
}

async function readLimitedBody(response: Response): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      reader.cancel().catch(() => undefined);
      throw new FetchPageError("The page is too large to audit.");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export type FetchedPage = {
  url: string;
  finalUrl: string;
  html: string;
};

export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  let current = validateAuditUrl(rawUrl);
  await assertPublicHostname(current.hostname);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "LeaklineBot/1.0 (+https://leakline.app; conversion audit)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new FetchPageError("The site returned a broken redirect.");
        }
        if (redirectCount === MAX_REDIRECTS) {
          throw new FetchPageError("Too many redirects.");
        }
        const next = new URL(location, current);
        const nextValidated = validateAuditUrl(next.toString());
        await assertPublicHostname(nextValidated.hostname);
        current = nextValidated;
        continue;
      }

      if (!response.ok) {
        throw new FetchPageError(
          `Could not fetch the page (HTTP ${response.status}).`,
          response.status,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (
        contentType &&
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml")
      ) {
        throw new FetchPageError("That URL does not look like an HTML page.");
      }

      const html = await readLimitedBody(response);
      if (!html.trim()) {
        throw new FetchPageError("The page returned empty content.");
      }

      return {
        url: rawUrl,
        finalUrl: current.toString(),
        html,
      };
    } catch (error) {
      if (error instanceof FetchPageError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new FetchPageError("Timed out while fetching the page.");
      }
      throw new FetchPageError("Could not fetch that website.");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new FetchPageError("Too many redirects.");
}
