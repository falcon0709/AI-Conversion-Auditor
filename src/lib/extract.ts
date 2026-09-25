import * as cheerio from "cheerio";
import type { PageSignals } from "./types";

function cleanText(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueNonEmpty(values: string[], limit = 12): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned.slice(0, 240));
    if (result.length >= limit) break;
  }
  return result;
}

const CTA_PATTERN =
  /\b(get started|start free|try free|sign up|book|schedule|buy|shop|order|contact|learn more|request|demo|quote|subscribe|join|download|claim|call)\b/i;

const TRUST_PATTERN =
  /\b(testimonial|review|trusted by|as seen|secure|ssl|guarantee|warranty|certified|award|customers love|rated|stars?)\b/i;

const FAQ_PATTERN = /\b(faq|frequently asked|common questions)\b/i;

const PRICE_PATTERN =
  /(\$\s?\d[\d,]*(?:\.\d+)?|\d+\s?(?:usd|eur|gbp)|\/mo|\/month|per month|pricing|plans?)/i;

export function extractPageSignals(
  html: string,
  url: string,
  finalUrl: string,
): PageSignals {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe").remove();

  const title = cleanText($("title").first().text()) || null;
  const metaDescription =
    cleanText($('meta[name="description"]').attr("content")) || null;

  const h1 = uniqueNonEmpty(
    $("h1")
      .map((_, el) => $(el).text())
      .get(),
  );
  const h2 = uniqueNonEmpty(
    $("h2")
      .map((_, el) => $(el).text())
      .get(),
    16,
  );

  const headlines = uniqueNonEmpty([...h1, ...h2], 20);

  const buttonLike = $(
    "a, button, [role='button'], input[type='submit'], input[type='button']",
  )
    .map((_, el) => {
      const text =
        $(el).text() ||
        $(el).attr("value") ||
        $(el).attr("aria-label") ||
        $(el).attr("title") ||
        "";
      return cleanText(text);
    })
    .get();

  const ctas = uniqueNonEmpty(
    buttonLike.filter((text) => text.length <= 80 && CTA_PATTERN.test(text)),
    15,
  );

  const navLinks = uniqueNonEmpty(
    $("nav a, header a")
      .map((_, el) => $(el).text())
      .get(),
    20,
  );

  const bodyText = cleanText($("body").text());
  const bodyChunks = bodyText
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean);

  const pricingSnippets = uniqueNonEmpty(
    bodyChunks.filter((chunk) => PRICE_PATTERN.test(chunk)),
    8,
  );

  const hasFaqHeading = $("h1, h2, h3, h4, summary").toArray().some((el) =>
    FAQ_PATTERN.test($(el).text()),
  );
  const hasFaqMarkup =
    $('[itemtype*="FAQPage"], .faq, #faq, [id*="faq" i], [class*="faq" i]')
      .length > 0;
  const hasFaq = hasFaqHeading || hasFaqMarkup;

  const faqSnippets = uniqueNonEmpty(
    $("h2, h3, h4, summary, dt")
      .map((_, el) => $(el).text())
      .get()
      .filter((text) => /\?$/.test(text) || FAQ_PATTERN.test(text)),
    8,
  );

  const trustCandidates = [
    ...$("[class*='testimonial' i], [class*='review' i], [class*='logo' i]")
      .map((_, el) => cleanText($(el).text()).slice(0, 160))
      .get(),
    ...bodyChunks.filter((chunk) => TRUST_PATTERN.test(chunk)),
  ];
  const trustSignals = uniqueNonEmpty(trustCandidates, 10);

  const images = $("img").toArray();
  const imageCount = images.length;
  let imagesWithoutLazy = 0;
  let imagesMissingAlt = 0;
  for (const img of images) {
    const loading = ($(img).attr("loading") ?? "").toLowerCase();
    if (loading !== "lazy") imagesWithoutLazy += 1;
    const alt = $(img).attr("alt");
    if (alt === undefined || alt === null || !cleanText(alt)) {
      imagesMissingAlt += 1;
    }
  }

  const hasViewportMeta = $('meta[name="viewport"]').length > 0;
  const hasOpenGraph =
    $('meta[property^="og:"]').length > 0 ||
    $('meta[name^="twitter:"]').length > 0;

  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  return {
    url,
    finalUrl,
    title,
    metaDescription,
    h1,
    h2,
    headlines,
    ctas,
    navLinks,
    pricingSnippets,
    hasFaq,
    faqSnippets,
    trustSignals,
    imageCount,
    imagesWithoutLazy,
    imagesMissingAlt,
    hasViewportMeta,
    hasOpenGraph,
    wordCount,
    bodyTextSample: bodyText.slice(0, 2500),
  };
}
