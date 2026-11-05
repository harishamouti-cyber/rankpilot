import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "~/db.server";
import { checkSubscriptionGating } from "~/services/billing.server";
import { getGeminiApiKey } from "~/services/gemini.server";
import { executeGraphQLWithThrottling } from "~/services/shopify.server";
import {
  COLLECTION_DETAIL_QUERY,
  COLLECTION_LIST_QUERY,
  COLLECTION_LIST_QUERY_WITHOUT_COUNT,
  COLLECTION_PAGE_SIZE,
  COLLECTION_UPDATE_MUTATION,
  CollectionFacts,
  CollectionProductFact,
  CollectionSeoError,
  CollectionSuggestion,
  MEMBER_PRODUCT_LIMIT,
  chooseGroundedSuggestion,
  collectionSeoUpdateInput,
  includedProducts,
  plainTextFromHtml,
} from "~/services/collection_seo";
import {
  CollectionAdminPort,
  CollectionPreviewRecord,
  CollectionRevisionRecord,
  CollectionSeoStore,
  handleCollectionsRequest,
  type CollectionRequestArgs,
} from "~/services/collection_seo_flow.server";

function graphQLMessages(result: { data?: unknown; errors?: Array<{ message?: string }> } | null | undefined): string[] {
  return (result?.errors || []).map((error) => error?.message || "").filter(Boolean);
}

function statusForShopifyMessage(message: string): number {
  if (/throttl|rate limit|429/i.test(message)) return 429;
  if (/access denied|required access|permission|not authorized|starter plan|retail plan/i.test(message)) return 403;
  return 422;
}

function shopifyError(message: string): CollectionSeoError {
  return new CollectionSeoError(message, statusForShopifyMessage(message), "SHOPIFY");
}

function mapProduct(node: any): CollectionProductFact {
  const description = plainTextFromHtml(node?.descriptionHtml);
  const descriptionText = description.length > 500 ? description.slice(0, description.lastIndexOf(" ", 500) || 500).trim() : description;
  return {
    id: String(node?.id || ""),
    title: String(node?.title || ""),
    handle: String(node?.handle || ""),
    vendor: String(node?.vendor || ""),
    productType: String(node?.productType || ""),
    tags: Array.isArray(node?.tags) ? node.tags.map(String) : [],
    status: String(node?.status || ""),
    descriptionText,
  };
}

function mapCollection(node: any, withProducts: boolean): CollectionFacts {
  const products = withProducts ? (node?.products?.nodes || []).map(mapProduct) : [];
  const count = node?.productsCount?.count;
  return {
    id: String(node?.id || ""),
    title: String(node?.title || ""),
    handle: String(node?.handle || ""),
    descriptionHtml: String(node?.descriptionHtml || ""),
    seoTitle: String(node?.seo?.title || ""),
    seoDescription: String(node?.seo?.description || ""),
    updatedAt: String(node?.updatedAt || ""),
    productCount: typeof count === "number" ? count : null,
    productsTruncated: Boolean(node?.products?.pageInfo?.hasNextPage),
    products,
  };
}

async function runQuery(admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ json(): Promise<any> }> }, query: string, variables: Record<string, unknown>) {
  try {
    return await executeGraphQLWithThrottling(admin, query, variables);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify request failed";
    throw shopifyError(message);
  }
}

export function createShopifyCollectionPort(admin: { graphql: Function }): CollectionAdminPort {
  return {
    async list(cursor) {
      const variables = { first: COLLECTION_PAGE_SIZE, after: cursor || null };
      let result = await runQuery(admin as any, COLLECTION_LIST_QUERY, variables);
      let messages = graphQLMessages(result);
      if (messages.some((message) => /productsCount/i.test(message))) {
        result = await runQuery(admin as any, COLLECTION_LIST_QUERY_WITHOUT_COUNT, variables);
        messages = graphQLMessages(result);
      }
      if (messages.length) throw shopifyError(messages[0]);
      const connection = result?.data?.collections;
      const nodes = connection?.nodes || [];
      return {
        collections: nodes.map((node: any) => mapCollection(node, false)),
        hasNextPage: Boolean(connection?.pageInfo?.hasNextPage),
        endCursor: connection?.pageInfo?.endCursor || null,
      };
    },
    async fetch(id) {
      const result = await runQuery(admin as any, COLLECTION_DETAIL_QUERY, {
        id,
        productLimit: MEMBER_PRODUCT_LIMIT,
      });
      const messages = graphQLMessages(result);
      if (messages.length) throw shopifyError(messages[0]);
      const node = result?.data?.collection;
      if (!node?.id) return null;
      return mapCollection(node, true);
    },
    async updateSeo(id, fields) {
      const input = collectionSeoUpdateInput(id, fields);
      const result = await runQuery(admin as any, COLLECTION_UPDATE_MUTATION, { input });
      const messages = graphQLMessages(result);
      if (messages.length) throw shopifyError(messages[0]);
      const payload = result?.data?.collectionUpdate;
      const userErrors = payload?.userErrors || [];
      if (userErrors.length) {
        throw shopifyError(userErrors.map((error: { message?: string }) => error.message || "Shopify rejected the collection update.").join(" "));
      }
      const collection = payload?.collection;
      if (!collection?.id) {
        throw new CollectionSeoError("Shopify did not return the updated collection. Check it in Shopify admin before trying again.", 502, "SHOPIFY_EMPTY");
      }
      return {
        seoTitle: String(collection.seo?.title || ""),
        seoDescription: String(collection.seo?.description || ""),
        descriptionHtml: String(collection.descriptionHtml || ""),
        updatedAt: String(collection.updatedAt || ""),
      };
    },
  };
}

