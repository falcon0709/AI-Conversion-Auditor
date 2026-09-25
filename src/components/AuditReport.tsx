"use client";

import type { AuditResponse } from "@/lib/types";
import { IssueCard } from "./IssueCard";

type AuditReportProps = {
  report: AuditResponse;
};

export function AuditReport({ report }: AuditReportProps) {
  const host = (() => {
    try {
      return new URL(report.finalUrl).hostname;
    } catch {
      return report.finalUrl;
    }
  })();

  return (
    <section className="report" aria-live="polite">
      <header className="report__header">
        <p className="report__eyebrow">Audit for {host}</p>
        <h2 className="report__summary">{report.summary}</h2>
        <p className="report__meta">
          {report.issues.length} conversion leaks · analyzed{" "}
          {new Date(report.analyzedAt).toLocaleString()}
        </p>
      </header>

      <div className="report__list">
        {report.issues.map((issue, index) => (
          <IssueCard key={`${issue.id}-${index}`} issue={issue} index={index} />
        ))}
      </div>
    </section>
  );
}
