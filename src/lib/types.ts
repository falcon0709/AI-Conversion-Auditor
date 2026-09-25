import { z } from "zod";

export const ISSUE_CATEGORIES = [
  "weak_headline",
  "unclear_cta",
  "poor_mobile_ux",
  "slow_loading_images",
  "missing_trust_signals",
  "confusing_pricing",
  "weak_seo",
  "missing_faq",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const auditRequestSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .transform((value) => {
      const trimmed = value.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    })
    .pipe(z.string().url("Enter a valid website URL")),
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;

export const pageSignalsSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  title: z.string().nullable(),
  metaDescription: z.string().nullable(),
  h1: z.array(z.string()),
  h2: z.array(z.string()),
  headlines: z.array(z.string()),
  ctas: z.array(z.string()),
  navLinks: z.array(z.string()),
  pricingSnippets: z.array(z.string()),
  hasFaq: z.boolean(),
  faqSnippets: z.array(z.string()),
  trustSignals: z.array(z.string()),
  imageCount: z.number(),
  imagesWithoutLazy: z.number(),
  imagesMissingAlt: z.number(),
  hasViewportMeta: z.boolean(),
  hasOpenGraph: z.boolean(),
  wordCount: z.number(),
  bodyTextSample: z.string(),
});

export type PageSignals = z.infer<typeof pageSignalsSchema>;

export const auditIssueSchema = z.object({
  id: z.enum(ISSUE_CATEGORIES),
  title: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  why: z.string(),
  evidence: z.string(),
  improvedCopy: z.string().optional().nullable(),
});

export const auditResultSchema = z.object({
  summary: z.string(),
  issues: z.array(auditIssueSchema).min(1).max(8),
});

export type AuditIssue = z.infer<typeof auditIssueSchema>;
export type AuditResult = z.infer<typeof auditResultSchema>;

export type AuditResponse = AuditResult & {
  url: string;
  finalUrl: string;
  analyzedAt: string;
};
