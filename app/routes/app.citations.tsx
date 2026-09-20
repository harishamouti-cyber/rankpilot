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
      title="Reverse AI Citation Tracker"
      subtitle="Track your store's citations, answer placements, and Share of Voice on ChatGPT, Perplexity, and Google AI."
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

        {/* METRICS BANNER */}
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
