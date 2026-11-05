import assert from "node:assert/strict";
import test from "node:test";
import {
  COLLECTION_DETAIL_QUERY,
  COLLECTION_UPDATE_MUTATION,
  SAMPLE_COLLECTION,
  type CollectionFacts,
  type CollectionFieldSet,
  authorizeCollectionAccess,
  chooseGroundedSuggestion,
  collectionSeoUpdateInput,
  groundingProblems,
  readCollectionIntent,
  suggestCollectionSeo,
} from "../app/services/collection_seo";
import {
  createMemoryCollectionSeoStore,
  handleCollectionsRequest,
  type CollectionAdminPort,
} from "../app/services/collection_seo_flow.server";

const SHOP = "good-store.myshopify.com";
const OTHER_SHOP = "other-store.myshopify.com";
const WRITE_SESSION = { shop: SHOP, scope: "read_products,write_products" };
const READ_SESSION = { shop: SHOP, scope: "read_products" };

function collection(overrides: Partial<CollectionFacts> = {}): CollectionFacts {
  return {
    id: "gid://shopify/Collection/100",
    title: "Summer Hats",
    handle: "summer-hats",
    descriptionHtml: "<p>Straw and cotton hats for sunny days.</p>",
    seoTitle: "Old title",
    seoDescription: "Old meta",
    updatedAt: "2026-01-01T00:00:00.000Z",
    productCount: 3,
    productsTruncated: false,
    products: [
      {
        id: "gid://shopify/Product/1",
        title: "Straw Hat",
        vendor: "Sol",
        productType: "Hat",
        tags: ["straw"],
        status: "ACTIVE",
        descriptionText: "Woven straw hat.",
      },
      {
        id: "gid://shopify/Product/2",
        title: "Cotton Cap",
        vendor: "Sol",
        productType: "Hat",
        tags: ["cotton"],
        status: "ACTIVE",
        descriptionText: "Cotton cap.",
      },
      {
        id: "gid://shopify/Product/3",
        title: "Carbon Snowboard",
        vendor: "Hidden",
        productType: "Snowboard",
        status: "DRAFT",
        descriptionText: "Unreleased race board with a lifetime warranty.",
      },
    ],
    ...overrides,
  };
}

function fakePort(initial: CollectionFacts): CollectionAdminPort & {
  updates: CollectionFieldSet[];
  fetches: number;
  lists: number;
  replace: (next: CollectionFacts) => void;
} {
  let current = initial;
  const updates: CollectionFieldSet[] = [];
  const port = {
    updates,
    fetches: 0,
    lists: 0,
    async list() {
      port.lists += 1;
      return { collections: [current], hasNextPage: false, endCursor: null };
    },
    async fetch(id: string) {
      port.fetches += 1;
      if (id !== current.id) return null;
      return current;
    },
    async updateSeo(_id: string, fields: CollectionFieldSet) {
      updates.push(fields);
      current = {
        ...current,
        seoTitle: fields.seoTitle,
        seoDescription: fields.seoDescription,
        descriptionHtml: fields.descriptionHtml,
        updatedAt: "2026-02-01T00:00:00.000Z",
      };
      return {
        seoTitle: fields.seoTitle,
        seoDescription: fields.seoDescription,
        descriptionHtml: fields.descriptionHtml,
        updatedAt: current.updatedAt || "",
      };
    },
    replace(next: CollectionFacts) {
      current = next;
    },
  };
  return port;
}

test("authentication rejects a missing session before any Shopify read", async () => {
  const port = fakePort(collection());
  const result = await handleCollectionsRequest({
    session: null,
    intent: "read",
    port,
    store: createMemoryCollectionSeoStore(),
  });
  assert.equal(result.status, 401);
  assert.equal(result.body.code, "UNAUTHENTICATED");
  assert.equal(port.lists, 0);
  assert.equal(port.updates.length, 0);
});

test("permissions follow the session shop and granted scopes", async () => {
  const port = fakePort(collection());
  const store = createMemoryCollectionSeoStore();
  const readOnly = await handleCollectionsRequest({
    session: READ_SESSION,
    intent: "apply",
    approved: true,
    previewId: "preview",
    port,
    store,
  });
  assert.equal(readOnly.status, 403);
  assert.equal(readOnly.body.code, "MISSING_WRITE_PRODUCTS");
  assert.equal(port.updates.length, 0);

  const noScope = await handleCollectionsRequest({
    session: { shop: SHOP, scope: "" },
    intent: "read",
    port,
    store,
  });
  assert.equal(noScope.status, 403);
  assert.equal(port.lists, 0);

  const impliedRead = await handleCollectionsRequest({
    session: { shop: SHOP, scope: "write_products" },
    intent: "read",
    port,
    store,
  });
  assert.equal(impliedRead.status, 200);
  assert.equal(impliedRead.body.shop, SHOP);

  assert.throws(() => authorizeCollectionAccess({ shop: "evil.example.com", scope: "write_products" }, "read"));
  const parsed = readCollectionIntent({
    intent: "apply",
    shop: "evil.myshopify.com",
    collectionId: collection().id,
    approved: true,
    suggestedSeoTitle: "Invented ranking claim",
  });
  assert.equal(parsed.approved, true);
  assert.equal("shop" in parsed, false);
  assert.equal(parsed.collectionId, collection().id);
});

