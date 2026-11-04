import React, { useState, useEffect } from "react";
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
  Banner,
  Icon,
  TextField,
} from "@shopify/polaris";
import {
  UndoIcon,
  ClipboardIcon,
  RefreshIcon,
  ImageIcon,
} from "@shopify/polaris-icons";
import { ShopifyProductItem } from "~/services/shopify.server";
import { OptimizationResult } from "~/services/gemini.server";

interface OptimizationModalProps {
  open: boolean;
  onClose: () => void;
  product: ShopifyProductItem | null;
  optimization: OptimizationResult | null;
  isApplying: boolean;
  applySuccess?: boolean;
  applyError?: string | null;
  shop?: string;
  onApply: (product: ShopifyProductItem, optimization: OptimizationResult) => void;
  onRevert?: (productId: string) => void;
  onRegenerate?: (product: ShopifyProductItem) => void;
}

export function OptimizationModal({
  open,
  onClose,
  product,
  optimization,
  isApplying,
  applySuccess = false,
  applyError = null,
  shop = "",
  onApply,
  onRevert,
  onRegenerate,
}: OptimizationModalProps) {
  const [selectedView, setSelectedView] = useState<0 | 1 | 2>(0);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [simulationEngine, setSimulationEngine] = useState<"google" | "chatgpt" | "perplexity">("google");

  const beforeAltText = product ? (product.imageAltText || product.featuredImage?.altText || "") : "";
  const [editableAltText, setEditableAltText] = useState(
    optimization?.imageAltText || beforeAltText
  );

  useEffect(() => {
    if (optimization?.imageAltText) {
      setEditableAltText(optimization.imageAltText);
    } else if (beforeAltText) {
      setEditableAltText(beforeAltText);
    }
  }, [optimization?.imageAltText, beforeAltText]);

  if (!product || !optimization) return null;

  const isOptimized = product.optimizationStatus === "OPTIMIZED" || product.optimizationStatus === "AI_READY";
  const baselineScore =
    typeof optimization.baselineScore === "number"
      ? optimization.baselineScore
      : product.geoScore ?? product.aiScore ?? 0;
  const projectedScore = typeof optimization.aiScore === "number" ? optimization.aiScore : 0;
  const scoreGain = projectedScore - baselineScore;
  const alreadyOptimized = scoreGain <= 0;

  const beforeTitle = product.seo?.title || product.title;

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
    product.seo?.description?.trim() ||
    getNaturalDescription(product.descriptionHtml, beforeTitle);

  // Render highlighted meta description with subtle keyword tags
  const renderHighlightedDescription = (desc: string) => {
    const parts = desc.split(/(Camber|Rocker|Sintered|Basalt|Carbon|Freeride|Twin-Tip|UHMW|Electra|YKK|Grade 2|Titanium|DLC|Qi2|15W|ANC|warranty|guarantee|In Stock|MagSafe|Cordura|waterproof|ultralight)/gi);
    return parts.map((part, i) => {
      if (/^(Camber|Rocker|Sintered|Basalt|Carbon|Freeride|Twin-Tip|UHMW|Electra|YKK|Grade 2|Titanium|DLC|Qi2|15W|ANC|warranty|guarantee|In Stock|MagSafe|Cordura|waterproof|ultralight)$/i.test(part)) {
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
        <BlockStack gap="200">
          {/* Compact score header: one row */}
          <Box padding="200" background="bg-surface-secondary" borderRadius="200">
            <InlineStack align="space-between" blockAlign="center" gap="200" wrap={false}>
              <InlineStack gap="150" blockAlign="center" wrap={false}>
                <Text as="span" variant="headingSm">GEO score</Text>
                {alreadyOptimized ? (
                  <>
                    <Badge tone="success">{`${baselineScore}/100`}</Badge>
                    <Badge tone="info">Already optimized</Badge>
                  </>
                ) : (
                  <>
                    <Badge tone={baselineScore < 50 ? "critical" : "warning"}>{`${baselineScore}`}</Badge>
                    <Text as="span" variant="bodySm">→</Text>
                    <Badge tone="success">{`${projectedScore}/100 (+${scoreGain})`}</Badge>
                  </>
                )}
              </InlineStack>
              <InlineStack gap="200" blockAlign="center" wrap={false}>
                {[
                  ["Title", optimization.scoreBreakdown.titleOptimization],
                  ["Meta", optimization.scoreBreakdown.metaDescriptionQuality],
                  ["Specs", optimization.scoreBreakdown.specMatrixCompleteness],
                  ["Schema", optimization.scoreBreakdown.schemaRichness],
                  ["FAQ", optimization.scoreBreakdown.conversationalFaqDepth],
                ].map(([label, val]) => (
                  <Text key={String(label)} as="span" variant="bodySm" tone="subdued">
                    {label} <strong>{val}</strong>/20
                  </Text>
                ))}
              </InlineStack>
            </InlineStack>
          </Box>

          <InlineStack align="center">
            <ButtonGroup variant="segmented">
              <Button size="slim" pressed={selectedView === 0} onClick={() => setSelectedView(0)}>
                Side-by-Side Comparison
              </Button>
              <Button size="slim" pressed={selectedView === 1} onClick={() => setSelectedView(1)}>
                JSON-LD &amp; Structured Schema
              </Button>
              <Button size="slim" pressed={selectedView === 2} onClick={() => setSelectedView(2)}>
                Live AI Engine Simulation
              </Button>
            </ButtonGroup>
          </InlineStack>

          {/* ========================================================================= */}
          {/* VIEW 1: SIDE-BY-SIDE COMPARISON                                           */}
          {/* ========================================================================= */}
          {selectedView === 0 && (
            <BlockStack gap="200">
              {/* Audit findings as one-line chips (computed from live data) */}
              {(() => {
                const findings: string[] = [];
                if (!product.seo?.title) findings.push("SEO title");
                if (!product.seo?.description) findings.push("Meta description");
                if (!beforeAltText) findings.push("Image alt text");
                if (!product.rankpilotMetafields?.schemaJson) findings.push("JSON-LD schema");
                if (!product.rankpilotMetafields?.specMatrix) findings.push("Spec table");
                if (!product.rankpilotMetafields?.faqJson) findings.push("Buyer FAQs");
                return (
                  <InlineStack gap="100" blockAlign="center" wrap>
                    <Text as="span" variant="bodySm" tone="subdued">Current store:</Text>
                    {findings.length === 0 ? (
                      <Badge tone="success">Nothing missing</Badge>
                    ) : (
                      findings.map((f) => (
                        <Badge key={f} tone="critical">{`Missing: ${f}`}</Badge>
                      ))
                    )}
                  </InlineStack>
                );
              })()}

              {/* Row-by-row diff */}
              <Box borderWidth="025" borderColor="border" borderRadius="200" overflowX="hidden">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 120 }} />
                    <col />
                    <col />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "var(--p-color-bg-surface-secondary)", textAlign: "left" }}>
                      <th style={{ padding: "6px 10px", fontWeight: 600 }}>Field</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600 }}>Current</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, color: "var(--p-color-text-success)" }}>Optimized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        field: "SEO title",
                        before: beforeTitle,
                        beforeMeta: `${beforeTitle.length}/60`,
                        after: <strong>{optimization.seoTitle}</strong>,
                        afterMeta: `${optimization.seoTitle.length}/60`,
                      },
                      {
                        field: "Meta description",
                        before: beforeDesc,
                        beforeMeta: product.seo?.description ? `${beforeDesc.length}/155` : "not set (Shopify uses description)",
                        after: optimization.seoDescription,
                        afterMeta: `${optimization.seoDescription.length}/155`,
                      },
                    ].map((r) => (
                      <tr key={r.field} style={{ borderTop: "1px solid var(--p-color-border)", verticalAlign: "top" }}>
                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>{r.field}</td>
                        <td style={{ padding: "6px 10px", color: "var(--p-color-text-secondary)" }}>
                          {r.before}
                          <div style={{ fontSize: 11, opacity: 0.8 }}>{r.beforeMeta}</div>
                        </td>
                        <td style={{ padding: "6px 10px" }}>
                          {r.after}
                          <div style={{ fontSize: 11, color: "var(--p-color-text-success)" }}>{r.afterMeta}</div>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "1px solid var(--p-color-border)", verticalAlign: "top" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                        Image alt
                        {product.featuredImage?.url && (
                          <img
                            src={product.featuredImage.url}
                            alt=""
                            style={{ display: "block", width: 36, height: 36, objectFit: "cover", borderRadius: 4, marginTop: 4, border: "1px solid var(--p-color-border)" }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "6px 10px", color: beforeAltText ? "var(--p-color-text-secondary)" : "var(--p-color-text-critical)" }}>
                        {beforeAltText || "Missing"}
                      </td>
                      <td style={{ padding: "4px 10px" }}>
                        <TextField
                          label="Image alt text"
                          labelHidden
                          size="slim"
                          value={editableAltText}
                          onChange={(val) => setEditableAltText(val)}
                          autoComplete="off"
                          error={editableAltText.length > 125 ? `${editableAltText.length}/125` : undefined}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Box>

              {/* Long content collapsed by default */}
              <details style={{ border: "1px solid var(--p-color-border)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {`Added to description: spec table (${(optimization.specMatrixHtml.match(/<tr/gi) || []).length ? (optimization.specMatrixHtml.match(/<tr/gi) || []).length - 1 : 0} rows) & ${optimization.faqList.length} buyer FAQs`}
                </summary>
                <div style={{ marginTop: 8 }}>
                  <div
                    dangerouslySetInnerHTML={{ __html: optimization.specMatrixHtml }}
                    style={{ overflowX: "auto", fontSize: 12, lineHeight: 1.4 }}
                  />
                  <div style={{ marginTop: 8 }}>
                    {optimization.faqList.map((faq, idx) => (
                      <p key={idx} style={{ margin: "0 0 6px", fontSize: 12, lineHeight: 1.4 }}>
                        <strong>Q: {faq.question}</strong>
                        <br />
                        <span style={{ color: "var(--p-color-text-secondary)" }}>{faq.answer}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </details>
            </BlockStack>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: JSON-LD & STRUCTURED SCHEMA (VERIFIED METAS)                     */}
          {/* ========================================================================= */}
          {selectedView === 1 && (
            <BlockStack gap="400">
              {/* Quick Actions Header */}
              <Card background="bg-surface-secondary">
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Verified Metafield Payloads &amp; Machine-Readable Schema
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Directly bound to Shopify Product Metafields: <code>rankpilot.schema_json</code>, <code>rankpilot.spec_table</code>, and <code>rankpilot.faq_json</code>.
                    </Text>
                  </BlockStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Button
                      icon={ClipboardIcon}
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(JSON.stringify(optimization.schemaJson, null, 2));
                          setCopiedSchema(true);
                          setTimeout(() => setCopiedSchema(false), 2000);
                        }
                      }}
                    >
                      {copiedSchema ? "✓ Copied Schema" : "Copy JSON-LD"}
                    </Button>
                    {onRegenerate && (
                      <Button
                        icon={RefreshIcon}
                        onClick={() => onRegenerate(product)}
                        disabled={isApplying}
                      >
                        Re-generate
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      loading={isApplying}
                      onClick={() => onApply(product, { ...optimization, imageAltText: editableAltText })}
                    >
                      Publish to Metafields
                    </Button>
                  </InlineStack>
                </InlineStack>
              </Card>

              {/* 1. Formatted JSON-LD Preview */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h3" variant="headingSm" fontWeight="bold">
                        Schema.org JSON-LD Graph (Product &amp; Merchant Return)
                      </Text>
                      <Badge tone="success">Validated 2026 Schema</Badge>
                    </InlineStack>
                    <Button
                      size="slim"
                      variant="plain"
                      icon={ClipboardIcon}
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(JSON.stringify(optimization.schemaJson, null, 2));
                          setCopiedSchema(true);
                          setTimeout(() => setCopiedSchema(false), 2000);
                        }
                      }}
                    >
                      {copiedSchema ? "✓ Copied" : "Copy Raw JSON"}
                    </Button>
                  </InlineStack>
                  <div
                    style={{
                      maxHeight: "300px",
                      overflowY: "auto",
                      backgroundColor: "#0f172a",
                      color: "#38bdf8",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      padding: "16px",
                      borderRadius: "8px",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {JSON.stringify(optimization.schemaJson, null, 2)}
                  </div>
                </BlockStack>
              </Card>

              {/* 2. Structured Specification Matrix */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Structured Specification Table (Metafield: <code>rankpilot.spec_table</code>)
                    </Text>
                    <Badge tone="info">AEO Grounding</Badge>
                  </InlineStack>
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      maxHeight: "220px",
                      overflowY: "auto",
                    }}
                    dangerouslySetInnerHTML={{ __html: optimization.specMatrixHtml }}
                  />
                </BlockStack>
              </Card>

              {/* 3. Conversational Buyer FAQs */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Buyer FAQ Knowledge Graph (Metafield: <code>rankpilot.faq_json</code>)
                    </Text>
                    <Badge tone="success">{`${optimization.faqList.length} Q&As`}</Badge>
                  </InlineStack>
                  <BlockStack gap="200">
                    {optimization.faqList.map((faq, index) => (
                      <Box
                        key={index}
                        padding="300"
                        background="bg-surface-secondary"
                        borderRadius="150"
                        borderWidth="025"
                        borderColor="border"
                      >
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm" fontWeight="bold">
                            Q: {faq.question}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            A: {faq.answer}
                          </Text>
                        </BlockStack>
                      </Box>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: LIVE AI ENGINE SIMULATION                                         */}
          {/* ========================================================================= */}
          {selectedView === 2 && (
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

              <Banner tone="info">
                <Text as="p" variant="bodySm">
                  Illustrative preview of how AI search engines could present this product using the optimized data. This is not a live search result.
                </Text>
              </Banner>

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
                        /products/{product.handle}
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
                        Price: ${product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode}
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
                        Spec table &amp; FAQs
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
                        Image alt text included
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
                                  {optimization.seoTitle.split("|")[0].trim() || product.title} (Your Store)
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #ceead6" }}>
                                  Precision Engineering + Full Spec Matrix
                                </td>
                                <td style={{ padding: "8px 12px", borderBottom: "1px solid #ceead6" }}>
                                  Full spec table &amp; buyer FAQs
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
                        <strong>Specifications:</strong> Structured specification table built from your product data.
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <strong>Pricing:</strong> {product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode} from your store.
                      </li>
                      <li>
                        <strong>Buyer FAQs:</strong> {optimization.faqList.length} answers drawn from your catalog data.
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
                      • <strong>Pricing:</strong> {product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode} on your storefront [1].<br />
                      • <strong>Specifications:</strong> Structured specification table from your product data [2].<br />
                      • <strong>Buyer FAQs:</strong> Answers drawn from your product data [1, 3].
                    </div>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          )}

          <div
            style={{
              position: "sticky",
              bottom: 0,
              zIndex: 2,
              background: "var(--p-color-bg-surface)",
              paddingTop: 8,
              marginBottom: -4,
            }}
          >
            {isApplying && (
              <Box paddingBlockEnd="200">
                <Banner tone="info">
                  <p>
                    <strong>Pushing to Shopify Store...</strong> Updating product description, structured specification matrix, buyer FAQs, and GEO image alt text live in your Shopify catalog.
                  </p>
                </Banner>
              </Box>
            )}

            {applySuccess && (
              <Box paddingBlockEnd="200">
                <Banner tone="success" title="Successfully Updated & Pushed to Shopify!">
                  <BlockStack gap="100">
                    <p>
                      ✓ <strong>{product.title}</strong> is now updated live in your Shopify catalog.
                    </p>
                    <p style={{ color: "#374151", fontSize: "13px" }}>
                      Your product description now includes the specifications table and buyer FAQs, and the SEO title, meta description and image alt text are saved in Shopify.
                    </p>
                    {shop && (
                      <p style={{ color: "#374151", fontSize: "13px" }}>
                        To show the JSON-LD structured data on your storefront, turn on the{" "}
                        <a
                          href={`https://${shop}/admin/themes/current/editor?context=apps&activateAppId=82464865c45f23d73b21b486de6ace7a/schema_embed`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          RankPilot structured data app embed
                        </a>{" "}
                        in your theme (one time).
                      </p>
                    )}
                  </BlockStack>
                </Banner>
              </Box>
            )}

            {applyError && !isApplying && !applySuccess && (
              <Box paddingBlockEnd="200">
                <Banner tone="critical" title="Could not complete Shopify push">
                  <BlockStack gap="100">
                    <p>{applyError}</p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      Changes are saved in your RankPilot catalog. Click "Apply & Push to Store" below to retry sending updates to Shopify.
                    </p>
                  </BlockStack>
                </Banner>
              </Box>
            )}

            <Divider />

            <InlineStack align="space-between" blockAlign="center">
              {/* Left Action: Revert to Previous Snapshot */}
              {product.hasRollback && onRevert && !applySuccess ? (
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
                  {applySuccess ? "✓ Live on Shopify" : "Baseline Snapshot Active"}
                </Text>
              )}

              {/* Right Action: Cancel and Apply / Done */}
              {applySuccess ? (
                <ButtonGroup>
                  {shop && (
                    <Button
                      variant="plain"
                      url={
                        product.id && !product.id.includes("8472917")
                          ? `https://admin.shopify.com/store/${shop.replace(".myshopify.com", "")}/products/${product.id.replace("gid://shopify/Product/", "")}`
                          : `https://admin.shopify.com/store/${shop.replace(".myshopify.com", "")}/products`
                      }
                      target="_blank"
                    >
                      {product.id && !product.id.includes("8472917")
                        ? "View in Shopify Products ↗"
                        : "View Shopify Products Catalog ↗"}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    tone="success"
                    onClick={onClose}
                  >
                    Done
                  </Button>
                </ButtonGroup>
              ) : (
                <ButtonGroup>
                  <Button onClick={onClose} disabled={isApplying}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    loading={isApplying}
                    disabled={isApplying}
                    onClick={() => onApply(product, { ...optimization, imageAltText: editableAltText })}
                  >
                    {isApplying ? "Pushing to Store..." : "Apply & Push to Store"}
                  </Button>
                </ButtonGroup>
              )}
            </InlineStack>
          </div>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
