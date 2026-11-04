import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "~/db.server";
import { generateSmartFallbackAltText, smartTrimAltText } from "./vision.server";

export interface OptimizationResult {
  seoTitle: string;
  seoDescription: string;
  specMatrixHtml: string;
  faqList: Array<{ question: string; answer: string }>;
  schemaJson: Record<string, any>;
  imageAltText: string;
  aiScore: number;
  scoreBreakdown: {
    titleOptimization: number;
    metaDescriptionQuality: number;
    specMatrixCompleteness: number;
    schemaRichness: number;
    conversationalFaqDepth: number;
  };
  summarySnippet: string;
  /** Score of the product as it is live right now, computed with the same checks. */
  baselineScore?: number;
  competitorGapAnalysis?: {
    identifiedKeywords: string[];
    missingEntities: string[];
    closingStrategy: string;
  };
}

export interface GEOResponse {
  title: string;
  metaDescription: string;
  geoScore: number;
  specMatrix: string;
  faqAccordion: Array<{ question: string; answer: string }>;
  speakableSummary: string;
  aiOverviewSnippet: string;
  schemaJson: Record<string, any>;
}

export interface ProductInput {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  price?: string;
  currency?: string;
  handle?: string;
  imageUrl?: string;
  currentAltText?: string;
  shopDomain?: string;
  /** Highest variant price (real data only). */
  maxPrice?: string;
  /** Real total inventory across variants, when tracked. */
  totalInventory?: number;
  /** Real product options, e.g. [{ name: "Size", values: ["S","M"] }]. */
  options?: Array<{ name: string; values: string[] }>;
  /** Real variants. */
  variants?: Array<{ title?: string; sku?: string | null; price?: string; availableForSale?: boolean }>;
  competitorData?: {
    url: string;
    title?: string;
    extractedKeywords?: string[];
    specifications?: Record<string, string>;
  };
}

/**
 * Cleans diagnostic or unoptimized strings into clean, high-converting commercial titles.
 * Transforms placeholders like "Raw unoptimized backpack 26L" into "Vanguard AeroVent 26L Ultra-Light EDC Backpack".
 */
export function cleanCommercialProductTitle(rawTitle: string, vendor?: string): string {
  if (!rawTitle) return "Premium Product";

  // General purge of diagnostic/raw markers without altering the merchant's real product name
  let cleaned = rawTitle
    .replace(/\b(raw|unoptimized|sample|test|demo|placeholder|draft|copy\s*of)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) {
    cleaned = rawTitle.trim() || "Premium Product";
  }

  return cleaned;
}

/**
 * Strips diagnostic placeholders from generated copy.
 */
