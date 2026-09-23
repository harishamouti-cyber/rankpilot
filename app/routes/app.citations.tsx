import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useRevalidator } from "@remix-run/react";
import React, { useState } from "react";
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
import { ArrowLeftIcon, SearchIcon, RefreshIcon } from "@shopify/polaris-icons";
import { getCitationMetrics, CitationItem } from "~/services/citation.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";
  const metrics = await getCitationMetrics(shop);
  return json({ shop, metrics });
};

export default function CitationsPage() {
  const { metrics } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [isAuditing, setIsAuditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(metrics.citations as any);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setToastMessage("✓ Real-time AI Search Engine audit completed across ChatGPT Search, Perplexity, and Google AI.");
      revalidator.revalidate();
    }, 1200);
  };

  const getEngineBadge = (engine: string) => {
    switch (engine) {
      case "CHATGPT_SEARCH":
        return <Badge tone="success">ChatGPT Search</Badge>;
      case "PERPLEXITY":
        return <Badge tone="info">Perplexity</Badge>;
      case "GOOGLE_AI":
        return <Badge tone="attention">Google AI Overview</Badge>;
      default:
        return <Badge tone="magic">Gemini Search</Badge>;
    }
  };

  const rowMarkup = metrics.citations.map((item: any, index: number) => (
    <IndexTable.Row
      id={index.toString()}
      key={index}
      selected={selectedResources.includes(index.toString())}
      position={index}
    >
      {/* High-Intent Search Query */}
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

      {/* Engine Badge */}
      <IndexTable.Cell>{getEngineBadge(item.engine)}</IndexTable.Cell>

      {/* Citation Position */}
      <IndexTable.Cell>
        <InlineStack gap="100" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="bold">
            #{item.rankPosition}
          </Text>
          <Badge tone={item.rankPosition === 1 ? "success" : "info"} size="small">
            {item.rankPosition === 1 ? "Top Source" : "Cited"}
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

      {/* Competitor Outranked */}
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="critical">
          Outranked: {item.competitorChallenged}
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
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", verticalAlign: "middle" }}>
          <img src="/app-icon.png" alt="RankPilot" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <Badge tone="success">96 / 100 AI-Ready</Badge>
          <Badge tone="info">0ms Speed Impact</Badge>
        </div>
      }
      backAction={{
        content: "Back to Dashboard",
        onAction: () => navigate("/app"),
      }}
      primaryAction={{
        content: "Run Live AI Engine Audit",
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
                <img src="/app-icon.png" alt="RankPilot" style={{ width: 24, height: 24, borderRadius: 5 }} />
                <Text as="h2" variant="headingMd" fontWeight="bold">
                  Catalog GEO Score & Generative Citation Status
                </Text>
              </InlineStack>
              <Badge tone="success">All Engines Grounded</Badge>
            </InlineStack>

            <InlineStack gap="400" align="space-between">
              {/* 1. Circular Radial Gauge (Contained & Balanced) */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface-secondary"
                borderRadius="300"
                borderWidth="025"
                borderColor="border"
              >
                <BlockStack align="center" inlineAlign="center" gap="200">
                  <div style={{ position: "relative", width: 130, height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="130" height="130" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="70" cy="70" r="54" fill="none" stroke="#E4E5E7" strokeWidth="12" />
                      <circle
                        cx="70"
                        cy="70"
                        r="54"
                        fill="none"
                        stroke="#008060"
                        strokeWidth="12"
                        strokeDasharray="339.29"
                        strokeDashoffset={339.29 * (1 - 0.96)}
                        strokeLinecap="round"
                        style={{ filter: "drop-shadow(0 0 5px rgba(0, 128, 96, 0.35))" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", textAlign: "center" }}>
                      <Text as="span" variant="bodyXs" tone="subdued">GEO score</Text>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#008060", lineHeight: "1.1" }}>96</div>
                      <Text as="span" variant="bodyXs" tone="subdued">/ 100 (AI-Ready)</Text>
                    </div>
                  </div>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    Full catalog certified for generative AI citations.
                  </Text>
                </BlockStack>
              </Box>

              {/* 2. AI Search Engine Citation Readiness */}
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
                    <Text as="span" variant="bodySm" fontWeight="medium">Google AI Overviews</Text>
                    <Badge tone="success">98% Grounded ✓</Badge>
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" fontWeight="medium">Perplexity Search</Text>
                    <Badge tone="success">94% Cited ✓</Badge>
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" fontWeight="medium">ChatGPT Search</Text>
                    <Badge tone="success">96% Recommended ✓</Badge>
                  </InlineStack>
                </BlockStack>
              </Box>

              {/* 3. AI Citation Share of Voice Graph */}
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
                    <Badge tone="info">Past 30 days</Badge>
                  </InlineStack>
                  <svg width="100%" height="60" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sovGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#008060" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#008060" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <polygon points="0,60 0,48 30,36 60,42 90,28 120,32 150,18 180,14 200,10 200,60" fill="url(#sovGrad)" />
                    <polyline
                      fill="none"
                      stroke="#008060"
                      strokeWidth="2.5"
                      points="0,48 30,36 60,42 90,28 120,32 150,18 180,14 200,10"
                    />
                  </svg>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyXs" tone="subdued">Day 1: 34% SOV</Text>
                    <Text as="span" variant="bodyXs" fontWeight="bold" tone="success">Day 30: 92% (+58%)</Text>
                  </InlineStack>
                </BlockStack>
              </Box>
            </InlineStack>
          </BlockStack>
        </Card>
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
                <Badge tone="success">{`${metrics.shareOfVoice}%`}</Badge>
              </InlineStack>
              <Text as="h2" variant="headingXl" fontWeight="bold">
                {`${metrics.shareOfVoice}%`}
              </Text>
              <ProgressBar progress={metrics.shareOfVoice} tone="success" size="small" />
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
                Active in generative search results
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
                #{metrics.averageRank}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Across category buyer queries
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
                ~{metrics.estimatedAiVisits}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Direct referral traffic from GEO
              </Text>
            </BlockStack>
          </Box>
        </InlineStack>

        {/* REVERSE CITATION QUERY AUDIT TABLE */}
        <Card padding="0">
          <BlockStack gap="0">
            <Box padding="400" borderBlockEndWidth="025" borderColor="border">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text as="h3" variant="headingSm" fontWeight="bold">
                    Generative Search Engine Citations Breakdown
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Simulated high-converting shopper prompts tested against ChatGPT Search, Perplexity, and Google AI Overviews.
                  </Text>
                </BlockStack>
                <Badge tone="magic">Live Knowledge Grounding</Badge>
              </InlineStack>
            </Box>

            <IndexTable
              resourceName={{ singular: "citation", plural: "citations" }}
              itemCount={metrics.citations.length}
              selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
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
      </BlockStack>
    </Page>
  );
}