test("suggestions stay inside collection and member-product facts", () => {
  const facts = collection({
    descriptionHtml: "<p>Free shipping on straw and cotton hats for sunny days.</p>",
  });
  const suggestion = suggestCollectionSeo(facts);
  assert.deepEqual(groundingProblems(suggestion, facts), []);
  assert.match(suggestion.seoTitle, /Summer Hats/);
  assert.match(suggestion.seoDescription, /Straw Hat/);
  assert.match(suggestion.seoDescription, /Cotton Cap/);
  assert.match(suggestion.descriptionHtml, /Free shipping on straw and cotton hats/);
  assert.match(suggestion.descriptionHtml, /Straw Hat/);
  assert.doesNotMatch(`${suggestion.seoTitle} ${suggestion.seoDescription}`, /free shipping|warranty|review|ranking|best|#1|snowboard/i);
  assert.doesNotMatch(suggestion.descriptionHtml, /Carbon Snowboard|lifetime warranty/i);

  const invented = chooseGroundedSuggestion(facts, {
    seoTitle: "Best Summer Hats",
    seoDescription: "Lifetime warranty, free shipping, 5-star reviews, and ranked #1.",
  });
  assert.equal(invented.source, "rules");
  assert.doesNotMatch(`${invented.seoTitle} ${invented.seoDescription}`, /best|warranty|review|ranked|#1/i);

  const numbered = chooseGroundedSuggestion(facts, {
    seoTitle: "Summer Hats",
    seoDescription: "Summer Hats includes 999 products.",
  });
  assert.equal(numbered.source, "rules");
  assert.doesNotMatch(numbered.seoDescription, /999/);

  const draftOnly = suggestCollectionSeo(collection({ products: facts.products?.slice(2), productsTruncated: false }));
  assert.equal(draftOnly.productsUsed, 0);
  assert.doesNotMatch(`${draftOnly.seoTitle} ${draftOnly.seoDescription} ${draftOnly.descriptionHtml}`, /Carbon|Snowboard|warranty/i);

  const input = collectionSeoUpdateInput(facts.id, {
    seoTitle: suggestion.seoTitle,
    seoDescription: suggestion.seoDescription,
    descriptionHtml: suggestion.descriptionHtml,
  });
  assert.deepEqual(Object.keys(input).sort(), ["descriptionHtml", "id", "seo"]);
  assert.equal("title" in input, false);
  assert.doesNotMatch(COLLECTION_UPDATE_MUTATION, /publishablePublish|ruleSet|sourcesToCreate/);
  assert.match(COLLECTION_UPDATE_MUTATION, /collectionUpdate\(input:/);
  assert.match(COLLECTION_DETAIL_QUERY, /products\(first: \$productLimit\)/);
  assert.equal(suggestCollectionSeo(SAMPLE_COLLECTION).source, "rules");
});

test("preview does not write, and apply requires approval", async () => {
  const port = fakePort(collection());
  const store = createMemoryCollectionSeoStore();
  const preview = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "preview",
    collectionId: collection().id,
    port,
    store,
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.wroteToShopify, false);
  assert.equal(port.updates.length, 0);
  const previewId = (preview.body.preview as { id: string }).id;

  const unapproved = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId,
    approved: false,
    port,
    store,
  });
  assert.equal(unapproved.status, 400);
  assert.equal(unapproved.body.code, "APPROVAL_REQUIRED");
  assert.equal(port.updates.length, 0);

  const denied = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId,
    approved: true,
    port,
    store,
    gate: async () => ({ allowed: false, reason: "Plan limit reached." }),
  });
  assert.equal(denied.status, 402);
  assert.equal(port.updates.length, 0);
});

