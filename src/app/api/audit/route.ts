import { NextResponse } from "next/server";
import { runAudit } from "@/lib/audit";
import { extractPageSignals } from "@/lib/extract";
import { FetchPageError, fetchPage } from "@/lib/fetch-page";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { auditRequestSchema, type AuditResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Too many audits. Try again in ${limit.retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = auditRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Enter a valid website URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const page = await fetchPage(parsed.data.url);
    const signals = extractPageSignals(page.html, page.url, page.finalUrl);
    const audit = await runAudit(signals);

    const response: AuditResponse = {
      ...audit,
      url: page.url,
      finalUrl: page.finalUrl,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof FetchPageError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    const message =
      error instanceof Error ? error.message : "Audit failed unexpectedly.";

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY." },
        { status: 500 },
      );
    }

    console.error("Audit failed:", error);
    return NextResponse.json(
      { error: "Could not complete the audit. Please try again." },
      { status: 500 },
    );
  }
}
