"use client";

import { useState } from "react";
import type { AuditIssue } from "@/lib/types";

const severityLabel: Record<AuditIssue["severity"], string> = {
  high: "High impact",
  medium: "Medium",
  low: "Low",
};

type IssueCardProps = {
  issue: AuditIssue;
  index: number;
};

export function IssueCard({ issue, index }: IssueCardProps) {
  const [open, setOpen] = useState(index < 2);

  return (
    <article className={`issue-card severity-${issue.severity}`}>
      <button
        type="button"
        className="issue-card__header"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="issue-card__index">{String(index + 1).padStart(2, "0")}</span>
        <span className="issue-card__titles">
          <span className="issue-card__title">{issue.title}</span>
          <span className={`issue-card__severity severity-${issue.severity}`}>
            {severityLabel[issue.severity]}
          </span>
        </span>
        <span className="issue-card__chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="issue-card__body">
          <p className="issue-card__why">{issue.why}</p>
          <p className="issue-card__evidence">
            <span>Evidence</span>
            {issue.evidence}
          </p>
          {issue.improvedCopy ? (
            <div className="issue-card__copy">
              <span>Improved copy</span>
              <blockquote>{issue.improvedCopy}</blockquote>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