function asPreview(row: any): CollectionPreviewRecord {
  return {
    id: row.id,
    shop: row.shop,
    collectionId: row.collectionId,
    collectionTitle: row.collectionTitle,
    sourceUpdatedAt: row.sourceUpdatedAt || "",
    currentSeoTitle: row.currentSeoTitle || "",
    currentSeoDescription: row.currentSeoDescription || "",
    currentDescriptionHtml: row.currentDescriptionHtml || "",
    suggestedSeoTitle: row.suggestedSeoTitle,
    suggestedSeoDescription: row.suggestedSeoDescription,
    suggestedDescriptionHtml: row.suggestedDescriptionHtml,
    source: row.source === "gemini" ? "gemini" : "rules",
    productsUsed: row.productsUsed || 0,
    productsTruncated: Boolean(row.productsTruncated),
    status: row.status,
    expiresAt: new Date(row.expiresAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function asRevision(row: any): CollectionRevisionRecord {
  return {
    id: row.id,
    shop: row.shop,
    collectionId: row.collectionId,
    originalSeoTitle: row.originalSeoTitle || "",
    originalSeoDescription: row.originalSeoDescription || "",
    originalDescriptionHtml: row.originalDescriptionHtml || "",
    appliedSeoTitle: row.appliedSeoTitle,
    appliedSeoDescription: row.appliedSeoDescription,
    appliedDescriptionHtml: row.appliedDescriptionHtml,
    undone: Boolean(row.undone),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export function createPrismaCollectionSeoStore(): CollectionSeoStore {
  return {
    async savePreview(record) {
      await db.collectionSeoPreview.create({
        data: {
          ...record,
          expiresAt: new Date(record.expiresAt),
          createdAt: new Date(record.createdAt),
        },
      });
    },
    async getPreview(shop, id) {
      const row = await db.collectionSeoPreview.findFirst({ where: { id, shop } });
      return row ? asPreview(row) : null;
    },
    async markPreview(shop, id, status) {
      const result = await db.collectionSeoPreview.updateMany({
        where: { id, shop, status: "PENDING" },
        data: { status },
      });
      return result.count === 1;
    },
    async saveRevision(record) {
      await db.collectionSeoRevision.create({
        data: {
          ...record,
          createdAt: new Date(record.createdAt),
        },
      });
    },
    async latestOpenRevision(shop, collectionId) {
      const row = await db.collectionSeoRevision.findFirst({
        where: { shop, collectionId, undone: false },
        orderBy: { createdAt: "desc" },
      });
      return row ? asRevision(row) : null;
    },
    async markRevisionUndone(shop, id) {
      const result = await db.collectionSeoRevision.updateMany({
        where: { id, shop, undone: false },
        data: { undone: true },
      });
      return result.count === 1;
    },
    async openCollectionIds(shop) {
      const rows = await db.collectionSeoRevision.findMany({
        where: { shop, undone: false },
        select: { collectionId: true },
      });
      return [...new Set(rows.map((row) => row.collectionId))];
    },
    async claim(shop, collectionId, owner, ttlMs) {
      const now = new Date();
      await db.collectionSeoLock.deleteMany({
        where: { shop, collectionId, expiresAt: { lt: now } },
      });
      try {
        await db.collectionSeoLock.create({
          data: {
            shop,
            collectionId,
            owner,
            expiresAt: new Date(now.getTime() + ttlMs),
          },
        });
        return true;
      } catch {
        return false;
      }
    },
    async release(shop, collectionId, owner) {
      await db.collectionSeoLock.deleteMany({ where: { shop, collectionId, owner } });
    },
  };
}

async function generateForShop(collection: CollectionFacts, shop: string): Promise<CollectionSuggestion> {
  const rules = chooseGroundedSuggestion(collection, null);
  let apiKey: string | null = null;
  try {
    apiKey = await getGeminiApiKey(shop);
  } catch (error) {
    console.warn("[collection-seo] API key lookup skipped:", error instanceof Error ? error.message : "unknown");
    return rules;
  }
  if (!apiKey) return rules;

  const products = includedProducts(collection).map((product) => ({
    title: product.title,
    vendor: product.vendor || "",
    productType: product.productType || "",
    tags: product.tags || [],
    description: product.descriptionText || "",
  }));
  const prompt = `Write a Shopify collection SEO title and meta description.

Use ONLY the facts below. Do not add materials, sizes, reviews, ratings, guarantees, warranties, shipping, delivery, returns, awards, or ranking claims unless those exact words are in the facts.
Do not claim the collection will rank, be cited, or outsell anything.
If a fact is missing, leave it out.

FACTS:
${JSON.stringify({
  title: collection.title,
  handle: collection.handle || "",
  description: plainTextFromHtml(collection.descriptionHtml).slice(0, 1500),
  products,
})}

Return JSON with "seoTitle" (max 70 characters) and "seoDescription" (max 320 characters).`;

  try {
    let parsed: { seoTitle?: string; seoDescription?: string } | null = null;
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
    return chooseGroundedSuggestion(collection, parsed);
  } catch (error) {
    console.warn("[collection-seo] Gemini wording discarded:", error instanceof Error ? error.message : "unknown");
    return rules;
  }
}

export async function handleAuthenticatedCollectionRequest(
  args: Omit<CollectionRequestArgs, "store" | "gate" | "generate"> & { shop: string }
): Promise<Awaited<ReturnType<typeof handleCollectionsRequest>>> {
  return handleCollectionsRequest({
    ...args,
    store: createPrismaCollectionSeoStore(),
    gate: async (shop) => checkSubscriptionGating({ shop, feature: "COLLECTION_SEO" }),
    generate: (collection) => generateForShop(collection, args.shop),
  });
}
