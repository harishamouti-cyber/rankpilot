import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import React, { useState, useEffect } from "react";
import {
  Page,
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import { SearchIcon, RefreshIcon } from "@shopify/polaris-icons";
import {
  getCitationMetrics,
  runCitationAuditForCatalog,
  CitationItem,
  CitationMetricsSummary,
} from "~/services/citation.server";
import { authenticate, unauthenticated } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") || "demo.myshopify.com";
  let adminClient: any = null;

  try {
    const auth = await authenticate.admin(request);
    adminClient = auth.admin;
    if (auth.session?.shop) {
      shop = auth.session.shop;
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    try {
      const unauthResult = await unauthenticated.admin(shop);
      adminClient = unauthResult.admin;
    } catch {}
  }

  const metrics = await getCitationMetrics(shop, adminClient);
  return json({ shop, metrics });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") || "demo.myshopify.com";
  let adminClient: any = null;

  try {
    const auth = await authenticate.admin(request);
    adminClient = auth.admin;
    if (auth.session?.shop) {
      shop = auth.session.shop;
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

  if (intent === "run_audit") {
    const freshMetrics = await runCitationAuditForCatalog(shop, adminClient);
    return json({ success: true, metrics: freshMetrics });
  }

  return json({ success: false });
};

export default function CitationsPage() {
  const { shop, metrics: initialMetrics } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<{ success: boolean; metrics?: CitationMetricsSummary }>();

  const isAuditing = fetcher.state !== "idle";
  const metrics: CitationMetricsSummary = fetcher.data?.metrics || initialMetrics;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.data?.success) {
      setToastMessage(
        "✓ Real-time AI Search Engine audit completed across ChatGPT Search, Perplexity, and Google AI."
      );
    }
  }, [fetcher.data]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(metrics.citations as any);

  const handleRunAudit = () => {
    fetcher.submit({ intent: "run_audit" }, { method: "POST" });
  };

  // Subtle neutral engine badges to avoid neon clutter
  const getEngineBadge = (engine: string) => {
    switch (engine) {
      case "CHATGPT_SEARCH":
        return <Badge>ChatGPT Search</Badge>;
      case "PERPLEXITY":
        return <Badge>Perplexity</Badge>;
      case "GOOGLE_AI":
        return <Badge>Google AI Overview</Badge>;
      default:
        return <Badge>AI Search</Badge>;
    }
  };

  const gaugeRadius = 54;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius; // ~339.29
  const scorePercent = Math.min(100, Math.max(0, metrics.geoScore));
  const strokeOffset = gaugeCircumference * (1 - scorePercent / 100);
  const gaugeStrokeColor =
    scorePercent >= 80 ? "#008060" : scorePercent >= 40 ? "#2C6ECB" : "#D97706";

  const rowMarkup = metrics.citations.map((item: CitationItem, index: number) => (
    <IndexTable.Row
      id={index.toString()}
      key={item.id || index}
      selected={selectedResources.includes(index.toString())}
      position={index}
    >
      {/* High-Intent Search Query & Real Target Product */}
      <IndexTable.Cell>
        <BlockStack gap="050">
          <Text as="span" variant="bodyMd" fontWeight="bold">
            "{item.query}"
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            Target Product: {item.productTitle}
          </Text>
        </BlockStack>
      </IndexTable.Cell>

      {/* Subtle Neutral Engine Badge */}
      <IndexTable.Cell>{getEngineBadge(item.engine)}</IndexTable.Cell>

      {/* Citation Position */}
      <IndexTable.Cell>
        <InlineStack gap="150" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="bold">
            #{item.rankPosition}
          </Text>
          <Badge size="small">
            {item.isCited
              ? item.rankPosition === 1
                ? "Top Source"
                : "Cited"
              : "Ungrounded"}
          </Badge>
        </InlineStack>
      </IndexTable.Cell>

      {/* Verification Snippet */}
      <IndexTable.Cell>
        <div style={{ maxWidth: 360 }}>
          <Text as="p" variant="bodySm" tone="subdued">
            {item.citationSnippet}
          </Text>
        </div>
      </IndexTable.Cell>

      {/* Competitor Outranked / Challenged */}
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">
          {item.isCited ? "Outranked: " : "Trailing: "}
          <Text as="span" variant="bodySm" fontWeight="medium">
            {item.competitorChallenged}
          </Text>
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="GEO Score Insights & Reverse Citation Tracker"
      subtitle="Track your store's citations, answer placements, and Share of Voice on ChatGPT, Perplexity, and Google AI."
      compactTitle
      titleMetadata={
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            verticalAlign: "middle",
          }}
        >
          <img
            src="/app-icon.png"
            alt="RankPilot"
            style={{ width: 28, height: 28, borderRadius: 6 }}
          />
          <Badge tone={metrics.geoScore >= 80 ? "success" : "info"}>
            {`${metrics.geoScore} / 100 AI-Ready`}
          </Badge>
          <Badge>0ms Speed Impact</Badge>
        </div>
      }
      backAction={{
        content: "Back to Dashboard",
        onAction: () => navigate(`/app?shop=${encodeURIComponent(shop)}`),
      }}
      primaryAction={{
        content: metrics.hasAudited ? "Run Live AI Engine Audit" : "Run First AI Engine Audit",
        icon: RefreshIcon,
        loading: isAuditing,
        onAction: handleRunAudit,
      }}
    >
      <BlockStack gap="500">
        {toastMessage && (
          <Banner tone="success" onDismiss={() => setToastMessage(null)}>
            <Text as="p" variant="bodyMd">
              {toastMessage}
            </Text>
          </Banner>
        )}

        {/* TOP GEO SCORE & AI ENGINE READINESS HERO CARD */}
        <Card padding="500">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <img
                  src="/app-icon.png"
                  alt="RankPilot"
                  style={{ width: 24, height: 24, borderRadius: 5 }}
                />
                <Text as="h2" variant="headingMd" fontWeight="bold">
                  Catalog GEO Score &amp; Generative Citation Status
                </Text>
              </InlineStack>
              <Badge>
                {metrics.hasAudited
                  ? metrics.shareOfVoice > 0
                    ? "Citations Active"
                    : "Catalog Audited"
                  : "Audit Pending"}
              </Badge>
            </InlineStack>

            <InlineStack gap="400" align="space-between">
              {/* 1. Circular Radial Gauge (Synced with actual store readiness score) */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface-secondary"
                borderRadius="300"
                borderWidth="025"
                borderColor="border"
              >
                <BlockStack align="center" inlineAlign="center" gap="200">
                  <div
                    style={{
                      position: "relative",
                      width: 130,
                      height: 130,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="130"
                      height="130"
                      viewBox="0 0 140 140"
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <circle
                        cx="70"
                        cy="70"
                        r={gaugeRadius}
                        fill="none"
                        stroke="#E4E5E7"
                        strokeWidth="12"
                      />
                      <circle
                        cx="70"
                        cy="70"
                        r={gaugeRadius}
                        fill="none"
                        stroke={gaugeStrokeColor}
                        strokeWidth="12"
                        strokeDasharray={gaugeCircumference}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        style={{
                          transition: "stroke-dashoffset 0.6s ease",
                        }}
                      />
                    </svg>
                    <div style={{ position: "absolute", textAlign: "center" }}>
                      <Text as="span" variant="bodyXs" tone="subdued">
                        GEO score
                      </Text>
                      <div
                        style={{
                          fontSize: "32px",
                          fontWeight: "bold",
                          color: gaugeStrokeColor,
                          lineHeight: "1.1",
                        }}
                      >
                        {metrics.geoScore}
                      </div>
                      <Text as="span" variant="bodyXs" tone="subdued">
                        / 100 (AI-Ready)
                      </Text>
                    </div>
                  </div>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    {metrics.geoScore === 100
                      ? "Full catalog certified for generative AI citations."
                      : `${metrics.aiReadyCount} of ${metrics.totalProducts} catalog products certified for generative AI citations.`}
                  </Text>
                </BlockStack>
              </Box>

              {/* 2. AI Search Engine Citation Readiness (Subtle Neutral Badges) */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface-secondary"
                borderRadius="300"
                borderWidth="025"
                borderColor="border"
              >
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" fontWeight="bold">
                    AI Citation Readiness
                  </Text>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" fontWeight="medium">
                      Google AI Overviews
                    </Text>
                    <Badge>{metrics.engineStats.googleAi}</Badge>
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" fontWeight="medium">
                      Perplexity Search
                    </Text>
                    <Badge>{metrics.engineStats.perplexity}</Badge>
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" fontWeight="medium">
                      ChatGPT Search
                    </Text>
                    <Badge>{metrics.engineStats.chatgpt}</Badge>
                  </InlineStack>
                </BlockStack>
              </Box>

              {/* 3. AI Citation Share of Voice Graph (Clean Empty vs Audited State) */}
              <Box
                width="32%"
                padding="400"
                background="bg-surface-secondary"
                borderRadius="300"
                borderWidth="025"
                borderColor="border"
              >
                <BlockStack gap="150">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      AI Citation Share of Voice
                    </Text>
                    <Badge>
                      {metrics.hasAudited ? "Audited Catalog" : "Baseline Pending"}
                    </Badge>
                  </InlineStack>

                  {!metrics.hasAudited ? (
                    <>
                      <Box paddingBlock="200">
                        <Text as="p" variant="bodySm" tone="subdued">
                          No historical citations tracked yet. Run an audit to benchmark your search engine visibility against competitors.
                        </Text>
                      </Box>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyXs" tone="subdued">
                          Baseline: 0% SOV
                        </Text>
                        <Text as="span" variant="bodyXs" tone="subdued">
                          Target: 80%+
                        </Text>
                      </InlineStack>
                    </>
                  ) : (
                    <>
                      <svg
                        width="100%"
                        height="60"
                        viewBox="0 0 200 60"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="sovGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2C6ECB" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2C6ECB" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <polygon
                          points={`0,60 0,55 50,${Math.max(15, 60 - metrics.shareOfVoice * 0.3)} 100,${Math.max(12, 60 - metrics.shareOfVoice * 0.45)} 150,${Math.max(10, 60 - metrics.shareOfVoice * 0.52)} 200,${Math.max(8, 60 - metrics.shareOfVoice * 0.58)} 200,60`}
                          fill="url(#sovGrad)"
                        />
                        <polyline
                          fill="none"
                          stroke="#2C6ECB"
                          strokeWidth="2.5"
                          points={`0,55 50,${Math.max(15, 60 - metrics.shareOfVoice * 0.3)} 100,${Math.max(12, 60 - metrics.shareOfVoice * 0.45)} 150,${Math.max(10, 60 - metrics.shareOfVoice * 0.52)} 200,${Math.max(8, 60 - metrics.shareOfVoice * 0.58)}`}
                        />
                      </svg>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyXs" tone="subdued">
                          Baseline: 0% SOV
                        </Text>
                        <Text
                          as="span"
                          variant="bodyXs"
                          fontWeight="bold"
                        >
                          {`Current: ${metrics.shareOfVoice}% SOV`}
                        </Text>
                      </InlineStack>
                    </>
                  )}
                </BlockStack>
              </Box>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* 4 OPERATIONAL KPI BOXES */}
        <InlineStack gap="400" align="space-between">
          <Box
            width="23%"
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
                  SHARE OF VOICE (SOV)
                </Text>
                <Badge>{`${metrics.shareOfVoice}% SOV`}</Badge>
              </InlineStack>
              <Text as="h2" variant="headingXl" fontWeight="bold">
                {`${metrics.shareOfVoice}%`}
              </Text>
              <ProgressBar
                progress={metrics.shareOfVoice}
                tone="highlight"
                size="small"
              />
            </BlockStack>
          </Box>

          <Box
            width="23%"
            padding="400"
            background="bg-surface"
            borderRadius="200"
            borderWidth="025"
            borderColor="border"
            shadow="100"
          >
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                TOTAL CITATIONS WON
              </Text>
              <Text as="h2" variant="headingXl" fontWeight="bold">
                {metrics.totalCitations}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {metrics.hasAudited
                  ? "Active in generative search results"
                  : "No citations audited yet"}
              </Text>
            </BlockStack>
          </Box>

          <Box
            width="23%"
            padding="400"
            background="bg-surface"
            borderRadius="200"
            borderWidth="025"
            borderColor="border"
            shadow="100"
          >
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                AVERAGE CITATION POSITION
              </Text>
              <Text as="h2" variant="headingXl" fontWeight="bold">
                {metrics.averageRank === "—" ? "—" : `#${metrics.averageRank}`}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {metrics.hasAudited
                  ? "Across category buyer queries"
                  : "Pending audit"}
              </Text>
            </BlockStack>
          </Box>

          <Box
            width="23%"
            padding="400"
            background="bg-surface"
            borderRadius="200"
            borderWidth="025"
            borderColor="border"
            shadow="100"
          >
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                ESTIMATED AI SESSIONS
              </Text>
              <Text as="h2" variant="headingXl" fontWeight="bold">
                {metrics.hasAudited ? `~${metrics.estimatedAiVisits}` : "0"}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Direct referral traffic from GEO
              </Text>
            </BlockStack>
          </Box>
        </InlineStack>

        {/* REVERSE CITATION QUERY AUDIT TABLE OR EMPTY STATE */}
        {!metrics.hasAudited || metrics.citations.length === 0 ? (
          <Card padding="600">
            <BlockStack gap="400" align="center" inlineAlign="center">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--p-color-bg-surface-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--p-color-border-subdued)",
                }}
              >
                <SearchIcon
                  style={{
                    width: 24,
                    height: 24,
                    fill: "var(--p-color-icon-subdued)",
                  }}
                />
              </div>

              <BlockStack gap="150" align="center" inlineAlign="center">
                <Text
                  as="h2"
                  variant="headingMd"
                  fontWeight="bold"
                  alignment="center"
                >
                  No search engine citations audited yet
                </Text>
                <div style={{ maxWidth: 520 }}>
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Simulate real-time shopper buyer prompts across ChatGPT Search,
                    Perplexity, and Google AI Overviews to discover high-intent
                    citation rankings, verification snippets, and competitor
                    outranking opportunities for your catalog.
                  </Text>
                </div>
              </BlockStack>

              <Button
                variant="primary"
                size="large"
                icon={RefreshIcon}
                loading={isAuditing}
                onClick={handleRunAudit}
              >
                Run First AI Engine Audit
              </Button>
            </BlockStack>
          </Card>
        ) : (
          <Card padding="0">
            <BlockStack gap="0">
              <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Generative Search Engine Citations Breakdown
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Simulated high-converting shopper prompts tested against
                      ChatGPT Search, Perplexity, and Google AI Overviews.
                    </Text>
                  </BlockStack>
                  <Badge>Live Knowledge Grounding</Badge>
                </InlineStack>
              </Box>

              <IndexTable
                resourceName={{ singular: "citation", plural: "citations" }}
                itemCount={metrics.citations.length}
                selectedItemsCount={
                  allResourcesSelected ? "All" : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: "Shopper Query & Target Product" },
                  { title: "AI Search Engine" },
                  { title: "Citation Position" },
                  { title: "Cited Verification Snippet" },
                  { title: "Competitor Outranked" },
                ]}
              >
                {rowMarkup}
              </IndexTable>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
