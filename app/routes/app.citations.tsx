import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import React, { useState, useEffect } from "react";
import {
  Page,
  Card,
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

export interface GeoScoreColors {
  tier: "poor" | "average" | "good";
  text: string;
  stroke: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  polarisTone: "critical" | "warning" | "success";
  progressTone: "critical" | "highlight" | "success";
  label: string;
}

/**
 * Industry-Standard SEO Scoring Colors (Google Lighthouse / Ahrefs standard)
 * 0 to 49 (Poor / Needs Work): Red (#DC2626 / #EF4444 / #FEF2F2)
 * 50 to 79 (Average / Moderate): Amber / Orange (#D97706 / #F59E0B / #FFFBEB)
 * 80 to 100 (Good / AI-Ready): Emerald Green (#059669 / #10B981 / #ECFDF5)
 */
export function getGeoScoreColors(score: number): GeoScoreColors {
  if (score < 50) {
    return {
      tier: "poor",
      text: "#DC2626", // text-red-600
      stroke: "#EF4444", // stroke-red-500
      badgeBg: "#FEF2F2", // bg-red-50
      badgeBorder: "#FCA5A5", // border-red-300
      badgeText: "#DC2626", // text-red-600
      polarisTone: "critical",
      progressTone: "critical",
      label: "Needs Work",
    };
  }
  if (score < 80) {
    return {
      tier: "average",
      text: "#D97706", // text-amber-600
      stroke: "#F59E0B", // stroke-amber-500
      badgeBg: "#FFFBEB", // bg-amber-50
      badgeBorder: "#FCD34D", // border-amber-300
      badgeText: "#D97706", // text-amber-600
      polarisTone: "warning",
      progressTone: "highlight",
      label: "Moderate",
    };
  }
  return {
    tier: "good",
    text: "#059669", // text-emerald-600
    stroke: "#10B981", // stroke-emerald-500
    badgeBg: "#ECFDF5", // bg-emerald-50
    badgeBorder: "#6EE7B7", // border-emerald-300
    badgeText: "#059669", // text-emerald-600
    polarisTone: "success",
    progressTone: "success",
    label: "AI-Ready",
  };
}

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
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  useEffect(() => {
    if (fetcher.data?.success) {
      setToastMessage(
        "✓ Real-time AI Search Engine audit completed across ChatGPT Search, Perplexity, and Google AI."
      );
    }
  }, [fetcher.data]);

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

  // Industry-standard SEO scoring colors
  const scoreColors = getGeoScoreColors(metrics.geoScore);

  // SVG Gauge geometry with generous inner radius clearance
  const gaugeRadius = 58;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius; // ~364.42
  const scorePercent = Math.min(100, Math.max(0, metrics.geoScore));
  const strokeOffset = gaugeCircumference * (1 - scorePercent / 100);

  // Table selection
  const allSelected =
    metrics.citations.length > 0 && selectedResources.length === metrics.citations.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedResources([]);
    } else {
      setSelectedResources(metrics.citations.map((_, i) => i.toString()));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedResources((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
          {/* Industry Standard 3-Tier SEO Badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: scoreColors.badgeBg,
              color: scoreColors.badgeText,
              border: `1px solid ${scoreColors.badgeBorder}`,
            }}
          >
            {`${metrics.geoScore} / 100 AI-Ready`}
          </span>
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
              {/* 1. Circular Radial Gauge (Centered Typography & Generous Clearance) */}
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
                      width: 140,
                      height: 140,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="140"
                      height="140"
                      viewBox="0 0 144 144"
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <circle
                        cx="72"
                        cy="72"
                        r={gaugeRadius}
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="10"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r={gaugeRadius}
                        fill="none"
                        stroke={scoreColors.stroke}
                        strokeWidth="10"
                        strokeDasharray={gaugeCircumference}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        style={{
                          transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
                        }}
                      />
                    </svg>

                    {/* Perfectly centered inner typography with no stroke clipping */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#6B7280",
                          fontWeight: 500,
                          lineHeight: 1,
                          letterSpacing: "0.01em",
                        }}
                      >
                        GEO score
                      </span>
                      <span
                        style={{
                          fontSize: "32px",
                          fontWeight: 700,
                          letterSpacing: "-0.025em",
                          lineHeight: 1,
                          color: scoreColors.text,
                          margin: "4px 0",
                        }}
                      >
                        {metrics.geoScore}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#6B7280",
                          lineHeight: 1.2,
                          fontWeight: 500,
                        }}
                      >
                        / 100 (AI-Ready)
                      </span>
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
                tone={scoreColors.progressTone}
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

              {/* Robust, Fixed-Layout Table with Strict Proportionate Column Widths */}
              <div style={{ width: "100%", overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    tableLayout: "fixed",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <colgroup>
                    <col style={{ width: "48px" }} />  {/* Checkbox */}
                    <col style={{ width: "34%" }} />   {/* Shopper Query & Target Product */}
                    <col style={{ width: "15%" }} />   {/* AI Search Engine */}
                    <col style={{ width: "13%" }} />   {/* Citation Position */}
                    <col style={{ width: "23%" }} />   {/* Cited Verification Snippet */}
                    <col style={{ width: "15%" }} />   {/* Competitor Outranked */}
                  </colgroup>
                  <thead>
                    <tr
                      style={{
                        background: "var(--p-color-bg-surface-secondary, #F7F7F8)",
                        borderBottom: "1px solid var(--p-color-border-subdued, #E4E4E7)",
                      }}
                    >
                      <th
                        style={{
                          padding: "12px 16px",
                          width: "48px",
                          verticalAlign: "middle",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                            accentColor: "#008060",
                          }}
                          aria-label="Select all citations"
                        />
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: 600,
                          color: "#4B5563",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Shopper Query &amp; Target Product
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: 600,
                          color: "#4B5563",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        AI Search Engine
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: 600,
                          color: "#4B5563",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Citation Position
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: 600,
                          color: "#4B5563",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Cited Verification Snippet
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: 600,
                          color: "#4B5563",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Competitor Outranked
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.citations.map((item: CitationItem, index: number) => {
                      const isSelected = selectedResources.includes(index.toString());
                      return (
                        <tr
                          key={item.id || index}
                          style={{
                            borderBottom: "1px solid var(--p-color-border-subdued, #E4E4E7)",
                            background: isSelected
                              ? "var(--p-color-bg-surface-selected, #F1F2F4)"
                              : "transparent",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* Checkbox */}
                          <td
                            style={{
                              padding: "14px 16px",
                              verticalAlign: "top",
                              width: "48px",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(index.toString())}
                              style={{
                                width: "16px",
                                height: "16px",
                                cursor: "pointer",
                                accentColor: "#008060",
                              }}
                              aria-label={`Select ${item.query}`}
                            />
                          </td>

                          {/* Shopper Query & Real Target Product */}
                          <td
                            style={{
                              padding: "14px 16px",
                              verticalAlign: "top",
                              overflow: "hidden",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                maxWidth: "100%",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "#111827",
                                  lineHeight: 1.35,
                                  wordBreak: "break-word",
                                }}
                              >
                                "{item.query}"
                              </span>
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#6B7280",
                                  wordBreak: "break-word",
                                }}
                              >
                                Target Product: {item.productTitle}
                              </span>
                            </div>
                          </td>

                          {/* AI Search Engine Badge */}
                          <td
                            style={{
                              padding: "14px 16px",
                              verticalAlign: "top",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            {getEngineBadge(item.engine)}
                          </td>

                          {/* Citation Position */}
                          <td
                            style={{
                              padding: "14px 16px",
                              verticalAlign: "top",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "#111827",
                                }}
                              >
                                #{item.rankPosition}
                              </span>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 7px",
                                  borderRadius: "9999px",
                                  fontSize: "11px",
                                  fontWeight: 500,
                                  background: "var(--p-color-bg-surface-secondary, #F4F4F5)",
                                  border: "1px solid var(--p-color-border-subdued, #E4E4E7)",
                                  color: "#374151",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.isCited
                                  ? item.rankPosition === 1
                                    ? "Top Source"
                                    : "Cited"
                                  : "Ungrounded"}
                              </span>
                            </div>
                          </td>

                          {/* Cited Verification Snippet (Strictly Bound, Break-Words) */}
                          <td
                            style={{
                              padding: "14px 16px",
                              verticalAlign: "top",
                              overflow: "hidden",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "12px",
                                lineHeight: 1.45,
                                color: "#4B5563",
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                                maxWidth: "100%",
                              }}
                            >
                              {item.citationSnippet}
                            </p>
                          </td>

                          {/* Competitor Outranked / Challenged */}
                          <td
                            style={{
                              padding: "14px 16px",
                              verticalAlign: "top",
                              overflow: "hidden",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "12px",
                                lineHeight: 1.4,
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                              }}
                            >
                              <span style={{ color: "#6B7280" }}>
                                {item.isCited ? "Outranked: " : "Trailing: "}
                              </span>
                              <span
                                style={{
                                  fontWeight: 500,
                                  color: "#1F2937",
                                }}
                              >
                                {item.competitorChallenged}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
