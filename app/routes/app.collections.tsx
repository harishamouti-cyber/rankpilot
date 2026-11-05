import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useRevalidator } from "@remix-run/react";
import { useState } from "react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  IndexTable,
  InlineStack,
  Layout,
  Modal,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { CollectionSeoModal } from "~/components/CollectionSeoModal";
import {
  COLLECTION_SEO_LIMITATIONS,
  SAMPLE_COLLECTION,
  type CollectionFacts,
  type CollectionSuggestion,
  type CollectionSummary,
  suggestCollectionSeo,
  toCollectionSummary,
} from "~/services/collection_seo";
import {
  createShopifyCollectionPort,
  handleAuthenticatedCollectionRequest,
} from "~/services/collection_seo.server";

interface FieldSet {
  seoTitle: string;
  seoDescription: string;
  descriptionHtml: string;
}

interface CollectionPageData {
  success?: boolean;
  shop?: string;
  sampleData?: boolean;
  wroteToShopify?: boolean;
  collections?: CollectionSummary[];
  sampleFacts?: CollectionFacts[];
  hasNextPage?: boolean;
  endCursor?: string | null;
  undoableIds?: string[];
  storageWarning?: string | null;
  limitations?: string[];
  error?: string;
  loadStatus?: number;
}

interface PreviewState {
  collectionId: string;
  collectionTitle: string;
  previewId: string | null;
  current: FieldSet;
  suggestion: CollectionSuggestion;
}

async function appFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (typeof window !== "undefined") {
    const bridge = (window as { shopify?: { idToken?: () => Promise<string> } }).shopify;
    if (bridge && typeof bridge.idToken === "function") {
      try {
        const token = await bridge.idToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } catch {
        // The embedded session cookie still goes with the request.
      }
    }
  }
  return fetch(url, { ...options, headers });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop") || "demo.myshopify.com";
  const isPreview = shopParam.includes("demo") || url.searchParams.get("preview") === "true";

  try {
    const { session, admin } = await authenticate.admin(request);
    const result = await handleAuthenticatedCollectionRequest({
      session,
      shop: session.shop,
      intent: "read",
      cursor: url.searchParams.get("after"),
      port: createShopifyCollectionPort(admin),
    });
    return json<CollectionPageData>({
      ...(result.body as CollectionPageData),
      sampleFacts: [],
      loadStatus: result.status,
    });
  } catch (error) {
    if (error instanceof Response && !isPreview) throw error;
    if (!isPreview) throw error;
    return json<CollectionPageData>({
      success: true,
      shop: shopParam,
      sampleData: true,
      wroteToShopify: false,
      collections: [toCollectionSummary(SAMPLE_COLLECTION)],
      sampleFacts: [SAMPLE_COLLECTION],
      hasNextPage: false,
      endCursor: null,
      undoableIds: [] as string[],
      storageWarning: null,
      limitations: COLLECTION_SEO_LIMITATIONS,
      loadStatus: 200,
    });
  }
};

