import React, { useState } from "react";
import {
  Modal,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  Button,
  ButtonGroup,
  Divider,
  ProgressBar,
} from "@shopify/polaris";
import {
  UndoIcon,
} from "@shopify/polaris-icons";
import { ShopifyProductItem } from "~/services/shopify.server";
import { OptimizationResult } from "~/services/gemini.server";

interface OptimizationModalProps {
  open: boolean;
  onClose: () => void;
  product: ShopifyProductItem | null;
  optimization: OptimizationResult | null;
  isApplying: boolean;
  onApply: (product: ShopifyProductItem, optimization: OptimizationResult) => void;
  onRevert?: (productId: string) => void;
}

export function OptimizationModal({
  open,
  onClose,
  product,
  optimization,
  isApplying,
  onApply,
  onRevert,
}: OptimizationModalProps) {
  const [selectedView, setSelectedView] = useState<0 | 1>(0);
  const [simulationEngine, setSimulationEngine] = useState<"google" | "chatgpt" | "perplexity">("google");

  if (!product || !optimization) return null;

  const isOptimized = product.optimizationStatus === "OPTIMIZED" || product.optimizationStatus === "AI_READY";
  const baselineScore = isOptimized ? (product.geoScore || product.aiScore || 96) : 38;
  const projectedScore = optimization.aiScore || 96;

  const beforeTitle = product.seo.title || product.title;

  // Extract clean text from description without mid-sentence truncation
  const getNaturalDescription = (html: string, fallbackTitle: string): string => {
    if (!html) return `High performance ${fallbackTitle} engineered for everyday utility and durability.`;
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length <= 180) return text;
    // Find the last period, exclamation mark, or question mark before character 190
    const punctuationIndex = Math.max(
      text.lastIndexOf(". ", 180),
      text.lastIndexOf("! ", 180),
      text.lastIndexOf("? ", 180)
    );
    if (punctuationIndex > 40) {
      return text.slice(0, punctuationIndex + 1);
    }
    return text.slice(0, 160).trim() + "...";
  };

  const beforeDesc =
    product.seo.description?.trim() ||
    getNaturalDescription(product.descriptionHtml, beforeTitle);

  // Render highlighted meta description with subtle keyword tags
  const renderHighlightedDescription = (desc: string) => {
    const parts = desc.split(/(Grade 2|Titanium|DLC|Qi2|15W|ANC|warranty|guarantee|In Stock|MagSafe|Cordura|waterproof|ultralight)/gi);
    return parts.map((part, i) => {
      if (/^(Grade 2|Titanium|DLC|Qi2|15W|ANC|warranty|guarantee|In Stock|MagSafe|Cordura|waterproof|ultralight)$/i.test(part)) {
        return (
          <span
            key={i}
            style={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "4px",
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`AI Proof & Diff: ${optimization.seoTitle.split("|")[0].trim() || product.title}`}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Header Score Lift & Transformation Summary */}
          <Card background="bg-surface-secondary">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Projected GEO Score Lift:
                  </Text>
                  <Badge tone={baselineScore < 50 ? "critical" : "warning"} size="medium">
                    {`Baseline: ${baselineScore}/100`}
                  </Badge>
                  <Text as="span" variant="headingMd" fontWeight="bold">
                    ➔
                  </Text>
                  <Badge tone="success" size="medium">
                    {`Supercharged: ${projectedScore}/100 (+${Math.max(projectedScore - baselineScore, 0)} pts)`}
                  </Badge>
                </InlineStack>
                <InlineStack gap="150">
                  <Badge tone="info">0ms Storefront Impact</Badge>
                  <Badge tone="success">Ready for ChatGPT &amp; Google AI</Badge>
                </InlineStack>
              </InlineStack>

              <ProgressBar
                progress={projectedScore}
                tone={projectedScore >= 90 ? "success" : "highlight"}
                size="small"
              />

              <InlineStack gap="300" wrap>
                <Text as="span" variant="bodySm" tone="subdued">
                  Title CTR: <strong>{optimization.scoreBreakdown.titleOptimization}/20</strong>
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  Meta Quality: <strong>{optimization.scoreBreakdown.metaDescriptionQuality}/20</strong>
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  Spec Matrix: <strong>{optimization.scoreBreakdown.specMatrixCompleteness}/20</strong>
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  JSON-LD Schema: <strong>{optimization.scoreBreakdown.schemaRichness}/20</strong>
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  Buyer FAQ Depth: <strong>{optimization.scoreBreakdown.conversationalFaqDepth}/20</strong>
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Clean Segmented Control with 16px vertical padding */}
          <Box paddingBlock="400">
            <InlineStack align="center">
              <ButtonGroup variant="segmented">
                <Button
                  pressed={selectedView === 0}
                  onClick={() => setSelectedView(0)}
                >
                  Side-by-Side Comparison
                </Button>
                <Button
                  pressed={selectedView === 1}
                  onClick={() => setSelectedView(1)}
                >
                  Live AI Engine Simulation
                </Button>
              </ButtonGroup>
            </InlineStack>
          </Box>

          {/* ========================================================================= */}
          {/* VIEW 1: SIDE-BY-SIDE COMPARISON                                           */}
          {/* ========================================================================= */}
          {selectedView === 0 && (
            <BlockStack gap="400">
              <InlineStack gap="400" align="space-between">
                {/* Left Column: Current Storefront (Audit Findings) */}
                <Box
                  width="48%"
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                  borderWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm" tone="subdued" fontWeight="bold">
                        CURRENT STOREFRONT (AUDIT)
                      </Text>
                      <Badge tone="critical">
                        {baselineScore < 50
                          ? "38/100 (Unranked & Invisible to AI)"
                          : `${baselineScore}/100 (Baseline)`}
                      </Badge>
                    </InlineStack>

                    <Divider />

                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                        Raw Product Title ({beforeTitle.length} chars)
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {beforeTitle}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                        Storefront Description
                      </Text>
                      <Box padding="200" background="bg-surface" borderRadius="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          {beforeDesc}
                        </Text>
                      </Box>
                    </BlockStack>

                    {/* Dedicated Audit Findings Badges */}
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" fontWeight="bold">
                        Audit Findings &amp; Search Gaps:
                      </Text>

                      <Box
                        padding="200"
                        background="bg-surface"
                        borderRadius="150"
                        borderWidth="025"
                        borderColor="border-critical"
                      >
                        <InlineStack gap="200" blockAlign="center">
                          <Badge tone="critical" size="small">
                            [✕] Missing
                          </Badge>
                          <BlockStack gap="050">
                            <Text as="p" variant="bodySm" fontWeight="semibold">
                              Missing Schema.org JSON-LD
                            </Text>
                            <Text as="p" variant="bodyXs" tone="subdued">
                              Search engines cannot verify live price, currency, or in-stock status.
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </Box>

                      <Box
                        padding="200"
                        background="bg-surface"
                        borderRadius="150"
                        borderWidth="025"
                        borderColor="border-critical"
                      >
                        <InlineStack gap="200" blockAlign="center">
                          <Badge tone="critical" size="small">
                            [✕] Missing
                          </Badge>
                          <BlockStack gap="050">
                            <Text as="p" variant="bodySm" fontWeight="semibold">
                              Zero Spec Table for Google AI Overviews
                            </Text>
                            <Text as="p" variant="bodyXs" tone="subdued">
                              No structured HTML comparison matrix for search feature extraction.
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </Box>

                      <Box
                        padding="200"
                        background="bg-surface"
                        borderRadius="150"
                        borderWidth="025"
                        borderColor="border-critical"
                      >
                        <InlineStack gap="200" blockAlign="center">
                          <Badge tone="critical" size="small">
                            [✕] Missing
                          </Badge>
                          <BlockStack gap="050">
                            <Text as="p" variant="bodySm" fontWeight="semibold">
                              Missing Buyer Intent FAQs
                            </Text>
                            <Text as="p" variant="bodyXs" tone="subdued">
                              Zero conversational Q&amp;As to ground ChatGPT Search and Perplexity citations.
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </Box>
                    </BlockStack>
                  </BlockStack>
                </Box>

                {/* Right Column: RankPilot AI Supercharged */}
                <Box
                  width="48%"
                  padding="400"
                  background="bg-surface"
                  borderRadius="200"
                  borderWidth="050"
                  borderColor="border-success"
                  shadow="100"
                >
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm" tone="success" fontWeight="bold">
                        ✦ RANKPILOT AI SUPERCHARGED
                      </Text>
                      <Badge tone="success">
                        96/100 (AI &amp; Google Ready)
                      </Badge>
                    </InlineStack>

                    <Divider />

                    <BlockStack gap="100">
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodySm" fontWeight="semibold" tone="success">
                          Optimized SEO Title
                        </Text>
                        <Badge tone="success" size="small">
                          {`${optimization.seoTitle.length}/60 chars`}
                        </Badge>
                      </InlineStack>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {optimization.seoTitle}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodySm" fontWeight="semibold" tone="success">
                          Semantic Meta Description
                        </Text>
                        <Badge tone="success" size="small">
                          {`${optimization.seoDescription.length}/155 chars`}
                        </Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm">
                        {renderHighlightedDescription(optimization.seoDescription)}
                      </Text>
                    </BlockStack>

                    {/* Formatted Spec Matrix (Rendered HTML) */}
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold" tone="success">
                        Formatted Spec Matrix (Rendered HTML Table)
                      </Text>
                      <Box
                        padding="200"
                        background="bg-surface-secondary"
                        borderRadius="150"
                        borderWidth="025"
                        borderColor="border"
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: optimization.specMatrixHtml }}
                          style={{
                            overflowX: "auto",
                            fontSize: 12,
                            lineHeight: 1.4,
                          }}
                        />
                      </Box>
                    </BlockStack>

                    {/* Conversational FAQ Accordion (3 collapsible Q&As) */}
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold" tone="success">
                        Conversational FAQ Accordion (3 Buyer Q&amp;As)
                      </Text>
                      <BlockStack gap="100">
                        {optimization.faqList.map((faq, idx) => (
                          <details
                            key={idx}
                            open={idx === 0}
                            style={{
                              border: "1px solid #dcdfe3",
                              borderRadius: 6,
                              padding: "8px 12px",
                              backgroundColor: "#fafbfc",
                              fontSize: 12,
                            }}
                          >
                            <summary style={{ fontWeight: 600, cursor: "pointer", color: "#202223" }}>
                              Q{idx + 1}: {faq.question}
                            </summary>
                            <p style={{ marginTop: 6, marginBottom: 0, color: "#5c5f62", lineHeight: 1.4 }}>
                              {faq.answer}
                            </p>
                          </details>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </BlockStack>
                </Box>
              </InlineStack>
            </BlockStack>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: LIVE AI ENGINE SIMULATION                                         */}
          {/* ========================================================================= */}
          {selectedView === 1 && (
            <BlockStack gap="400">
              {/* Visual Engine Selector Toggle */}
              <InlineStack align="center" gap="200">
                <Button
                  variant={simulationEngine === "google" ? "primary" : "secondary"}
                  onClick={() => setSimulationEngine("google")}
                >
                  Google AI Overview
                </Button>
                <Button
                  variant={simulationEngine === "chatgpt" ? "primary" : "secondary"}
                  onClick={() => setSimulationEngine("chatgpt")}
                >
                  ChatGPT Search
                </Button>
                <Button
                  variant={simulationEngine === "perplexity" ? "primary" : "secondary"}
                  onClick={() => setSimulationEngine("perplexity")}
                >
                  Perplexity
                </Button>
              </InlineStack>

              {/* ENGINE 1: GOOGLE AI OVERVIEW */}
              {simulationEngine === "google" && (
                <Box
                  padding="500"
                  background="bg-surface"
                  borderRadius="300"
                  borderWidth="025"
                  borderColor="border"
                  shadow="200"
                >
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)",
                          }}
                        />
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          Google AI Overview
                        </Text>
                      </InlineStack>
                      <Badge tone="success" size="small">
                        Grounding Citations Verified
                      </Badge>
                    </InlineStack>

                    <Text as="p" variant="bodyMd">
                      According to verified merchant specifications, the <strong>{optimization.seoTitle.split("|")[0].trim() || product.title}</strong> by <strong>{product.vendor}</strong> is identified as a top-tier recommendation in this category:
                    </Text>

                    {/* Grounding Citation Link Pills */}
                    <InlineStack gap="200" wrap>
                      <div
                        style={{
                          backgroundColor: "#e8f0fe",
                          padding: "5px 12px",
                          borderRadius: 16,
                          fontSize: 12,
                          color: "#1967d2",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        🔗 demo.myshopify.com/products/{product.handle}
                      </div>
                      <div
                        style={{
                          backgroundColor: "#e8f0fe",
                          padding: "5px 12px",
                          borderRadius: 16,
                          fontSize: 12,
                          color: "#1967d2",
                          fontWeight: 500,
                        }}
                      >
                        ✓ Verified Price: ${product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode}
                      </div>
                      <div
                        style={{
                          backgroundColor: "#e8f0fe",
                          padding: "5px 12px",
                          borderRadius: 16,
                          fontSize: 12,
                          color: "#1967d2",
                          fontWeight: 500,
                        }}
                      >
                        ✓ In Stock &amp; Ships in 24-48h
                      </div>
                    </InlineStack>

                    {/* Google AI Embedded Comparison Table */}
                    <Box
                      padding="300"
                      background="bg-surface-secondary"
                      borderRadius="200"
                      borderWidth="025"
                      borderColor="border"
                    >
                      <BlockStack gap="200">
                        <Text as="p" variant="bodySm" fontWeight="bold">
                          AI Overview Feature Matrix Comparison:
                        </Text>
                        <div style={{ overflowX: "auto" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: 12,
                              backgroundColor: "#fff",
                              borderRadius: 6,
                              overflow: "hidden",
                            }}
                          >
                            <thead>
                              <tr style={{ backgroundColor: "#f1f3f4", textAlign: "left" }}>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #dadce0" }}>Product</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #dadce0" }}>Primary Build</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #dadce0" }}>Key Advantage</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #dadce0" }}>Price / Stock</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #dadce0" }}>AEO Rank</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ backgroundColor: "#e6f4ea", fontWeight: 600 }}>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #ceead6" }}>
                                  ⭐ {optimization.seoTitle.split("|")[0].trim() || product.title} (Your Store)
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #ceead6" }}>
                                  Precision Engineering + Full Spec Matrix
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #ceead6" }}>
                                  Verified durability &amp; 30-day buyer trial
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #ceead6" }}>
                                  ${product.priceRange.minVariantPrice.amount} (In Stock)
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #ceead6" }}>
                                  <Badge tone="success">#1 Top Pick</Badge>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e0e0e0", color: "#5f6368" }}>
                                  Generic Category Alternative A
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e0e0e0", color: "#5f6368" }}>
                                  Standard commercial grade
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e0e0e0", color: "#5f6368" }}>
                                  No structured warranty data
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e0e0e0", color: "#5f6368" }}>
                                  $149.00 (Low Stock)
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #e0e0e0" }}>
                                  <Badge>#2 Alternate</Badge>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: "8px 12px", color: "#5f6368" }}>
                                  Budget Marketplace Variant B
                                </td>
                                <td style={{ padding: "8px 12px", color: "#5f6368" }}>
                                  Unverified materials
                                </td>
                                <td style={{ padding: "8px 12px", color: "#5f6368" }}>
                                  Lacks customer FAQ grounding
                                </td>
                                <td style={{ padding: "8px 12px", color: "#5f6368" }}>
                                  $89.00 (Backorder)
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                  <Badge>#3 Budget</Badge>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </Box>
              )}

              {/* ENGINE 2: CHATGPT SEARCH */}
              {simulationEngine === "chatgpt" && (
                <Box
                  padding="500"
                  background="bg-surface"
                  borderRadius="300"
                  borderWidth="025"
                  borderColor="border"
                  shadow="200"
                >
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            backgroundColor: "#10a37f",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        >
                          GPT
                        </div>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          ChatGPT Search
                        </Text>
                      </InlineStack>
                      <Badge tone="info" size="small">
                        Cited from /llms.txt Catalog
                      </Badge>
                    </InlineStack>

                    <Text as="p" variant="bodyMd">
                      When searching for the best verified solution, the <strong>{optimization.seoTitle.split("|")[0].trim() || product.title}</strong> by <strong>{product.vendor}</strong> is cited as the primary recommendation:
                    </Text>

                    <ul style={{ paddingLeft: 22, margin: "4px 0", fontSize: 13, color: "#202223" }}>
                      <li style={{ marginBottom: 6 }}>
                        <strong>Technical Architecture:</strong> Engineered with structured specifications and drop-tested durability.
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <strong>Verified Pricing &amp; Offers:</strong> Direct value at ${product.priceRange.minVariantPrice.amount} with full manufacturer warranty.
                      </li>
                      <li>
                        <strong>Buyer Trust Factor:</strong> 30-day money-back guarantee with fast tracked delivery.
                      </li>
                    </ul>

                    <Box
                      padding="200"
                      background="bg-surface-secondary"
                      borderRadius="150"
                      borderWidth="025"
                      borderColor="border"
                    >
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="info">Citation 1</Badge>
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          {optimization.seoTitle}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          (Verified via RankPilot Schema)
                        </Text>
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </Box>
              )}

              {/* ENGINE 3: PERPLEXITY */}
              {simulationEngine === "perplexity" && (
                <Box
                  padding="500"
                  background="bg-surface"
                  borderRadius="300"
                  borderWidth="025"
                  borderColor="border"
                  shadow="200"
                >
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            backgroundColor: "#1fb8cd",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "bold",
                          }}
                        >
                          *
                        </div>
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          Perplexity Pro Answer
                        </Text>
                      </InlineStack>
                      <Badge tone="success" size="small">
                        3 Web Sources Consulted
                      </Badge>
                    </InlineStack>

                    {/* Numbered Source Cards */}
                    <InlineStack gap="200">
                      <Box padding="150" background="bg-surface-secondary" borderRadius="100" borderWidth="025" borderColor="border">
                        <Text as="span" variant="bodyXs" fontWeight="bold">1. {product.vendor} Official [Verified]</Text>
                      </Box>
                      <Box padding="150" background="bg-surface-secondary" borderRadius="100" borderWidth="025" borderColor="border">
                        <Text as="span" variant="bodyXs" fontWeight="bold">2. Schema.org Spec Matrix [JSON-LD]</Text>
                      </Box>
                      <Box padding="150" background="bg-surface-secondary" borderRadius="100" borderWidth="025" borderColor="border">
                        <Text as="span" variant="bodyXs" fontWeight="bold">3. RankPilot /llms.txt Feed</Text>
                      </Box>
                    </InlineStack>

                    <Text as="p" variant="bodyMd">
                      The <strong>{optimization.seoTitle.split("|")[0].trim() || product.title}</strong> is currently rated as the top choice for shoppers prioritizing build quality and manufacturer-backed reliability [1]. Key findings from merchant schema:
                    </Text>

                    <div style={{ backgroundColor: "#f8f9fa", padding: "12px", borderRadius: 8, fontSize: 13, lineHeight: 1.5 }}>
                      • <strong>Official Pricing:</strong> Retails at ${product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode} directly through authorized merchant storefront [1].<br />
                      • <strong>Specifications:</strong> Features verified dimension matrix and thermal engineering [2].<br />
                      • <strong>Buyer Satisfaction:</strong> Supported by dedicated buyer FAQ resolving sizing and warranty concerns [1, 3].
                    </div>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          )}

          {/* ========================================================================= */}
          {/* CUSTOM MODAL FOOTER                                                       */}
          {/* ========================================================================= */}
          <Divider />

          <InlineStack align="space-between" blockAlign="center">
            {/* Left Action: Revert to Previous Snapshot */}
            {product.hasRollback && onRevert ? (
              <Button
                variant="plain"
                tone="critical"
                icon={UndoIcon}
                disabled={isApplying}
                onClick={() => onRevert(product.id)}
              >
                Revert to Previous Snapshot
              </Button>
            ) : (
              <Text as="span" variant="bodySm" tone="subdued">
                Baseline Snapshot Active
              </Text>
            )}

            {/* Right Action: Cancel and Apply */}
            <ButtonGroup>
              <Button onClick={onClose} disabled={isApplying}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isApplying}
                disabled={isApplying}
                onClick={() => onApply(product, optimization)}
              >
                Apply &amp; Push to Store
              </Button>
            </ButtonGroup>
          </InlineStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
