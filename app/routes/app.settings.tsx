import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import React, { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  TextField,
  Checkbox,
  Button,
  Banner,
  Text,
  Badge,
  Modal,
  Box,
  Divider,
} from "@shopify/polaris";
import {
  SettingsIcon,
  ShieldCheckMarkIcon,
  AlertDiamondIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from "@shopify/polaris-icons";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";

  let setting = await db.appSetting.findUnique({ where: { shop } });
  if (!setting) {
    setting = await db.appSetting.create({
      data: {
        shop,
        storeDomain: "demo.myshopify.com",
        autoPingIndexNow: true,
        autopilotEnabled: true,
        indexNowKey: "rankpilot-demo-indexnow-key-2025",
        plan: "SCALE",
      },
    });
  }

  const storeConfig = await db.storeConfig.findUnique({ where: { shop } });

  return json({
    shop,
    setting: {
      geminiApiKey: setting.geminiApiKey || "",
      indexNowKey: setting.indexNowKey || "rankpilot-demo-indexnow-key-2025",
      autoPingIndexNow: setting.autoPingIndexNow,
      autopilotEnabled: setting.autopilotEnabled,
      storeDomain: setting.storeDomain || "demo.myshopify.com",
      plan: setting.plan || "SCALE",
      weeklyDigestEmail: storeConfig?.weeklyDigestEmail || "merchant@store.com",
    },
  });
};