export default function CollectionSeoPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const shop = typeof data.shop === "string" ? data.shop : "demo.myshopify.com";
  const sampleData = Boolean(data.sampleData);
  const collections = (data.collections || []) as CollectionSummary[];
  const sampleFacts = (data.sampleFacts || []) as CollectionFacts[];
  const undoableIds = new Set((data.undoableIds || []) as string[]);
  const limitations = (data.limitations || COLLECTION_SEO_LIMITATIONS) as string[];
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(typeof data.error === "string" ? data.error : null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [undoTarget, setUndoTarget] = useState<CollectionSummary | null>(null);

  const visible = collections.filter((collection) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return collection.title.toLowerCase().includes(needle) || collection.handle.toLowerCase().includes(needle);
  });

  const shopQuery = `?shop=${encodeURIComponent(shop)}`;

  async function suggest(collection: CollectionSummary) {
    setPageError(null);
    setModalError(null);
    setModalSuccess(null);
    if (sampleData) {
      const facts = sampleFacts.find((item) => item.id === collection.id) || {
        ...collection,
        descriptionHtml: "",
        products: [],
      };
      const suggestion = suggestCollectionSeo(facts);
      setPreview({
        collectionId: collection.id,
        collectionTitle: collection.title,
        previewId: null,
        current: {
          seoTitle: facts.seoTitle || "",
          seoDescription: facts.seoDescription || "",
          descriptionHtml: facts.descriptionHtml || "",
        },
        suggestion,
      });
      return;
    }

    setBusyId(collection.id);
    try {
      const response = await appFetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "preview", collectionId: collection.id }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || "Could not build a suggestion.");
      }
      setPreview({
        collectionId: collection.id,
        collectionTitle: collection.title,
        previewId: body.preview.id,
        current: body.current,
        suggestion: body.suggestion,
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not build a suggestion.");
    } finally {
      setBusyId(null);
    }
  }

  async function approve() {
    if (!preview?.previewId) return;
    setBusyId(preview.collectionId);
    setModalError(null);
    try {
      const response = await appFetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "apply", previewId: preview.previewId, approved: true }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || "Shopify was not updated.");
      }
      setModalSuccess("This collection was updated. You can undo it from the list while the text still matches.");
      revalidator.revalidate();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Shopify was not updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function undo(collection: CollectionSummary) {
    setBusyId(collection.id);
    setPageError(null);
    setPageNotice(null);
    try {
      const response = await appFetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "undo", collectionId: collection.id }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || "The collection was not changed.");
      }
      setPageNotice(`Restored the previous SEO fields for ${collection.title}.`);
      setUndoTarget(null);
      revalidator.revalidate();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "The collection was not changed.");
      setUndoTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  const nextHref =
    data.hasNextPage && data.endCursor
      ? `/app/collections${shopQuery}&after=${encodeURIComponent(String(data.endCursor))}`
      : null;

  return (
    <Page
      title="Collection SEO"
      subtitle="Suggest SEO from the collection and its products, then approve one collection at a time."
      backAction={{ content: "Products", url: `/app${shopQuery}` }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {sampleData ? (
              <Banner tone="warning" title="Sample data">
                <p>These collections are not from a Shopify store. Suggestions stay in this preview and nothing is written to Shopify.</p>
              </Banner>
            ) : null}
            {typeof data.storageWarning === "string" && data.storageWarning ? (
              <Banner tone="warning" title="Undo history unavailable">
                <p>{data.storageWarning}</p>
              </Banner>
            ) : null}
            {pageError ? (
              <Banner tone="critical" title="Collection SEO">
                <p>{pageError}</p>
              </Banner>
            ) : null}
            {pageNotice ? (
              <Banner tone="success" onDismiss={() => setPageNotice(null)}>
                <p>{pageNotice}</p>
              </Banner>
            ) : null}
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm">
                  What this can and cannot do
                </Text>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {limitations.map((item) => (
                    <li key={item}>
                      <Text as="span" variant="bodyMd">
                        {item}
                      </Text>
                    </li>
                  ))}
                </ul>
              </BlockStack>
            </Card>
            <Card padding="0">
              <BlockStack gap="0">
                <div style={{ padding: 16 }}>
                  <TextField
                    label="Filter collections"
                    value={query}
                    onChange={setQuery}
                    autoComplete="off"
                    placeholder="Title or handle"
                  />
                </div>
                {visible.length === 0 ? (
                  <div style={{ padding: 16 }}>
                    <Text as="p" variant="bodyMd">
                      {collections.length === 0
                        ? "Shopify did not return any collections for this shop."
                        : "No collection on this page matches that filter."}
                    </Text>
                  </div>
                ) : (
                  <IndexTable
                    itemCount={visible.length}
                    selectable={false}
                    headings={[
                      { title: "Collection" },
                      { title: "Handle" },
                      { title: "SEO title" },
                      { title: "Products" },
                      { title: "Actions" },
                    ]}
                  >
                    {visible.map((collection, index) => (
                      <IndexTable.Row id={collection.id} key={collection.id} position={index}>
                        <IndexTable.Cell>
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {collection.title}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>{collection.handle || "—"}</IndexTable.Cell>
                        <IndexTable.Cell>{collection.seoTitle || "Empty"}</IndexTable.Cell>
                        <IndexTable.Cell>
                          {collection.productCount === null ? "—" : String(collection.productCount)}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <InlineStack gap="200">
                            <Button
                              size="slim"
                              loading={busyId === collection.id && !undoTarget}
                              onClick={() => suggest(collection)}
                            >
                              Suggest SEO
                            </Button>
                            {undoableIds.has(collection.id) ? (
                              <Button size="slim" tone="critical" onClick={() => setUndoTarget(collection)}>
                                Undo
                              </Button>
                            ) : null}
                          </InlineStack>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                )}
              </BlockStack>
            </Card>
            {nextHref ? (
              <InlineStack align="end">
                <Button onClick={() => navigate(nextHref)}>Next 50 collections</Button>
              </InlineStack>
            ) : null}
            {sampleData ? (
              <Badge tone="warning">Sample data, not a live store</Badge>
            ) : null}
          </BlockStack>
        </Layout.Section>
      </Layout>
      {preview ? (
        <CollectionSeoModal
          open
          collectionTitle={preview.collectionTitle}
          sampleData={sampleData || !preview.previewId}
          current={preview.current}
          suggestion={preview.suggestion}
          approving={busyId === preview.collectionId}
          error={modalError}
          success={modalSuccess}
          onClose={() => {
            if (busyId) return;
            setPreview(null);
            setModalError(null);
            setModalSuccess(null);
          }}
          onApprove={approve}
        />
      ) : null}
      <Modal
        open={Boolean(undoTarget)}
        onClose={() => setUndoTarget(null)}
        title={undoTarget ? `Undo ${undoTarget.title}` : "Undo"}
        primaryAction={{
          content: "Restore original fields",
          destructive: true,
          loading: Boolean(undoTarget && busyId === undoTarget.id),
          onAction: () => {
            if (undoTarget) void undo(undoTarget);
          },
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setUndoTarget(null) }]}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            This writes back the SEO title, meta description, and collection description saved before the last approved update. It runs only if those fields still match what RankPilot wrote.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