test("apply writes the stored suggestion and undo restores the original fields", async () => {
  const port = fakePort(collection());
  const store = createMemoryCollectionSeoStore();
  const preview = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "preview",
    collectionId: collection().id,
    port,
    store,
  });
  const previewId = (preview.body.preview as { id: string }).id;
  const suggestion = preview.body.suggestion as { seoTitle: string; seoDescription: string };

  const otherShop = await handleCollectionsRequest({
    session: { shop: OTHER_SHOP, scope: "write_products" },
    intent: "apply",
    previewId,
    approved: true,
    port,
    store,
  });
  assert.equal(otherShop.status, 404);
  assert.equal(port.updates.length, 0);

  const applied = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId,
    approved: true,
    port,
    store,
  });
  assert.equal(applied.status, 200);
  assert.equal(applied.body.wroteToShopify, true);
  assert.equal(port.updates.length, 1);
  assert.equal(port.updates[0].seoTitle, suggestion.seoTitle);
  assert.equal(port.updates[0].seoDescription, suggestion.seoDescription);
  assert.equal("title" in port.updates[0], false);

  const repeat = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId,
    approved: true,
    port,
    store,
  });
  assert.equal(repeat.status, 409);
  assert.equal(port.updates.length, 1);

  const undone = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "undo",
    collectionId: collection().id,
    port,
    store,
  });
  assert.equal(undone.status, 200);
  assert.equal(port.updates.length, 2);
  assert.equal(port.updates[1].seoTitle, "Old title");
  assert.equal(port.updates[1].seoDescription, "Old meta");
  assert.match(port.updates[1].descriptionHtml, /Straw and cotton hats/);

  const secondUndo = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "undo",
    collectionId: collection().id,
    port,
    store,
  });
  assert.equal(secondUndo.status, 404);
  assert.equal(port.updates.length, 2);
});

test("apply and undo do not overwrite a collection that changed", async () => {
  const port = fakePort(collection());
  const store = createMemoryCollectionSeoStore();
  const preview = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "preview",
    collectionId: collection().id,
    port,
    store,
  });
  const previewId = (preview.body.preview as { id: string }).id;
  port.replace(collection({ descriptionHtml: "<p>Merchant edited this after the suggestion.</p>" }));

  const stale = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId,
    approved: true,
    port,
    store,
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "STALE");
  assert.equal(port.updates.length, 0);

  port.replace(collection());
  const applied = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "preview",
    collectionId: collection().id,
    port,
    store,
  });
  await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId: (applied.body.preview as { id: string }).id,
    approved: true,
    port,
    store,
  });
  assert.equal(port.updates.length, 1);
  port.replace({
    ...collection(),
    seoTitle: port.updates[0].seoTitle,
    seoDescription: "Changed in Shopify after approval",
    descriptionHtml: port.updates[0].descriptionHtml,
  });
  const conflict = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "undo",
    collectionId: collection().id,
    port,
    store,
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, "UNDO_CONFLICT");
  assert.equal(port.updates.length, 1);
});

test("a failed undo record writes the original fields back", async () => {
  const port = fakePort(collection());
  const store = createMemoryCollectionSeoStore();
  const preview = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "preview",
    collectionId: collection().id,
    port,
    store,
  });
  store.saveRevision = async () => {
    throw new Error("database unavailable");
  };
  const result = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId: (preview.body.preview as { id: string }).id,
    approved: true,
    port,
    store,
  });
  assert.equal(result.status, 500);
  assert.equal(result.body.code, "ROLLED_BACK");
  assert.equal(result.body.wroteToShopify, false);
  assert.equal(port.updates.length, 2);
  assert.equal(port.updates[1].seoTitle, "Old title");
  assert.match(port.updates[1].descriptionHtml, /Straw and cotton hats/);
});

test("an expired suggestion and a second concurrent apply do not write twice", async () => {
  const port = fakePort(collection());
  const store = createMemoryCollectionSeoStore();
  const createdAt = new Date("2026-03-01T00:00:00.000Z");
  const preview = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "preview",
    collectionId: collection().id,
    port,
    store,
    now: () => createdAt,
  });
  const expired = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId: (preview.body.preview as { id: string }).id,
    approved: true,
    port,
    store,
    now: () => new Date(createdAt.getTime() + 31 * 60 * 1000),
  });
  assert.equal(expired.status, 409);
  assert.equal(expired.body.code, "PREVIEW_EXPIRED");
  assert.equal(port.updates.length, 0);

  const fresh = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "preview",
    collectionId: collection().id,
    port,
    store,
    now: () => createdAt,
  });
  const previewId = (fresh.body.preview as { id: string }).id;
  let releaseFetch: () => void = () => {
    throw new Error("fetch gate was not ready");
  };
  const gate = new Promise<void>((resolve) => {
    releaseFetch = resolve;
  });
  const originalFetch = port.fetch.bind(port);
  let fetches = 0;
  port.fetch = async (id: string) => {
    fetches += 1;
    if (fetches === 1) await gate;
    return originalFetch(id);
  };
  const first = handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId,
    approved: true,
    port,
    store,
    now: () => createdAt,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const second = await handleCollectionsRequest({
    session: WRITE_SESSION,
    intent: "apply",
    previewId,
    approved: true,
    port,
    store,
    now: () => createdAt,
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "IN_PROGRESS");
  releaseFetch();
  const firstResult = await first;
  assert.equal(firstResult.status, 200);
  assert.equal(port.updates.length, 1);
});