export default function SettingsRoute() {
  const { shop, setting } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();

  const [geminiApiKey, setGeminiApiKey] = useState(setting.geminiApiKey);
  const [indexNowKey, setIndexNowKey] = useState(setting.indexNowKey);
  const [storeDomain, setStoreDomain] = useState(setting.storeDomain);
  const [autoPingIndexNow, setAutoPingIndexNow] = useState(setting.autoPingIndexNow);
  const [autopilotEnabled, setAutopilotEnabled] = useState(setting.autopilotEnabled);
  const [weeklyDigestEmail, setWeeklyDigestEmail] = useState(setting.weeklyDigestEmail);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [retainedBanner, setRetainedBanner] = useState<string | null>(null);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      setSavedBanner("Store settings and autopilot preferences saved successfully.");
    }
  }, [fetcher.data]);

  const handleSave = () => {
    fetcher.submit(
      {
        shop,
        geminiApiKey,
        indexNowKey,
        storeDomain,
        autoPingIndexNow: String(autoPingIndexNow),
        autopilotEnabled: String(autopilotEnabled),
        weeklyDigestEmail,
      },
      { method: "POST", action: "/api/settings", encType: "application/json" }
    );
  };

  const handleAcceptPausePlan = () => {
    setIsCancelModalOpen(false);
    setRetainedBanner("Schema Freeze plan activated ($9/mo). Your AI schemas and 301 redirects are preserved.");
  };

  const handleConfirmFullCancel = () => {
    setIsCancelModalOpen(false);
    navigate("/app/billing");
  };

  return (
    <Page
      title="Settings & Autopilot Configuration"
      subtitle="Manage AI engine integrations, IndexNow dispatchers, and catalog guard triggers"
      compactTitle
      backAction={{
        content: "Dashboard",
        onAction: () => navigate("/app"),
      }}
      primaryAction={{
        content: "Save Preferences",
        loading: isSubmitting,
        onAction: handleSave,
      }}
    >
      <BlockStack gap="500">
        {savedBanner && (
          <Banner tone="success" onDismiss={() => setSavedBanner(null)}>
            <Text as="p" variant="bodyMd">
              {savedBanner}
            </Text>
          </Banner>
        )}

        {retainedBanner && (
          <Banner tone="info" onDismiss={() => setRetainedBanner(null)}>
            <Text as="p" variant="bodyMd">
              {retainedBanner}
            </Text>
          </Banner>
        )}

        <Layout>
          {/* Main Settings Column */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* Autopilot & Catalog Guard */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingMd" fontWeight="bold">
                      Autopilot 24/7 Catalog Guard
                    </Text>
                    <Badge tone={autopilotEnabled ? "success" : "attention"}>
                      {autopilotEnabled ? "Active" : "Paused"}
                    </Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    When enabled, RankPilot continuously audits your store for newly added products, inventory stockouts,
                    and schema drift, automatically healing metafields with zero merchant effort.
                  </Text>
                  <Checkbox
                    label="Enable 24/7 Autopilot Catalog Scanner & Drift Sentinel"
                    checked={autopilotEnabled}
                    onChange={setAutopilotEnabled}
                  />
                  <Checkbox
                    label="Dispatch Instant IndexNow ping whenever a product is optimized or stock changes"
                    checked={autoPingIndexNow}
                    onChange={setAutoPingIndexNow}
                  />
                </BlockStack>
              </Card>

              {/* API Keys & Integrations */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd" fontWeight="bold">
                    AI Engines & Search Integrations
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    RankPilot includes built-in enterprise Gemini 2.5 Flash credits. You may optionally provide your own Google Gemini API key.
                  </Text>
                  <TextField
                    label="Google Gemini API Key (Optional Override)"
                    type="password"
                    value={geminiApiKey}
                    onChange={setGeminiApiKey}
                    placeholder="AIzaSy..."
                    helpText="Leave empty to use RankPilot's managed high-speed AI cluster."
                    autoComplete="off"
                  />
                  <TextField
                    label="IndexNow Dispatch Key"
                    value={indexNowKey}
                    onChange={setIndexNowKey}
                    helpText="Used for instant Bing, Yandex, and Perplexity crawl requests."
                    autoComplete="off"
                  />
                  <TextField
                    label="Primary Storefront Domain"
                    value={storeDomain}
                    onChange={setStoreDomain}
                    helpText="Canonical domain used in JSON-LD structured data and canonical links."
                    autoComplete="off"
                  />
                  <TextField
                    label="Weekly Executive Performance Digest Email"
                    value={weeklyDigestEmail}
                    onChange={setWeeklyDigestEmail}
                    helpText="Receives a weekly summary of AI citations, impressions, and revenue protected."
                    autoComplete="email"
                  />
                </BlockStack>
              </Card>

              {/* Danger Zone / Deactivation Interceptor */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="bold">
                    Subscription & App Deactivation
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Manage your subscription status or pause your plan.
                  </Text>
                  <Divider />
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Cancel Subscription or Remove App
                      </Text>
                      <Text as="p" variant="bodySm" tone="critical">
                        Warning: This will freeze all AI citations and remove schema graph protection.
                      </Text>
                    </BlockStack>
                    <Button variant="secondary" tone="critical" onClick={() => setIsCancelModalOpen(true)}>
                      Deactivate or Cancel Plan
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Sidebar Summary */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="bold">
                    System Architecture
                  </Text>
                  <Divider />
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Current Plan:
                    </Text>
                    <Badge tone="info">{setting.plan}</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Storefront Speed:
                    </Text>
                    <Badge tone="success">0ms Overhead</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Execution Mode:
                    </Text>
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                      100% GraphQL Metafields
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Core Web Vitals:
                    </Text>
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                      CLS ≤ 0.05 / INP &lt; 50ms
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="bold">
                    Quick Diagnostics
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Need to verify webhook deliveries or repair schema drift?
                  </Text>
                  <Button fullWidth onClick={() => navigate("/app/health")}>
                    Open Health &amp; Diagnostics
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Anti-Churn Deactivation Interceptor Modal */}
      <Modal
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="⚠️ Pause RankPilot & Retain Your AI Search Rankings"
        primaryAction={{
          content: "Keep Schemas Live for $9/mo",
          onAction: handleAcceptPausePlan,
        }}
        secondaryActions={[
          {
            content: "Proceed with full cancellation",
            destructive: true,
            onAction: handleConfirmFullCancel,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="critical">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Canceling will immediately strip your structured JSON-LD schemas, spec matrices, and 301 AI query routing.
              </Text>
            </Banner>

            <Text as="p" variant="bodyMd">
              Google AI Overviews and ChatGPT Search rely on persistent structured entities. If you pause RankPilot:
            </Text>

            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="200">
                <Text as="p" variant="bodySm">
                  ❌ <strong>Loss of AI Citations:</strong> LLM crawlers will no longer find structured FAQ and spec entities.
                </Text>
                <Text as="p" variant="bodySm">
                  ❌ <strong>Broken Stockout Rerouting:</strong> AI queries will land on dead stockout pages instead of live variants.
                </Text>
                <Text as="p" variant="bodySm">
                  ❌ <strong>Drift Vulnerability:</strong> Future theme updates will permanently wipe existing storefront schemas.
                </Text>
              </BlockStack>
            </Box>

            <Box
              padding="400"
              background="bg-surface-success"
              borderRadius="200"
              borderColor="border-success"
              borderWidth="025"
            >
              <BlockStack gap="100">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h4" variant="headingSm" fontWeight="bold">
                    Special Offer: 30-Day Schema Freeze Plan
                  </Text>
                  <Badge tone="success">$9 / month</Badge>
                </InlineStack>
                <Text as="p" variant="bodySm">
                  Pause automated scans while keeping all live JSON-LD schemas, spec matrices, and 301 redirects fully active in Google &amp; ChatGPT Search.
                </Text>
              </BlockStack>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
