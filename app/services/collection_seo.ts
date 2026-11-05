/**
 * Pure collection SEO helpers.
 * Suggestions are assembled from the collection and its member products.
 * They do not add reviews, guarantees, shipping policies, or ranking claims.
 */

export const COLLECTION_PAGE_SIZE = 50;
export const MEMBER_PRODUCT_LIMIT = 25;
export const PREVIEW_TTL_MS = 30 * 60 * 1000;
export const COLLECTION_LOCK_TTL_MS = 60 * 1000;
export const SEO_TITLE_LIMIT = 70;
export const SEO_DESCRIPTION_LIMIT = 320;

export const COLLECTION_SEO_BLOCK_START = "<!-- rankpilot-collection-seo-start -->";
export const COLLECTION_SEO_BLOCK_END = "<!-- rankpilot-collection-seo-end -->";

export const COLLECTION_SEO_LIMITATIONS = [
  "Suggestions use this collection's existing text and up to 25 member products returned by Shopify. Products past that page are not used.",
  "RankPilot does not add specifications, reviews, guarantees, shipping policies, or ranking claims that are not already in that text.",
  "Nothing is written until you approve that one collection. Approval updates the SEO title, meta description, and collection description.",
  "The collection title, handle, and which products belong to the collection stay unchanged.",
  "Undo restores the previous SEO title, meta description, and description when they still match what RankPilot wrote. If those fields changed later, RankPilot does not overwrite them.",
  "There is no guarantee of search rankings, traffic, or citations.",
];

export const COLLECTION_LIST_QUERY = `#graphql
query CollectionSeoList($first: Int!, $after: String) {
  collections(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      title
      handle
      updatedAt
      productsCount {
        count
      }
      seo {
        title
        description
      }
    }
  }
}
`;

export const COLLECTION_LIST_QUERY_WITHOUT_COUNT = `#graphql
query CollectionSeoListWithoutCount($first: Int!, $after: String) {
  collections(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      title
      handle
      updatedAt
      seo {
        title
        description
      }
    }
  }
}
`;

export const COLLECTION_DETAIL_QUERY = `#graphql
query CollectionSeoDetail($id: ID!, $productLimit: Int!) {
  collection(id: $id) {
    id
    title
    handle
    updatedAt
    descriptionHtml
    seo {
      title
      description
    }
    products(first: $productLimit) {
      pageInfo {
        hasNextPage
      }
      nodes {
        id
        title
        handle
        vendor
        productType
        tags
        status
        descriptionHtml
      }
    }
  }
}
`;