function stripDiagnosticWords(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b(raw|unoptimized|sample|test|placeholder|draft)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Retrieves the effective Gemini API key: first checks DB settings for the shop,
 * then falls back to process.env.GEMINI_API_KEY.
 */
export async function getGeminiApiKey(shop?: string): Promise<string | null> {
  if (shop) {
    const setting = await db.appSetting.findUnique({ where: { shop } });
    if (setting?.geminiApiKey && setting.geminiApiKey.trim() !== "") {
      return setting.geminiApiKey.trim();
    }
  }
  return process.env.GEMINI_API_KEY?.trim() || null;
}

/**
 * Optimizes a product using Gemini Flash with structured JSON output.
 * If no API key is set, returns an intelligent high-grade fallback payload.
 */
export async function optimizeProductWithAI(
  product: ProductInput,
  shop?: string
): Promise<OptimizationResult> {
  const apiKey = await getGeminiApiKey(shop);

  if (apiKey) {
    try {
      return await generateWithGemini(apiKey, product);
    } catch (error) {
      console.warn("Gemini API call failed, falling back to rule-based AI engine:", error);
    }
  }

  return generateSmartFallbackOptimization(product);
}

/**
 * Standard Generative Engine Optimization (GEO) generator matching exact enterprise schema.
 */
export async function generateGEOOptimization(
  product: ProductInput,
  shop?: string
): Promise<GEOResponse> {
  const opt = await optimizeProductWithAI(product, shop);
  return {
    title: opt.seoTitle,
    metaDescription: opt.seoDescription,
    geoScore: opt.aiScore,
    specMatrix: opt.specMatrixHtml,
    faqAccordion: opt.faqList,
    speakableSummary: opt.summarySnippet,
    aiOverviewSnippet: opt.summarySnippet,
    schemaJson: opt.schemaJson,
  };
}

// ---------------------------------------------------------------------------
// FACT HELPERS: everything below is built ONLY from real product data.
// Unknown facts are omitted, never invented (no warranty, shipping, returns,
// ratings, materials or dimensions unless the merchant's own text says so).
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextFromHtml(html?: string): string {
  return (html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Removes any block RankPilot previously appended so we only read the merchant's own text. */
function merchantOwnText(html?: string): string {
  const raw = html || "";
  const cut = raw.search(/<(div|section|table|h2|h3)[^>]*(rankpilot|spec-matrix)[^>]*>/i);
  return plainTextFromHtml(cut > 0 ? raw.slice(0, cut) : raw);
}

function formatMoney(amount?: string, currency?: string): string | null {
  const n = parseFloat(amount || "");
  if (!isFinite(n) || n <= 0) return null;
  return `${n.toFixed(2)} ${currency || ""}`.trim();
}

function realOptions(product: ProductInput): Array<{ name: string; values: string[] }> {
  return (product.options || []).filter(
    (o) =>
      o &&
      o.name &&
      Array.isArray(o.values) &&
      o.values.length > 0 &&
      !(o.name.toLowerCase() === "title" && o.values.length === 1 && /default title/i.test(o.values[0]))
  );
}

function availabilityOf(product: ProductInput): "InStock" | "OutOfStock" | null {
  const vs = product.variants || [];
  if (vs.length > 0 && vs.some((v) => typeof v.availableForSale === "boolean")) {
    return vs.some((v) => v.availableForSale) ? "InStock" : "OutOfStock";
  }
  if (typeof product.totalInventory === "number" && product.totalInventory > 0) return "InStock";
  return null;
}

function publicTags(product: ProductInput): string[] {
  return (product.tags || []).filter(
    (t) => t && !/^(rankpilot|rp[-_]|_|internal|hidden|test|draft)/i.test(t)
  );
}

function priceText(product: ProductInput): string | null {
  const min = formatMoney(product.price, product.currency);
  const max = formatMoney(product.maxPrice, product.currency);
  if (!min) return null;
  if (max && max !== min) return `${min} to ${max}`;
  return min;
}

/** Topics we must never claim unless the merchant's own description mentions them. */
const UNVERIFIABLE_CLAIM = /warrant|guarantee|money[- ]?back|refund|return|free shipping|shipping|deliver|dispatch|rating|review|stars?\b|certif|award|best[- ]selling|#1|lifetime|\d+\s*-?\s*(day|days|year|years|month|months)\b/i;

function containsUnverifiedClaim(text: string, product: ProductInput): boolean {
  const own = merchantOwnText(product.descriptionHtml).toLowerCase();
  const m = text.match(new RegExp(UNVERIFIABLE_CLAIM.source, "gi"));
  if (!m) return false;
  return m.some((hit) => !own.includes(hit.toLowerCase()));
}

// ---------------------------------------------------------------------------
// REAL SCORING (same checks for "before" and "after")
// ---------------------------------------------------------------------------

export interface GeoScoreInput {
  seoTitle?: string;
  seoDescription?: string;
  specMatrixHtml?: string;
  faqCount?: number;
  schemaJson?: any;
}

export function computeGeoScore(input: GeoScoreInput): {
  total: number;
  breakdown: OptimizationResult["scoreBreakdown"];
} {
  const t = (input.seoTitle || "").trim().length;
  const titleOptimization = t === 0 ? 0 : t >= 30 && t <= 60 ? 20 : t >= 15 && t <= 70 ? 12 : 6;

  const d = (input.seoDescription || "").trim().length;
  const metaDescriptionQuality = d === 0 ? 0 : d >= 110 && d <= 160 ? 20 : d >= 70 && d <= 170 ? 14 : 7;

  const rows = ((input.specMatrixHtml || "").match(/<tr/gi) || []).length;
  const dataRows = Math.max(0, rows - ((input.specMatrixHtml || "").match(/<thead/gi) ? 1 : 0));
  const specMatrixCompleteness = Math.min(20, dataRows * 4);

  let schemaRichness = 0;
  try {
    const s = typeof input.schemaJson === "string" ? JSON.parse(input.schemaJson) : input.schemaJson;
    if (s && typeof s === "object") {
      const nodes: any[] = Array.isArray(s["@graph"]) ? s["@graph"] : [s];
      const productNode = nodes.find((n) => n && n["@type"] === "Product");
      if (productNode) {
        schemaRichness = 10;
        if (productNode.offers) schemaRichness += 5;
        if (productNode.brand) schemaRichness += 3;
        if (productNode.image || productNode.description) schemaRichness += 2;
      } else if (Object.keys(s).length > 0) {
        schemaRichness = 5;
      }
    }
  } catch {
    schemaRichness = 0;
  }

  const conversationalFaqDepth = Math.min(20, Math.max(0, input.faqCount || 0) * 5);

  const breakdown = {
    titleOptimization,
    metaDescriptionQuality,
    specMatrixCompleteness,
    schemaRichness,
    conversationalFaqDepth,
  };
  const total =
    titleOptimization + metaDescriptionQuality + specMatrixCompleteness + schemaRichness + conversationalFaqDepth;
  return { total, breakdown };
}

function countFaqs(faqJson: unknown): number {
  try {
    const v = typeof faqJson === "string" ? JSON.parse(faqJson) : faqJson;
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
}

/** Score of the product exactly as it is live now (before applying anything). */
export function computeBaselineScore(product: {
  title: string;
  descriptionHtml?: string;
  seo?: { title?: string; description?: string };
  rankpilotMetafields?: { specMatrix?: string; schemaJson?: string; faqJson?: string };
}): number {
  const desc = product.seo?.description || plainTextFromHtml(product.descriptionHtml).slice(0, 160);
  return computeGeoScore({
    seoTitle: product.seo?.title || product.title,
    seoDescription: desc,
    specMatrixHtml: product.rankpilotMetafields?.specMatrix || "",
    faqCount: countFaqs(product.rankpilotMetafields?.faqJson),
    schemaJson: product.rankpilotMetafields?.schemaJson || null,
  }).total;
}

// ---------------------------------------------------------------------------
// FACT-ONLY BUILDERS
// ---------------------------------------------------------------------------

export function buildFactAltText(product: ProductInput): string {
  const title = cleanCommercialProductTitle(product.title, product.vendor);
  const current = (product.currentAltText || "").trim();
  const titleWords = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  const looksMachineMade = /shows text:|generated data|placeholder|authentic catalog view|verified materials|premium fabric construction|retail presentation|\|/i.test(current);
  // Keep a merchant-written alt text when it clearly describes this product.
  if (
    current.length >= 15 &&
    !looksMachineMade &&
    titleWords.some((w) => current.toLowerCase().includes(w))
  ) {
    return smartTrimAltText(current, 124);
  }

  const parts: string[] = [title];
  const type = (product.productType || "").trim();
  const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (type && !squash(title).includes(squash(type))) parts.push(`(${type.toLowerCase()})`);
  const color = realOptions(product).find((o) => /colou?r/i.test(o.name));
  if (color && color.values.length <= 3) parts.push(`in ${color.values.join(", ")}`);
  const vendor = (product.vendor || "").trim();
  if (vendor && !title.toLowerCase().includes(vendor.toLowerCase())) parts.push(`by ${vendor}`);
  return smartTrimAltText(parts.join(" "), 124);
}

export function buildFactSpecMatrix(product: ProductInput): string {
  const rows: Array<[string, string]> = [];
  const vendor = (product.vendor || "").trim();
  if (vendor) rows.push(["Brand", vendor]);
  if (product.productType) rows.push(["Product type", product.productType]);
  const price = priceText(product);
  if (price) rows.push(["Price", price]);
  for (const o of realOptions(product)) rows.push([o.name, o.values.join(", ")]);
  const vs = product.variants || [];
  if (vs.length > 1) rows.push(["Variants", String(vs.length)]);
  if (vs.length === 1 && vs[0].sku) rows.push(["SKU", String(vs[0].sku)]);
  const avail = availabilityOf(product);
  if (avail) rows.push(["Availability", avail === "InStock" ? "In stock" : "Out of stock"]);
  const tags = publicTags(product);
  if (tags.length) rows.push(["Tags", tags.slice(0, 8).join(", ")]);

  if (rows.length === 0) return "";
  const body = rows
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  return `<table class="rankpilot-spec-matrix"><thead><tr><th>Specification</th><th>Details</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function buildFactFaqs(product: ProductInput): Array<{ question: string; answer: string }> {
  const title = cleanCommercialProductTitle(product.title, product.vendor);
  const faqs: Array<{ question: string; answer: string }> = [];

  const own = merchantOwnText(product.descriptionHtml);
  if (own.length >= 40) {
    const sentences = own.match(/[^.!?]+[.!?]+/g) || [own];
    const answer = sentences.slice(0, 2).join(" ").trim().slice(0, 320);
    faqs.push({ question: `What is the ${title}?`, answer });
  }

  const price = priceText(product);
  if (price) {
    faqs.push({
      question: `How much does the ${title} cost?`,
      answer: price.includes(" to ")
        ? `The ${title} is priced from ${price}, depending on the option you choose.`
        : `The ${title} is priced at ${price}.`,
    });
  }

  const opts = realOptions(product);
  if (opts.length) {
    faqs.push({
      question: `What options is the ${title} available in?`,
      answer: opts.map((o) => `${o.name}: ${o.values.join(", ")}`).join(". ") + ".",
    });
  }

  const avail = availabilityOf(product);
  if (avail) {
    faqs.push({
      question: `Is the ${title} in stock?`,
      answer:
        avail === "InStock"
          ? `Yes, the ${title} is currently available to order.`
          : `The ${title} is currently out of stock.`,
    });
  }

  const vendor = (product.vendor || "").trim();
  if (vendor && faqs.length < 4) {
    faqs.push({ question: `Who makes the ${title}?`, answer: `The ${title} is made by ${vendor}.` });
  }

  return faqs.slice(0, 4);
}

export function buildFactSchema(
  product: ProductInput,
  opts: { seoTitle?: string; seoDescription?: string; faqList?: Array<{ question: string; answer: string }> } = {}
): Record<string, any> {
  const rawDomain = (product.shopDomain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const productUrl = rawDomain && product.handle ? `https://${rawDomain}/products/${product.handle}` : undefined;

  const node: Record<string, any> = {
    "@type": "Product",
    name: product.title,
  };
  if (productUrl) {
    node["@id"] = `${productUrl}#product`;
    node.url = productUrl;
  }
  const desc = merchantOwnText(product.descriptionHtml) || opts.seoDescription || "";
  if (desc) node.description = desc.slice(0, 500);
  if (product.imageUrl) node.image = product.imageUrl;
  if (product.vendor) node.brand = { "@type": "Brand", name: product.vendor };
  if (product.productType) node.category = product.productType;
  const vs = product.variants || [];
  if (vs.length === 1 && vs[0].sku) node.sku = vs[0].sku;

  const min = parseFloat(product.price || "");
  const max = parseFloat(product.maxPrice || "");
  const avail = availabilityOf(product);
  if (isFinite(min) && min > 0 && product.currency) {
    const availability = avail ? `https://schema.org/${avail}` : undefined;
    if (isFinite(max) && max > min) {
      node.offers = {
        "@type": "AggregateOffer",
        priceCurrency: product.currency,
        lowPrice: min.toFixed(2),
        highPrice: max.toFixed(2),
        ...(vs.length ? { offerCount: vs.length } : {}),
        ...(availability ? { availability } : {}),
        ...(productUrl ? { url: productUrl } : {}),
      };
    } else {
      node.offers = {
        "@type": "Offer",
        priceCurrency: product.currency,
        price: min.toFixed(2),
        ...(availability ? { availability } : {}),
        ...(productUrl ? { url: productUrl } : {}),
      };
    }
  }

  // FAQ markup is already embedded as microdata in the product description,
  // so JSON-LD carries only the Product node (avoids duplicate FAQPage).
  void opts.faqList;
  const graph: any[] = [node];
  return { "@context": "https://schema.org", "@graph": graph };
}

function factSeoTitle(product: ProductInput): string {
  const title = cleanCommercialProductTitle(product.title, product.vendor);
  const vendor = (product.vendor || "").trim();
  if (vendor && !title.toLowerCase().includes(vendor.toLowerCase())) {
    const combined = `${title} | ${vendor}`;
    if (combined.length <= 60) return combined;
  }
  return smartTrimAltText(title, 60);
}

function factSeoDescription(product: ProductInput): string {
  const own = merchantOwnText(product.descriptionHtml);
  if (own.length >= 70) return smartTrimAltText(own, 155);
  const title = cleanCommercialProductTitle(product.title, product.vendor);
  const bits: string[] = [];
  bits.push(`${title}${product.vendor ? ` by ${product.vendor}` : ""}.`);
  if (own) bits.push(own.endsWith(".") ? own : `${own}.`);
  const opts = realOptions(product);
  if (opts.length) bits.push(`Available in ${opts.map((o) => o.values.slice(0, 4).join(", ")).join("; ")}.`);
  const price = priceText(product);
  if (price) bits.push(`Price: ${price.split(" to ")[0]}${price.includes(" to ") ? "+" : ""}.`);
  return smartTrimAltText(bits.join(" "), 155);
}

function assembleResult(
  product: ProductInput,
  parts: {
    seoTitle: string;
    seoDescription: string;
    faqList: Array<{ question: string; answer: string }>;
    summarySnippet: string;
    competitorGapAnalysis?: OptimizationResult["competitorGapAnalysis"];
  }
): OptimizationResult {
  const specMatrixHtml = buildFactSpecMatrix(product);
  const schemaJson = buildFactSchema(product, parts);
  const { total, breakdown } = computeGeoScore({
    seoTitle: parts.seoTitle,
    seoDescription: parts.seoDescription,
    specMatrixHtml,
    faqCount: parts.faqList.length,
    schemaJson,
  });
  return {
    seoTitle: parts.seoTitle,
    seoDescription: parts.seoDescription,
    specMatrixHtml,
    faqList: parts.faqList,
    schemaJson,
    imageAltText: buildFactAltText(product),
    aiScore: total,
    scoreBreakdown: breakdown,
    summarySnippet: parts.summarySnippet,
    competitorGapAnalysis: parts.competitorGapAnalysis,
  };
}

function factSummary(product: ProductInput): string {
  const title = cleanCommercialProductTitle(product.title, product.vendor);
  const bits = [`${title}${product.vendor ? ` is sold by ${product.vendor}` : ""}${product.productType ? ` (${product.productType})` : ""}.`];
  const price = priceText(product);
  if (price) bits.push(`Price: ${price}.`);
  const avail = availabilityOf(product);
  if (avail) bits.push(avail === "InStock" ? "Currently in stock." : "Currently out of stock.");
  return bits.join(" ");
}

async function generateWithGemini(
  apiKey: string,
  product: ProductInput
): Promise<OptimizationResult> {
  const own = merchantOwnText(product.descriptionHtml);
  const opts = realOptions(product);
  const facts = [
    `Title: ${product.title}`,
    product.vendor ? `Brand/vendor: ${product.vendor}` : "",
    product.productType ? `Product type: ${product.productType}` : "",
    publicTags(product).length ? `Tags: ${publicTags(product).join(", ")}` : "",
    priceText(product) ? `Price: ${priceText(product)}` : "",
    opts.length ? `Options: ${opts.map((o) => `${o.name} = ${o.values.join(", ")}`).join("; ")}` : "",
    availabilityOf(product) ? `Availability: ${availabilityOf(product)}` : "",
    own ? `Merchant description: ${own.slice(0, 2000)}` : "Merchant description: (none)",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `
You write SEO metadata and buyer FAQs for a Shopify product.

HARD RULES (violating any rule makes the output unusable):
- Use ONLY the facts listed under PRODUCT FACTS. Do not add materials, dimensions, features, warranty, guarantees, shipping, delivery times, returns, refunds, ratings, reviews, awards or comparisons unless they appear word-for-word in the facts.
- If a fact is unknown, leave it out. Never guess.
- No hype words ("best", "#1", "premium", "luxury") unless they appear in the facts.

PRODUCT FACTS:
${facts}
${
  product.competitorData
    ? `\nCompetitor page keywords (for keyword ideas only, never as product facts): ${(product.competitorData.extractedKeywords || []).join(", ")}`
    : ""
}

Return strict JSON with keys:
"seoTitle": string, 30-60 characters, product name plus one real attribute.
"seoDescription": string, 110-155 characters, factual summary from the facts.
"faqList": array of 2-4 {"question","answer"} pairs a shopper might ask, answered only from the facts.
"summarySnippet": one or two factual sentences.
${product.competitorData ? `"competitorGapAnalysis": {"identifiedKeywords": string[], "missingEntities": string[], "closingStrategy": string} based only on the competitor keywords vs the product facts.` : ""}
`;

  let parsed: any;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    parsed = JSON.parse(response.text || "{}");
  } catch {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(prompt);
    parsed = JSON.parse(result.response.text());
  }
  return sanitizeOptimizationResult(parsed, product);
}

function sanitizeOptimizationResult(data: any, product: ProductInput): OptimizationResult {
  const okText = (v: any, min: number, max: number) =>
    typeof v === "string" &&
    v.trim().length >= min &&
    !/raw|unoptimized|placeholder/i.test(v) &&
    !containsUnverifiedClaim(v, product)
      ? smartTrimAltText(stripDiagnosticWords(v.trim()), max)
      : null;

  const seoTitle = okText(data?.seoTitle, 10, 60) || factSeoTitle(product);
  const seoDescription = okText(data?.seoDescription, 50, 155) || factSeoDescription(product);

  let faqList: Array<{ question: string; answer: string }> = [];
  if (Array.isArray(data?.faqList)) {
    faqList = data.faqList
      .filter(
        (f: any) =>
          f &&
          typeof f.question === "string" &&
          typeof f.answer === "string" &&
          f.question.trim() &&
          f.answer.trim() &&
          !containsUnverifiedClaim(`${f.question} ${f.answer}`, product)
      )
      .slice(0, 4)
      .map((f: any) => ({
        question: stripDiagnosticWords(f.question.trim()),
        answer: stripDiagnosticWords(f.answer.trim()),
      }));
  }
  if (faqList.length < 2) faqList = buildFactFaqs(product);

  const summarySnippet = okText(data?.summarySnippet, 20, 400) || factSummary(product);

  return assembleResult(product, {
    seoTitle,
    seoDescription,
    faqList,
    summarySnippet,
    competitorGapAnalysis:
      product.competitorData && data?.competitorGapAnalysis && typeof data.competitorGapAnalysis === "object"
        ? data.competitorGapAnalysis
        : undefined,
  });
}

export function generateSmartFallbackOptimization(product: ProductInput): OptimizationResult {
  let competitorGapAnalysis: OptimizationResult["competitorGapAnalysis"];
  if (product.competitorData) {
    const own = `${product.title} ${merchantOwnText(product.descriptionHtml)} ${(product.tags || []).join(" ")}`.toLowerCase();
    const kws = (product.competitorData.extractedKeywords || []).filter(Boolean);
    const missing = kws.filter((k) => !own.includes(k.toLowerCase()));
    competitorGapAnalysis = {
      identifiedKeywords: kws.slice(0, 8),
      missingEntities: missing.slice(0, 6),
      closingStrategy: missing.length
        ? "These competitor keywords do not appear in your product text. Add the ones that truly apply to your description."
        : "Your product text already covers the competitor's main keywords.",
    };
  }
  return assembleResult(product, {
    seoTitle: factSeoTitle(product),
    seoDescription: factSeoDescription(product),
    faqList: buildFactFaqs(product),
    summarySnippet: factSummary(product),
    competitorGapAnalysis,
  });
}

/** Maps a catalog product into optimizer input using only real fields. */
export function productInputFromItem(
  item: {
    title: string;
    descriptionHtml?: string;
    vendor?: string;
    productType?: string;
    tags?: string[];
    handle?: string;
    totalInventory?: number;
    priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
    maxPrice?: string;
    options?: Array<{ name: string; values: string[] }>;
    variants?: Array<{ title?: string; sku?: string | null; price?: string; availableForSale?: boolean }>;
    featuredImage?: { url?: string; altText?: string };
    imageAltText?: string;
  },
  shopDomain: string,
  extra: Partial<ProductInput> = {}
): ProductInput {
  return {
    title: item.title,
    descriptionHtml: item.descriptionHtml || "",
    vendor: item.vendor || "",
    productType: item.productType || "",
    tags: item.tags || [],
    price: item.priceRange?.minVariantPrice?.amount,
    currency: item.priceRange?.minVariantPrice?.currencyCode,
    maxPrice: item.maxPrice,
    options: item.options,
    variants: item.variants,
    totalInventory: item.totalInventory,
    handle: item.handle,
    imageUrl: item.featuredImage?.url,
    currentAltText: item.imageAltText || item.featuredImage?.altText || "",
    shopDomain,
    ...extra,
  };
}
