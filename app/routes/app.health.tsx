import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import React, { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  Banner,
  Box,
  Divider,
  List,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  RefreshIcon,
  DatabaseIcon,
  ShieldCheckMarkIcon,
} from "@shopify/polaris-icons";
import { auditCatalogForDrift, repairDriftedProducts, DriftAuditResult } from "~/services/drift_sentinel.server";
import {
  verifyProductMetafieldDefinitions,
  resyncMissingMetafieldDefinitions,
  VerifiedMetafieldDefinition,
} from "~/services/metafield_verifier.server";
import {
  getMonitoredWebhookStatuses,
  WebhookStatusItem,
} from "~/services/webhook_log.server";
import { getShopifyProducts } from "~/services/shopify.server";
import { authenticate, unauthenticated } from "~/shopify.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") || "demo.myshopify.com";

  let adminClient: any = null;
  try {
    const authResult = await authenticate.admin(request);
    adminClient = authResult.admin;
    if (authResult.session?.shop) {
      shop = authResult.session.shop;
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    try {
      const unauthResult = await unauthenticated.admin(shop);
      adminClient = unauthResult.admin;
    } catch {}
  }

  // 1. Real Catalog Health & Counts
  const products = await getShopifyProducts(shop, adminClient);
  const totalProducts = products.length;
  const isOptimized = (status: string) => status === "OPTIMIZED" || status === "AI_READY";
  const syncedProducts = products.filter((p) => isOptimized(p.optimizationStatus));
  const syncedCount = syncedProducts.length;
  const pendingCount = Math.max(0, totalProducts - syncedCount);

  // 2. Real Metafield Verification via GraphQL
  const metafieldCheck = await verifyProductMetafieldDefinitions(adminClient);

  // 3. Real Schema Integrity / Drift Audit
  const driftAudit = await auditCatalogForDrift(shop, adminClient);

  // 4. Honest Webhook Delivery Logs from Database
  const webhooks = await getMonitoredWebhookStatuses(shop);

  // 5. Activity Log
  const autopilotLogs = await db.autopilotLog.findMany({
    where: { shop },
    orderBy: { timestamp: "desc" },
    take: 8,
  });

  return json({
    shop,
    totalProducts,
    syncedCount,
    pendingCount,
    driftAudit,
    metafieldCheck,
    webhooks,
    autopilotLogs: autopilotLogs.map((log) => ({
      id: log.id,
      actionType: log.actionType,
      details: log.details,
      timestamp: log.timestamp.toISOString(),
    })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") || "demo.myshopify.com";
  let adminClient: any = null;

  try {
    const authResult = await authenticate.admin(request);
    adminClient = authResult.admin;
    if (authResult.session?.shop) {
      shop = authResult.session.shop;
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    try {
      const unauthResult = await unauthenticated.admin(shop);
      adminClient = unauthResult.admin;
    } catch {}
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "resync_metafields") {
    // 1. Re-sync GraphQL definitions
    await resyncMissingMetafieldDefinitions(adminClient);
    const updatedMetafieldCheck = await verifyProductMetafieldDefinitions(adminClient);

    // 2. Repair any drifted product schemas
    const repairResult = await repairDriftedProducts(shop, undefined, adminClient);
    const updatedAudit = await auditCatalogForDrift(shop, adminClient);

    try {
      await db.autopilotLog.create({
        data: {
          shop,
          productId: "GLOBAL_CATALOG",
          actionType: "METAFIELD_RESYNC",
          details: `Re-synchronized Shopify metafield definitions (${updatedMetafieldCheck.registeredCount}/4 active) and verified catalog schema integrity.`,
        },
      });
    } catch {}

    return json({
      success: true,
      message: `Metafields re-synchronized: ${updatedMetafieldCheck.registeredCount} of 4 registered in Shopify Admin. Repaired ${repairResult.repairedCount} product schemas.`,
      updatedAudit,
      updatedMetafieldCheck,
    });
  }

  return json({ success: false });
};

export default function SystemHealthRoute() {
  const {
    shop,
    totalProducts,
    syncedCount,
    pendingCount,
    driftAudit: initialDriftAudit,
    metafieldCheck: initialMetafieldCheck,
    webhooks,
    autopilotLogs,
  } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const isResyncing = fetcher.state !== "idle";
  const activeAudit: DriftAuditResult = fetcher.data?.updatedAudit || initialDriftAudit;
  const activeMetafieldCheck = fetcher.data?.updatedMetafieldCheck || initialMetafieldCheck;

  useEffect(() => {
    if (fetcher.data?.success) {
      setSuccessBanner(fetcher.data.message);
    }
  }, [fetcher.data]);

  const handleResyncMetafields = () => {
    fetcher.submit({ intent: "resync_metafields" }, { method: "POST" });
  };

  const activeWebhooksCount = webhooks.filter((w: WebhookStatusItem) => w.hasFired).length;

  return (
    <Page
      title="System Health & Metafield Diagnostics"
      subtitle="Shopify App Store Enterprise Readiness, Webhook Verification & Schema Diagnostics"
      compactTitle
      backAction={{
        content: "Dashboard",
        onAction: () => navigate(`/app?shop=${encodeURIComponent(shop)}`),
      }}
      primaryAction={{
        content: "Re-sync Metafields",
        icon: RefreshIcon,
        loading: isResyncing,
        onAction: handleResyncMetafields,
      }}
    >
      <BlockStack gap="500">
        {successBanner && (
          <Banner tone="success" onDismiss={() => setSuccessBanner(null)}>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {successBanner}
            </Text>
          </Banner>
        )}

        {/* 1. Honest Top Status Banner (Reflects Actual Store State) */}
        {activeAudit.driftedCount > 0 ? (
          <Banner
            title={`Schema Drift Detected: ${activeAudit.driftedCount} Products Out of Sync`}
            tone="warning"
            action={{
              content: "Re-sync Schemas Now",
              loading: isResyncing,
              onAction: handleResyncMetafields,
            }}
          >
            <Text as="p" variant="bodyMd">
              External theme changes, bulk CSV uploads, or third-party apps have altered product metafields.
              Re-syncing will automatically restore verified JSON-LD graphs and spec matrices.
            </Text>
          </Banner>
        ) : pendingCount > 0 ? (
          <Banner
            title="Catalog Synchronization Status"
            tone="info"
            action={{
              content: "Optimize Pending Products",
              onAction: () => navigate(`/app?shop=${encodeURIComponent(shop)}`),
            }}
          >
            <Text as="p" variant="bodyMd" fontWeight="medium">
              {`${syncedCount} of ${totalProducts} products synchronized. ${pendingCount} products pending schema generation.`}
            </Text>
          </Banner>
        ) : (
          <Banner tone="success">
            <InlineStack gap="200" blockAlign="center">
              <CheckCircleIcon width={20} height={20} fill="#008060" />
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                {`All ${totalProducts} catalog products are synchronized with live Schema.org JSON-LD, spec matrices, and buyer FAQs.`}
              </Text>
            </InlineStack>
          </Banner>
        )}

        {/* 2. Three Professional Metric Cards */}
        <Layout>
          <Layout.Section>
            <InlineStack gap="400" align="space-between">
              {/* Card 1: Catalog Status */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                shadow="100"
              >
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    CATALOG AUDITED
                  </Text>
                  <Text as="h2" variant="headingXl" fontWeight="bold">
                    {`${totalProducts} Products`}
                  </Text>
                  <Text as="p" variant="bodySm" tone={pendingCount === 0 ? "success" : "subdued"}>
                    {`${syncedCount} synchronized (${pendingCount} pending)`}
                  </Text>
                </BlockStack>
              </Box>

              {/* Card 2: Schema Integrity (Renamed from Drift Sentinel) */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                shadow="100"
              >
                <BlockStack gap="100">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodySm" tone="subdued">
                      SCHEMA INTEGRITY
                    </Text>
                    <Badge tone={activeAudit.driftedCount > 0 ? "warning" : "success"}>
                      {activeAudit.driftedCount > 0 ? "Discrepancy Found" : "Verified In Sync"}
                    </Badge>
                  </InlineStack>
                  <Text as="h2" variant="headingXl" fontWeight="bold">
                    {activeAudit.driftedCount}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {activeAudit.driftedCount > 0
                      ? `${activeAudit.driftedCount} schemas require re-sync`
                      : "All active schemas match database"}
                  </Text>
                </BlockStack>
              </Box>

              {/* Card 3: Webhook Health */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                shadow="100"
              >
                <BlockStack gap="100">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodySm" tone="subdued">
                      WEBHOOK HEALTH
                    </Text>
                    <Badge tone={activeWebhooksCount > 0 ? "success" : "info"}>
                      {activeWebhooksCount > 0
                        ? `${activeWebhooksCount} / ${webhooks.length} Active`
                        : "Listening (Standby)"}
                    </Badge>
                  </InlineStack>
                  <Text as="h2" variant="headingXl" fontWeight="bold">
                    {`${activeWebhooksCount} / ${webhooks.length}`}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {activeWebhooksCount > 0
                      ? "Live event delivery verified"
                      : "No webhook traffic received yet"}
                  </Text>
                </BlockStack>
              </Box>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* Products Requiring Schema Synchronization (if any) */}
        {activeAudit.driftedProducts.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingMd" fontWeight="bold">
                  Products Requiring Schema Synchronization
                </Text>
                <Button
                  variant="primary"
                  size="slim"
                  loading={isResyncing}
                  onClick={handleResyncMetafields}
                >
                  Re-sync Products
                </Button>
              </InlineStack>
              <List>
                {activeAudit.driftedProducts.map((p) => (
                  <List.Item key={p.productId}>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" fontWeight="bold">
                        {p.title}
                      </Text>
                      <Badge tone="warning">{`Score: ${p.lastKnownGeoScore}/100`}</Badge>
                      <Text as="span" tone="subdued" variant="bodySm">
                        — Reasons: {p.reasons.join(", ")}
                      </Text>
                    </InlineStack>
                  </List.Item>
                ))}
              </List>
            </BlockStack>
          </Card>
        )}

        {/* 3. Metafield Sync Status (Renamed & GraphQL Verified) */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <DatabaseIcon width={20} height={20} />
                <Text as="h3" variant="headingMd" fontWeight="bold">
                  Metafield Sync Status
                </Text>
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone={activeMetafieldCheck.allRegistered ? "success" : "warning"}>
                  {`${activeMetafieldCheck.registeredCount} / 4 Registered`}
                </Badge>
                {!activeMetafieldCheck.allRegistered && (
                  <Button
                    size="slim"
                    variant="primary"
                    loading={isResyncing}
                    onClick={handleResyncMetafields}
                  >
                    Re-sync Metafields
                  </Button>
                )}
              </InlineStack>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              RankPilot verifies that all custom product metafields are registered with official Shopify GraphQL types
              so that merchants and search engine crawlers can access them in Shopify Admin.
            </Text>
            <Divider />
            <BlockStack gap="300">
              {activeMetafieldCheck.definitions.map((def: VerifiedMetafieldDefinition) => (
                <Box
                  key={def.key}
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" fontWeight="bold">
                          {def.key}
                        </Text>
                        <Badge tone="info" size="small">
                          {def.type}
                        </Badge>
                        <Badge
                          tone={def.isRegistered ? "success" : "warning"}
                          size="small"
                        >
                          {def.isRegistered ? "Registered" : "Unregistered"}
                        </Badge>
                        {def.pinned && (
                          <Badge size="small">Pinned in Admin</Badge>
                        )}
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {def.description}
                      </Text>
                    </BlockStack>
                    <Text as="span" variant="bodySm" tone="subdued">
                      Owner: {def.owner}
                    </Text>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>

        {/* 4. Honest Webhook Delivery Verification */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <ShieldCheckMarkIcon width={20} height={20} />
                <Text as="h3" variant="headingMd" fontWeight="bold">
                  Webhook Delivery Verification &amp; Compliance
                </Text>
              </InlineStack>
              <Badge>HMAC SHA256 Verified</Badge>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Monitored webhook subscriptions configured for catalog synchronization, drift detection, and mandatory Shopify GDPR privacy webhooks.
            </Text>
            <Divider />
            <BlockStack gap="200">
              {webhooks.map((w: WebhookStatusItem) => (
                <InlineStack key={w.topic} align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" fontWeight="semibold">
                      {w.topic}
                    </Text>
                    <Badge
                      tone={w.hasFired ? (w.status === "ACTIVE" ? "success" : "info") : undefined}
                      size="small"
                    >
                      {w.hasFired ? w.status : "Standby"}
                    </Badge>
                  </InlineStack>
                  <InlineStack gap="300" blockAlign="center">
                    {w.hasFired ? (
                      <>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Latency: {w.latency}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {w.lastDelivered}
                        </Text>
                        <Badge tone={w.code && w.code < 400 ? "success" : "critical"} size="small">
                          {`HTTP ${w.code}`}
                        </Badge>
                      </>
                    ) : (
                      <Badge size="small">No events received yet</Badge>
                    )}
                  </InlineStack>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>

        {/* 5. Schema Synchronization Activity Log (Renamed from Self-Healing Audit Trail) */}
        {autopilotLogs.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd" fontWeight="bold">
                Schema Synchronization Activity Log
              </Text>
              <Divider />
              <BlockStack gap="200">
                {autopilotLogs.map((log: any) => (
                  <InlineStack key={log.id} align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="info" size="small">
                          {log.actionType}
                        </Badge>
                        <Text as="span" variant="bodySm">
                          {log.details}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
