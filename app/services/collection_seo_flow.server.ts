import { randomUUID } from "node:crypto";
import {
  COLLECTION_LOCK_TTL_MS,
  COLLECTION_SEO_LIMITATIONS,
  CollectionFacts,
  CollectionFieldSet,
  CollectionSeoError,
  CollectionSuggestion,
  PREVIEW_TTL_MS,
  assertCollectionId,
  authorizeCollectionAccess,
  chooseGroundedSuggestion,
  fieldsMatch,
  fieldsOf,
  groundingProblems,
  suggestCollectionSeo,
  toCollectionSummary,
} from "./collection_seo";

export interface CollectionPreviewRecord {
  id: string;
  shop: string;
  collectionId: string;
  collectionTitle: string;
  sourceUpdatedAt: string;
  currentSeoTitle: string;
  currentSeoDescription: string;
  currentDescriptionHtml: string;
  suggestedSeoTitle: string;
  suggestedSeoDescription: string;
  suggestedDescriptionHtml: string;
  source: "rules" | "gemini";
  productsUsed: number;
  productsTruncated: boolean;
  status: "PENDING" | "APPLIED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

export interface CollectionRevisionRecord {
  id: string;
  shop: string;
  collectionId: string;
  originalSeoTitle: string;
  originalSeoDescription: string;
  originalDescriptionHtml: string;
  appliedSeoTitle: string;
  appliedSeoDescription: string;
  appliedDescriptionHtml: string;
  undone: boolean;
  createdAt: string;
}

export interface CollectionAdminPort {
  list(cursor?: string | null): Promise<{
    collections: CollectionFacts[];
    hasNextPage: boolean;
    endCursor: string | null;
  }>;
  fetch(id: string): Promise<CollectionFacts | null>;
  updateSeo(id: string, fields: CollectionFieldSet): Promise<CollectionFieldSet & { updatedAt: string }>;
}

export interface CollectionSeoStore {
  savePreview(record: CollectionPreviewRecord): Promise<void>;
  getPreview(shop: string, id: string): Promise<CollectionPreviewRecord | null>;
  markPreview(shop: string, id: string, status: "APPLIED" | "EXPIRED"): Promise<boolean>;
  saveRevision(record: CollectionRevisionRecord): Promise<void>;
  latestOpenRevision(shop: string, collectionId: string): Promise<CollectionRevisionRecord | null>;
  markRevisionUndone(shop: string, id: string): Promise<boolean>;
  openCollectionIds(shop: string): Promise<string[]>;
  claim(shop: string, collectionId: string, owner: string, ttlMs: number): Promise<boolean>;
  release(shop: string, collectionId: string, owner: string): Promise<void>;
}

export interface CollectionRequestArgs {
  session: { shop?: string | null; scope?: string | null } | null;
  intent: string;
  collectionId?: string;
  previewId?: string;
  approved?: boolean;
  cursor?: string | null;
  port: CollectionAdminPort;
  store: CollectionSeoStore;
  gate?: (shop: string) => Promise<{ allowed: boolean; reason?: string }>;
  generate?: (collection: CollectionFacts) => Promise<CollectionSuggestion> | CollectionSuggestion;
  now?: () => Date;
}

export interface CollectionResponse {
  status: number;
  body: Record<string, unknown>;
}

export function createMemoryCollectionSeoStore(): CollectionSeoStore {
  const previews = new Map<string, CollectionPreviewRecord>();
  const revisions: CollectionRevisionRecord[] = [];
  const locks = new Map<string, { owner: string; expiresAt: number }>();
  const keyOf = (shop: string, collectionId: string) => `${shop}::${collectionId}`;

  return {
    async savePreview(record) {
      previews.set(record.id, { ...record });
    },
    async getPreview(shop, id) {
      const row = previews.get(id);
      if (!row || row.shop !== shop) return null;
      return { ...row };
    },
    async markPreview(shop, id, status) {
      const row = previews.get(id);
      if (!row || row.shop !== shop || row.status !== "PENDING") return false;
      row.status = status;
      return true;
    },
    async saveRevision(record) {
      revisions.push({ ...record });
    },
    async latestOpenRevision(shop, collectionId) {
      const open = revisions.filter((row) => row.shop === shop && row.collectionId === collectionId && !row.undone);
      return open.length ? { ...open[open.length - 1] } : null;
    },
    async markRevisionUndone(shop, id) {
      const row = revisions.find((item) => item.id === id && item.shop === shop && !item.undone);
      if (!row) return false;
      row.undone = true;
      return true;
    },
    async openCollectionIds(shop) {
      return [...new Set(revisions.filter((row) => row.shop === shop && !row.undone).map((row) => row.collectionId))];
    },
    async claim(shop, collectionId, owner, ttlMs) {
      const key = keyOf(shop, collectionId);
      const current = locks.get(key);
      const now = Date.now();
      if (current && current.expiresAt > now) return false;
      locks.set(key, { owner, expiresAt: now + ttlMs });
      return true;
    },
    async release(shop, collectionId, owner) {
      const key = keyOf(shop, collectionId);
      const current = locks.get(key);
      if (current?.owner === owner) locks.delete(key);
    },
  };
}

async function requirePlan(
  gate: CollectionRequestArgs["gate"],
  shop: string
): Promise<void> {
  if (!gate) return;
  const decision = await gate(shop);
  if (!decision.allowed) {
    throw new CollectionSeoError(
      decision.reason || "Collection SEO is not available on the current plan.",
      402,
      "PLAN_LIMIT"
    );
  }
}

function snapshotPreview(shop: string, collection: CollectionFacts, suggestion: CollectionSuggestion, now: Date): CollectionPreviewRecord {
  const current = fieldsOf(collection);
  return {
    id: randomUUID(),
    shop,
    collectionId: collection.id,
    collectionTitle: collection.title,
    sourceUpdatedAt: collection.updatedAt || "",
    currentSeoTitle: current.seoTitle,
    currentSeoDescription: current.seoDescription,
    currentDescriptionHtml: current.descriptionHtml,
    suggestedSeoTitle: suggestion.seoTitle,
    suggestedSeoDescription: suggestion.seoDescription,
    suggestedDescriptionHtml: suggestion.descriptionHtml,
    source: suggestion.source,
    productsUsed: suggestion.productsUsed,
    productsTruncated: suggestion.productsTruncated,
    status: "PENDING",
    expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
  };
}

async function buildSuggestion(
  collection: CollectionFacts,
  generate: CollectionRequestArgs["generate"]
): Promise<CollectionSuggestion> {
  const rules = suggestCollectionSeo(collection);
  if (!generate) return rules;
  try {
    const candidate = await generate(collection);
    const problems = groundingProblems(candidate, collection);
    if (problems.length === 0) return candidate;
  } catch (error) {
    console.warn("[collection-seo] suggestion generator discarded:", error instanceof Error ? error.message : "unknown");
  }
  const fallbackProblems = groundingProblems(rules, collection);
  if (fallbackProblems.length) {
    throw new CollectionSeoError(
      "Could not build a suggestion that stays within this collection's text and products.",
      422,
      "UNGROUNDED"
    );
  }
  return rules;
}

async function withCollectionLock<T>(
  store: CollectionSeoStore,
  shop: string,
  collectionId: string,
  work: () => Promise<T>
): Promise<T> {
  const owner = randomUUID();
  const claimed = await store.claim(shop, collectionId, owner, COLLECTION_LOCK_TTL_MS);
  if (!claimed) {
    throw new CollectionSeoError(
      "Another collection update is already running for this collection. Nothing new was written.",
      409,
      "IN_PROGRESS"
    );
  }
  try {
    return await work();
  } finally {
    await store.release(shop, collectionId, owner);
  }
}

async function readCollections(args: CollectionRequestArgs, shop: string): Promise<CollectionResponse> {
  const page = await args.port.list(args.cursor);
  let undoableIds: string[] = [];
  let storageWarning: string | null = null;
  try {
    undoableIds = await args.store.openCollectionIds(shop);
  } catch (error) {
    console.warn("[collection-seo] undo list unavailable:", error instanceof Error ? error.message : "unknown");
    storageWarning = "Undo history could not be loaded. Collection text was not changed.";
  }
  return {
    status: 200,
    body: {
      success: true,
      shop,
      sampleData: false,
      wroteToShopify: false,
      collections: page.collections.map(toCollectionSummary),
      hasNextPage: page.hasNextPage,
      endCursor: page.endCursor,
      undoableIds,
      storageWarning,
      limitations: COLLECTION_SEO_LIMITATIONS,
    },
  };
}

async function previewCollection(args: CollectionRequestArgs, shop: string): Promise<CollectionResponse> {
  const collectionId = assertCollectionId(args.collectionId);
  await requirePlan(args.gate, shop);
  const live = await args.port.fetch(collectionId);
  if (!live) {
    throw new CollectionSeoError(
      "That collection was not found for this shop. The app's Admin API version is 2024-10, which cannot read collections that exist only in Shopify's newer collection model. Nothing was written.",
      404,
      "NOT_FOUND"
    );
  }
  const suggestion = await buildSuggestion(live, args.generate ?? ((collection) => chooseGroundedSuggestion(collection, null)));
  const problems = groundingProblems(suggestion, live);
  if (problems.length) {
    throw new CollectionSeoError(problems[0], 422, "UNGROUNDED");
  }
  const now = args.now?.() ?? new Date();
  const preview = snapshotPreview(shop, live, suggestion, now);
  await args.store.savePreview(preview);
  return {
    status: 200,
    body: {
      success: true,
      shop,
      wroteToShopify: false,
      sampleData: false,
      preview,
      current: fieldsOf(live),
      suggestion,
      limitations: COLLECTION_SEO_LIMITATIONS,
    },
  };
}

async function applyPreview(args: CollectionRequestArgs, shop: string): Promise<CollectionResponse> {
  if (args.approved !== true) {
    throw new CollectionSeoError(
      "Approve this collection before RankPilot writes anything.",
      400,
      "APPROVAL_REQUIRED"
    );
  }
  if (!args.previewId) {
    throw new CollectionSeoError("A suggestion id is required.", 400, "PREVIEW_REQUIRED");
  }
  await requirePlan(args.gate, shop);
  const existing = await args.store.getPreview(shop, args.previewId);
  if (!existing) {
    throw new CollectionSeoError("That suggestion was not found for this store.", 404, "PREVIEW_NOT_FOUND");
  }
  const collectionId = assertCollectionId(existing.collectionId);

  return withCollectionLock(args.store, shop, collectionId, async () => {
    const fresh = await args.store.getPreview(shop, args.previewId || "");
    if (!fresh || fresh.status !== "PENDING") {
      throw new CollectionSeoError("This suggestion was already used. Generate a new one. Nothing new was written.", 409, "PREVIEW_USED");
    }
    const now = args.now?.() ?? new Date();
    if (Date.parse(fresh.expiresAt) <= now.getTime()) {
      await args.store.markPreview(shop, fresh.id, "EXPIRED");
      throw new CollectionSeoError("This suggestion expired. Generate a new one. Nothing was written.", 409, "PREVIEW_EXPIRED");
    }

    const live = await args.port.fetch(collectionId);
    if (!live) {
      throw new CollectionSeoError("That collection was not found. Nothing was written.", 404, "NOT_FOUND");
    }
    if (
      !fieldsMatch(live, {
        seoTitle: fresh.currentSeoTitle,
        seoDescription: fresh.currentSeoDescription,
        descriptionHtml: fresh.currentDescriptionHtml,
      })
    ) {
      throw new CollectionSeoError(
        "This collection changed after the suggestion was created. Nothing was written. Generate a new suggestion.",
        409,
        "STALE"
      );
    }

    const suggested: CollectionFieldSet = {
      seoTitle: fresh.suggestedSeoTitle,
      seoDescription: fresh.suggestedSeoDescription,
      descriptionHtml: fresh.suggestedDescriptionHtml,
    };
    const original = fieldsOf(live);
    let wrote = false;
    let revisionId: string | null = null;
    try {
      const updated = await args.port.updateSeo(collectionId, suggested);
      wrote = true;
      const revision: CollectionRevisionRecord = {
        id: randomUUID(),
        shop,
        collectionId,
        originalSeoTitle: original.seoTitle,
        originalSeoDescription: original.seoDescription,
        originalDescriptionHtml: original.descriptionHtml,
        appliedSeoTitle: updated.seoTitle,
        appliedSeoDescription: updated.seoDescription,
        appliedDescriptionHtml: updated.descriptionHtml,
        undone: false,
        createdAt: now.toISOString(),
      };
      revisionId = revision.id;
      await args.store.saveRevision(revision);
      const marked = await args.store.markPreview(shop, fresh.id, "APPLIED");
      if (!marked) throw new Error("PREVIEW_STATE");
      return {
        status: 200,
        body: {
          success: true,
          shop,
          wroteToShopify: true,
          sampleData: false,
          collectionId,
          revisionId: revision.id,
          applied: {
            seoTitle: updated.seoTitle,
            seoDescription: updated.seoDescription,
            descriptionHtml: updated.descriptionHtml,
          },
        },
      };
    } catch (error) {
      if (!wrote) throw error;
      try {
        await args.port.updateSeo(collectionId, original);
        if (revisionId) await args.store.markRevisionUndone(shop, revisionId);
      } catch (restoreError) {
        console.error("[collection-seo] restore after failed record:", restoreError);
        throw new CollectionSeoError(
          "Shopify was updated, and RankPilot could not save the undo record or restore the original text. Check this collection in Shopify admin before trying again.",
          500,
          "UNDO_SNAPSHOT_FAILED",
          true
        );
      }
      throw new CollectionSeoError(
        "The update could not be recorded, so the original collection text was written back.",
        500,
        "ROLLED_BACK"
      );
    }
  });
}

async function undoCollection(args: CollectionRequestArgs, shop: string): Promise<CollectionResponse> {
  const collectionId = assertCollectionId(args.collectionId);
  return withCollectionLock(args.store, shop, collectionId, async () => {
    const revision = await args.store.latestOpenRevision(shop, collectionId);
    if (!revision) {
      throw new CollectionSeoError("No collection update is available to undo.", 404, "NOTHING_TO_UNDO");
    }
    const live = await args.port.fetch(collectionId);
    if (!live) {
      throw new CollectionSeoError("That collection was not found. Nothing was written.", 404, "NOT_FOUND");
    }
    if (
      !fieldsMatch(live, {
        seoTitle: revision.appliedSeoTitle,
        seoDescription: revision.appliedSeoDescription,
        descriptionHtml: revision.appliedDescriptionHtml,
      })
    ) {
      throw new CollectionSeoError(
        "This collection no longer matches the approved text, so it was not changed. The saved original is still stored.",
        409,
        "UNDO_CONFLICT"
      );
    }
    await args.port.updateSeo(collectionId, {
      seoTitle: revision.originalSeoTitle,
      seoDescription: revision.originalSeoDescription,
      descriptionHtml: revision.originalDescriptionHtml,
    });
    const marked = await args.store.markRevisionUndone(shop, revision.id);
    if (!marked) {
      throw new CollectionSeoError(
        "The original text was written back to Shopify, but the undo record did not update. Refresh before trying again.",
        500,
        "UNDO_RECORD_FAILED",
        true
      );
    }
    return {
      status: 200,
      body: {
        success: true,
        shop,
        wroteToShopify: true,
        sampleData: false,
        collectionId,
        restored: {
          seoTitle: revision.originalSeoTitle,
          seoDescription: revision.originalSeoDescription,
          descriptionHtml: revision.originalDescriptionHtml,
        },
      },
    };
  });
}

export async function handleCollectionsRequest(args: CollectionRequestArgs): Promise<CollectionResponse> {
  try {
    const intent = args.intent;
    const accessIntent = intent === "apply" || intent === "undo" || intent === "preview" || intent === "read" ? intent : "read";
    const { shop } = authorizeCollectionAccess(args.session, accessIntent);
    if (intent === "read") return await readCollections(args, shop);
    if (intent === "preview") return await previewCollection(args, shop);
    if (intent === "apply") return await applyPreview(args, shop);
    if (intent === "undo") return await undoCollection(args, shop);
    throw new CollectionSeoError("Unknown collection action.", 400, "BAD_INTENT");
  } catch (error) {
    if (error instanceof CollectionSeoError) {
      return {
        status: error.status,
        body: {
          success: false,
          error: error.message,
          code: error.code,
          wroteToShopify: error.wroteToShopify,
        },
      };
    }
    console.error("[collection-seo]", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Collection SEO failed before the result could be confirmed.",
        code: "INTERNAL",
        wroteToShopify: false,
      },
    };
  }
}
