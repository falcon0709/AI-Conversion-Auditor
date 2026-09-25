"use client";

import { useState } from "react";
import { AuditReport } from "@/components/AuditReport";
import { UrlForm } from "@/components/UrlForm";
import type { AuditResponse } from "@/lib/types";

export function AuditorApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AuditResponse | null>(null);

  async function handleAudit(url: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as AuditResponse & { error?: string };

      if (!response.ok) {
        setReport(null);
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setReport(data);
    } catch {
      setReport(null);
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div className="hero__atmosphere" aria-hidden />
        <div className="hero__inner">
          <p className="brand">Leakline</p>
          <h1 className="hero__headline">
            Your website is losing customers.
            <span> We show you where.</span>
          </h1>
          <p className="hero__support">
            Paste any homepage URL. Get a free AI conversion audit with
            rewritten headlines, CTAs, and trust copy you can use today.
          </p>
          <UrlForm onSubmit={handleAudit} loading={loading} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {loading ? (
            <p className="form-status" aria-live="polite">
              Fetching the page, reading conversion signals, drafting fixes…
            </p>
          ) : null}
        </div>
      </section>

      {report ? <AuditReport report={report} /> : null}
    </>
  );
}