export const COLLECTION_UPDATE_MUTATION = `#graphql
mutation CollectionSeoUpdate($input: CollectionInput!) {
  collectionUpdate(input: $input) {
    collection {
      id
      descriptionHtml
      updatedAt
      seo {
        title
        description
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const GLUE_WORDS = new Set(
  "a an and as at by collection collections first for from in include included includes is it its of on or product products returned returning showing such the this these to with were was be".split(
    " "
  )
);

const BANNED_CLAIM =
  /\b(?:best(?:[ -]selling)?|top[ -]rated|#1|no\.?\s*1|number one|guaranteed?|warrant(?:y|ies)|lifetime|free shipping|ships? free|reviews?|ratings?|\d+[ -]star|five[ -]star|award(?:[ -]winning)?|outrank|rankings?|rank higher|boost(?:s|ed|ing)? (?:your )?rank)\b/gi;

export class CollectionSeoError extends Error {
  status: number;
  code: string;
  wroteToShopify: boolean;

  constructor(message: string, status: number, code: string, wroteToShopify = false) {
    super(message);
    this.name = "CollectionSeoError";
    this.status = status;
    this.code = code;
    this.wroteToShopify = wroteToShopify;
  }
}

export interface CollectionProductFact {
  id: string;
  title: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: string;
  descriptionText?: string;
}

export interface CollectionFacts {
  id: string;
  title: string;
  handle?: string;
  descriptionHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt?: string;
  productCount?: number | null;
  productsTruncated?: boolean;
  products?: CollectionProductFact[];
}

export interface CollectionSummary {
  id: string;
  title: string;
  handle: string;
  seoTitle: string;
  seoDescription: string;
  productCount: number | null;
  updatedAt: string;
}

export interface CollectionSuggestion {
  seoTitle: string;
  seoDescription: string;
  descriptionHtml: string;
  productsUsed: number;
  productsTruncated: boolean;
  source: "rules" | "gemini";
}

export interface CollectionFieldSet {
  seoTitle: string;
  seoDescription: string;
  descriptionHtml: string;
}

export interface CollectionIntentInput {
  intent: string;
  collectionId?: string;
  previewId?: string;
  approved: boolean;
}

export const SAMPLE_COLLECTION: CollectionFacts = {
  id: "gid://shopify/Collection/sample-summer-hats",
  title: "Sample Summer Hats",
  handle: "sample-summer-hats",
  descriptionHtml: "<p>Sample collection of straw and cotton hats for sunny days.</p>",
  seoTitle: "",
  seoDescription: "",
  updatedAt: "2026-01-01T00:00:00.000Z",
  productCount: 2,
  productsTruncated: false,
  products: [
    {
      id: "gid://shopify/Product/sample-straw-hat",
      title: "Sample Straw Hat",
      vendor: "Sample Co",
      productType: "Hat",
      tags: ["straw"],
      status: "ACTIVE",
      descriptionText: "Woven straw hat.",
    },
    {
      id: "gid://shopify/Product/sample-cotton-cap",
      title: "Sample Cotton Cap",
      vendor: "Sample Co",
      productType: "Hat",
      tags: ["cotton"],
      status: "ACTIVE",
      descriptionText: "Cotton cap.",
    },
  ],
};

export function parseScopes(scope: string | null | undefined): Set<string> {
  return new Set(
    (scope || "")
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean)
  );
}

export function authorizeCollectionAccess(
  session: { shop?: string | null; scope?: string | null } | null | undefined,
  intent: "read" | "preview" | "apply" | "undo"
): { shop: string } {
  const shop = session?.shop?.trim() || "";
  if (!shop || !/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw new CollectionSeoError(
      "A Shopify admin session is required. RankPilot uses the shop on that session.",
      401,
      "UNAUTHENTICATED"
    );
  }

  const scopes = parseScopes(session?.scope);
  const canRead = scopes.has("read_products") || scopes.has("write_products");
  const canWrite = scopes.has("write_products");
  if (!canRead && !canWrite) {
    throw new CollectionSeoError(
      "This session has no read_products or write_products scope recorded. Reopen RankPilot from the Shopify admin. No new scopes were requested.",
      403,
      "MISSING_SCOPE"
    );
  }
  if ((intent === "apply" || intent === "undo") && !canWrite) {
    throw new CollectionSeoError(
      "write_products is required to update a collection. This app already requests that scope, and no new scope was added. Reopen RankPilot from the Shopify admin if the session is missing it.",
      403,
      "MISSING_WRITE_PRODUCTS"
    );
  }
  return { shop };
}

export function assertCollectionId(id: string | undefined): string {
  const value = (id || "").trim();
  if (!/^gid:\/\/shopify\/Collection\/[A-Za-z0-9_-]+$/.test(value)) {
    throw new CollectionSeoError("A valid collection id is required.", 400, "INVALID_ID");
  }
  return value;
}

/** Reads only the fields the collection API accepts. A shop in the body is ignored. */
export function readCollectionIntent(body: unknown): CollectionIntentInput {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    intent: typeof record.intent === "string" ? record.intent : "",
    collectionId: typeof record.collectionId === "string" ? record.collectionId : undefined,
    previewId: typeof record.previewId === "string" ? record.previewId : undefined,
    approved: record.approved === true,
  };
}

export function plainTextFromHtml(html: string | null | undefined): string {
  return (html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function collectionSeoUpdateInput(
  id: string,
  fields: CollectionFieldSet
): { id: string; descriptionHtml: string; seo: { title: string; description: string } } {
  return {
    id,
    descriptionHtml: fields.descriptionHtml,
    seo: {
      title: fields.seoTitle,
      description: fields.seoDescription,
    },
  };
}

export function toCollectionSummary(collection: CollectionFacts): CollectionSummary {
  return {
    id: collection.id,
    title: collection.title,
    handle: collection.handle || "",
    seoTitle: collection.seoTitle || "",
    seoDescription: collection.seoDescription || "",
    productCount: typeof collection.productCount === "number" ? collection.productCount : null,
    updatedAt: collection.updatedAt || "",
  };
}

export function includedProducts(collection: CollectionFacts): CollectionProductFact[] {
  return (collection.products || [])
    .filter((product) => {
      const title = product?.title?.trim();
      if (!title) return false;
      const status = (product.status || "").toUpperCase();
      return status !== "DRAFT" && status !== "ARCHIVED";
    })
    .slice(0, MEMBER_PRODUCT_LIMIT);
}

export function fieldsOf(collection: {
  seoTitle?: string | null;
  seoDescription?: string | null;
  descriptionHtml?: string | null;
}): CollectionFieldSet {
  return {
    seoTitle: collection.seoTitle || "",
    seoDescription: collection.seoDescription || "",
    descriptionHtml: collection.descriptionHtml || "",
  };
}

function normalizeHtml(html: string): string {
  return html.replace(/\s+/g, " ").trim();
}

export function fieldsMatch(
  left: { seoTitle?: string | null; seoDescription?: string | null; descriptionHtml?: string | null },
  right: { seoTitle?: string | null; seoDescription?: string | null; descriptionHtml?: string | null }
): boolean {
  const a = fieldsOf(left);
  const b = fieldsOf(right);
  return (
    a.seoTitle.trim() === b.seoTitle.trim() &&
    a.seoDescription.trim() === b.seoDescription.trim() &&
    normalizeHtml(a.descriptionHtml) === normalizeHtml(b.descriptionHtml)
  );
}

function trimAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 20 ? slice.slice(0, lastSpace) : slice).replace(/[|,;:\s]+$/g, "").trim();
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function baseDescriptionHtml(html: string | null | undefined): string {
  const raw = html || "";
  const start = raw.indexOf(COLLECTION_SEO_BLOCK_START);
  const end = raw.indexOf(COLLECTION_SEO_BLOCK_END);
  if (start === -1 || end === -1 || end < start) return raw.trim();
  return `${raw.slice(0, start)}${raw.slice(end + COLLECTION_SEO_BLOCK_END.length)}`.trim();
}

function productSentence(title: string, products: CollectionProductFact[], truncated: boolean): string {
  const names = products.map((product) => product.title.trim()).filter(Boolean);
  if (!names.length) return trimAtWord(title, SEO_DESCRIPTION_LIMIT) || title.slice(0, SEO_DESCRIPTION_LIMIT);
  const shown = names.slice(0, 3);
  const phrase =
    truncated || names.length > shown.length
      ? `${title} includes products such as ${joinList(shown)}.`
      : `${title} includes ${joinList(shown)}.`;
  if (phrase.length <= SEO_DESCRIPTION_LIMIT) return phrase;
  const one = `${title} includes ${shown[0]}.`;
  if (one.length <= SEO_DESCRIPTION_LIMIT) return one;
  if (title.length <= SEO_DESCRIPTION_LIMIT) return title;
  return trimAtWord(title, SEO_DESCRIPTION_LIMIT);
}

export function suggestCollectionSeo(collection: CollectionFacts): CollectionSuggestion {
  const products = includedProducts(collection);
  const truncated = Boolean(collection.productsTruncated) || (collection.products || []).length > products.length;
  const title = collection.title.replace(/\s+/g, " ").trim() || "Collection";
  const types = unique(products.map((product) => product.productType || "")).filter(
    (type) => !title.toLowerCase().includes(type.toLowerCase())
  );
  let seoTitle = title;
  if (types.length) {
    const combined = `${title} | ${types.slice(0, 2).join(", ")}`;
    if (combined.length <= SEO_TITLE_LIMIT) seoTitle = combined;
  }
  if (seoTitle.length > SEO_TITLE_LIMIT) seoTitle = trimAtWord(seoTitle, SEO_TITLE_LIMIT);

  const seoDescription = productSentence(title, products, truncated);
  const base = baseDescriptionHtml(collection.descriptionHtml);
  const heading = truncated ? "Products returned with this collection" : "Products in this collection";
  const items = products
    .map((product) => {
      const bits = [escapeHtml(product.title.trim())];
      if (product.vendor?.trim()) bits.push(escapeHtml(product.vendor.trim()));
      const type = product.productType?.trim() || "";
      if (type && !product.title.toLowerCase().includes(type.toLowerCase())) bits.push(escapeHtml(type));
      return `<li>${bits.join(", ")}</li>`;
    })
    .join("");
  const intro = base ? "" : `<p>${escapeHtml(title)}</p>`;
  const list = products.length ? `<p>${escapeHtml(heading)}</p><ul>${items}</ul>` : "";
  const block = `${COLLECTION_SEO_BLOCK_START}\n${intro}${list}\n${COLLECTION_SEO_BLOCK_END}`;
  const descriptionHtml = base ? `${base}\n${block}` : block;

  return {
    seoTitle,
    seoDescription,
    descriptionHtml,
    productsUsed: products.length,
    productsTruncated: truncated,
    source: "rules",
  };
}

function corpusText(collection: CollectionFacts, products: CollectionProductFact[]): string {
  return [
    collection.title,
    collection.handle?.replace(/-/g, " "),
    plainTextFromHtml(collection.descriptionHtml),
    ...products.flatMap((product) => [
      product.title,
      product.vendor,
      product.productType,
      product.handle?.replace(/-/g, " "),
      ...(product.tags || []),
      product.descriptionText,
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

function contentWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function unknownWords(text: string, corpus: string): string[] {
  const known = new Set(contentWords(corpus));
  const unknown: string[] = [];
  for (const word of contentWords(text)) {
    if (/^\d+$/.test(word) || GLUE_WORDS.has(word) || known.has(word)) continue;
    unknown.push(word);
  }
  return unknown;
}

function bannedOutside(text: string, allowedSource: string): string[] {
  const matches = text.match(new RegExp(BANNED_CLAIM.source, "gi")) || [];
  const allowed = allowedSource.toLowerCase();
  return matches.filter((match) => !allowed.includes(match.toLowerCase()));
}

function numbersOutside(text: string, corpus: string): string[] {
  const corpusNumbers = new Set(corpus.match(/\d+(?:\.\d+)?/g) || []);
  return (text.match(/\d+(?:\.\d+)?/g) || []).filter((value) => !corpusNumbers.has(value));
}

function appendedPlain(suggestionHtml: string): string {
  const start = suggestionHtml.indexOf(COLLECTION_SEO_BLOCK_START);
  const end = suggestionHtml.indexOf(COLLECTION_SEO_BLOCK_END);
  if (start === -1 || end === -1 || end < start) return plainTextFromHtml(suggestionHtml);
  return plainTextFromHtml(suggestionHtml.slice(start + COLLECTION_SEO_BLOCK_START.length, end));
}

export function groundingProblems(suggestion: CollectionSuggestion, collection: CollectionFacts): string[] {
  const products = includedProducts(collection);
  const corpus = corpusText(collection, products);
  const identity = [collection.title, ...products.flatMap((product) => [product.title, product.vendor, product.productType])]
    .filter(Boolean)
    .join(" ");
  const problems: string[] = [];
  const seoTitle = suggestion.seoTitle || "";
  const seoDescription = suggestion.seoDescription || "";

  if (!seoTitle.trim()) problems.push("SEO title is empty.");
  if (seoTitle.length > SEO_TITLE_LIMIT) problems.push("SEO title is longer than 70 characters.");
  if (!seoDescription.trim()) problems.push("Meta description is empty.");
  if (seoDescription.length > SEO_DESCRIPTION_LIMIT) problems.push("Meta description is longer than 320 characters.");
  if ((suggestion.descriptionHtml || "").length > 60000) problems.push("Collection description is too long.");

  for (const [label, text, allowed] of [
    ["SEO title", seoTitle, collection.title || ""],
    ["Meta description", seoDescription, identity],
  ] as const) {
    const banned = bannedOutside(text, allowed);
    if (banned.length) problems.push(`${label} adds ${banned.join(", ")}.`);
    const unknown = unknownWords(text, corpus);
    if (unknown.length) problems.push(`${label} uses words that are not in the collection facts: ${unknown.join(", ")}.`);
    const numbers = numbersOutside(text, corpus);
    if (numbers.length) problems.push(`${label} uses numbers that are not in the collection facts: ${numbers.join(", ")}.`);
  }

  const appended = appendedPlain(suggestion.descriptionHtml || "");
  const appendedBanned = bannedOutside(appended, identity);
  if (appendedBanned.length) problems.push(`Collection description adds ${appendedBanned.join(", ")}.`);
  const appendedUnknown = unknownWords(appended, corpus);
  if (appendedUnknown.length) {
    problems.push(`Collection description uses words that are not in the collection facts: ${appendedUnknown.join(", ")}.`);
  }
  const appendedNumbers = numbersOutside(appended, corpus);
  if (appendedNumbers.length) {
    problems.push(`Collection description uses numbers that are not in the collection facts: ${appendedNumbers.join(", ")}.`);
  }

  return problems;
}

export function chooseGroundedSuggestion(
  collection: CollectionFacts,
  candidate: { seoTitle?: string; seoDescription?: string } | null
): CollectionSuggestion {
  const rules = suggestCollectionSeo(collection);
  if (!candidate) return rules;
  const seoTitle = typeof candidate.seoTitle === "string" ? candidate.seoTitle.replace(/\s+/g, " ").trim() : "";
  const seoDescription =
    typeof candidate.seoDescription === "string" ? candidate.seoDescription.replace(/\s+/g, " ").trim() : "";
  if (!seoTitle || !seoDescription) return rules;
  const merged: CollectionSuggestion = { ...rules, seoTitle, seoDescription, source: "gemini" };
  if (groundingProblems(merged, collection).length > 0) return rules;
  return merged;
}
