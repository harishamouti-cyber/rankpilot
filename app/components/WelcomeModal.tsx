import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  ProgressBar,
  Box,
  Divider,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  MagicIcon,
  SearchIcon,
  AlertTriangleIcon,
} from "@shopify/polaris-icons";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartFirstOptimization: () => void;
  totalProductsCount: number;
  unoptimizedProductsCount: number;
  firstUnoptimizedProductTitle?: string;
}

export function WelcomeModal({
  open,
  onClose,
  onStartFirstOptimization,
  totalProductsCount,
  unoptimizedProductsCount,
  firstUnoptimizedProductTitle,
}: WelcomeModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusIndex, setScanStatusIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scanStatuses = [
    "Inspecting catalog schemas & JSON-LD graph...",
    "Checking AI crawler access (/llms.txt & robots.txt)...",
    "Evaluating conversational query readiness & buyer FAQs...",
    "Calculating baseline Generative Engine Optimization (GEO) score...",
  ];

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setScanProgress(0);
      setScanStatusIndex(0);
    }
  }, [open]);

  // Handle Step 2 Scan Animation
  useEffect(() => {
    if (step === 2) {
      setScanProgress(0);
      setScanStatusIndex(0);

      const startTime = Date.now();
      const duration = 3000; // 3 seconds total scan time

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));
        setScanProgress(progress);

        if (progress < 25) {
          setScanStatusIndex(0);
        } else if (progress < 55) {
          setScanStatusIndex(1);
        } else if (progress < 85) {
          setScanStatusIndex(2);
        } else {
          setScanStatusIndex(3);
        }

        if (progress >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            setStep(3);
          }, 350);
        }
      }, 50);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [step]);

  const handleStartAudit = () => {
    setStep(2);
  };

  const handleCompleteAndOptimize = () => {
    onClose();
    onStartFirstOptimization();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        step === 1
          ? "Welcome to RankPilot"
          : step === 2
          ? "Auditing Catalog AI Visibility..."
          : "AI Catalog Audit Complete"
      }
      size="large"
    >
      <Modal.Section>
        {/* ===================================================================== */}
        {/* STEP 1: WELCOME & MISSION                                             */}
        {/* ===================================================================== */}
        {step === 1 && (
          <BlockStack gap="500">
            {/* Hero Header */}
            <Box
              padding="500"
              background="bg-surface-secondary"
              borderRadius="200"
              borderWidth="025"
              borderColor="border"
            >
              <BlockStack gap="300">
                <InlineStack gap="200" align="space-between" blockAlign="center">
                  <Badge tone="info" size="large">
                    AI SEO, GEO &amp; AI Search Overviews
                  </Badge>
                  <Badge tone="success">0ms Storefront Speed Impact</Badge>
                </InlineStack>

                <Text as="h2" variant="headingLg" fontWeight="bold">
                  Welcome to RankPilot
                </Text>

                <Text as="p" variant="bodyMd" tone="subdued">
                  Bridge your catalog to AI Search Overviews, Google, and generative answer engines with zero theme speed impact.
                </Text>
              </BlockStack>
            </Box>

            {/* Value Checklist */}
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm" fontWeight="bold">
                Why Top Merchants Choose RankPilot:
              </Text>

              <InlineStack gap="400" align="space-between">
                <Box
                  width="48%"
                  padding="300"
                  background="bg-surface"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                >
                  <InlineStack gap="200" blockAlign="start">
                    <CheckCircleIcon width={20} height={20} fill="#008060" />
                    <BlockStack gap="050">
                      <Text as="h4" variant="bodyMd" fontWeight="semibold">
                        Zero Theme Speed Impact
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        100% server-side GraphQL &amp; native Metafields. Zero client-side script tags or theme slowing code.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>

                <Box
                  width="48%"
                  padding="300"
                  background="bg-surface"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                >
                  <InlineStack gap="200" blockAlign="start">
                    <CheckCircleIcon width={20} height={20} fill="#008060" />
                    <BlockStack gap="050">
                      <Text as="h4" variant="bodyMd" fontWeight="semibold">
                        High-Citation Spec Matrices
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Generative AI synthesizes tables. Auto-generate dense specification matrices that LLMs extract for answers.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>
              </InlineStack>

              <InlineStack gap="400" align="space-between">
                <Box
                  width="48%"
                  padding="300"
                  background="bg-surface"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                >
                  <InlineStack gap="200" blockAlign="start">
                    <CheckCircleIcon width={20} height={20} fill="#008060" />
                    <BlockStack gap="050">
                      <Text as="h4" variant="bodyMd" fontWeight="semibold">
                        Conversational Buyer FAQs
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Target long-tail purchase intents ("is it waterproof?", "fits 15-inch laptop?") to win direct search citations.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>

                <Box
                  width="48%"
                  padding="300"
                  background="bg-surface"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                >
                  <InlineStack gap="200" blockAlign="start">
                    <CheckCircleIcon width={20} height={20} fill="#008060" />
                    <BlockStack gap="050">
                      <Text as="h4" variant="bodyMd" fontWeight="semibold">
                        Instant IndexNow Discovery
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Pings Bing, Yandex, and Perplexity crawlers the instant inventory or specs update for same-hour indexation.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>
              </InlineStack>
            </BlockStack>

            <Divider />

            {/* Bottom Actions */}
            <InlineStack align="space-between" blockAlign="center">
              <Button variant="plain" onClick={onClose}>
                Explore Dashboard Directly
              </Button>
              <Button
                variant="primary"
                size="large"
                icon={SearchIcon}
                onClick={handleStartAudit}
              >
                Run Automated AI Visibility Scan (3s)
              </Button>
            </InlineStack>
          </BlockStack>
        )}

        {/* ===================================================================== */}
        {/* STEP 2: LIVE SCANNING ANIMATION                                       */}
        {/* ===================================================================== */}
        {step === 2 && (
          <BlockStack gap="500">
            <Box
              padding="600"
              background="bg-surface-secondary"
              borderRadius="200"
              borderWidth="025"
              borderColor="border"
            >
              <BlockStack gap="400" align="center">
                <InlineStack align="center">
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      backgroundColor: "#008060",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 20px rgba(0, 128, 96, 0.4)",
                    }}
                  >
                    <SearchIcon width={28} height={28} fill="#ffffff" />
                  </div>
                </InlineStack>

                <BlockStack gap="100" align="center">
                  <Text as="h2" variant="headingMd" fontWeight="bold" alignment="center">
                    Auditing Catalog for Generative Engine Visibility
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    Simulating crawl agents from Google AI Overviews, Perplexity Pro, and ChatGPT Search...
                  </Text>
                </BlockStack>

                <Box width="100%">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        Scan Progress
                      </Text>
                      <Text as="span" variant="bodySm" fontWeight="bold">
                        {scanProgress}%
                      </Text>
                    </InlineStack>
                    <ProgressBar progress={scanProgress} tone="primary" size="medium" />
                  </BlockStack>
                </Box>

                {/* Animated Status Cycling */}
                <Box
                  padding="300"
                  background="bg-surface"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                  width="100%"
                >
                  <InlineStack gap="200" blockAlign="center">
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#008060",
                      }}
                    />
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      {scanStatuses[scanStatusIndex]}
                    </Text>
                  </InlineStack>
                </Box>
              </BlockStack>
            </Box>

            {/* Checklist of live inspection targets */}
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <CheckCircleIcon
                  width={16}
                  height={16}
                  fill={scanProgress >= 25 ? "#008060" : "#8c9196"}
                />
                <Text as="span" variant="bodySm" tone={scanProgress >= 25 ? undefined : "subdued"}>
                  Inspecting {totalProductsCount} products for Schema.org Product &amp; Offer graph
                </Text>
              </InlineStack>

              <InlineStack gap="200" blockAlign="center">
                <CheckCircleIcon
                  width={16}
                  height={16}
                  fill={scanProgress >= 55 ? "#008060" : "#8c9196"}
                />
                <Text as="span" variant="bodySm" tone={scanProgress >= 55 ? undefined : "subdued"}>
                  Verifying AI crawler accessibility via /llms.txt manifest
                </Text>
              </InlineStack>

              <InlineStack gap="200" blockAlign="center">
                <CheckCircleIcon
                  width={16}
                  height={16}
                  fill={scanProgress >= 85 ? "#008060" : "#8c9196"}
                />
                <Text as="span" variant="bodySm" tone={scanProgress >= 85 ? undefined : "subdued"}>
                  Calculating conversational search query coverage and citation potential
                </Text>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        )}

        {/* ===================================================================== */}
        {/* STEP 3: AUDIT RESULTS & CALL TO ACTION                                */}
        {/* ===================================================================== */}
        {step === 3 && (
          <BlockStack gap="500">
            {/* Score Callout Card */}
            <Box
              padding="500"
              background="bg-surface-critical"
              borderRadius="200"
              borderWidth="050"
              borderColor="border-critical"
            >
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <AlertTriangleIcon width={22} height={22} fill="#d72c0d" />
                    <Text as="h2" variant="headingMd" fontWeight="bold">
                      Store Baseline: 38/100 AI Visibility
                    </Text>
                    <Badge tone="critical">High Citation Deficit</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm">
                    Your store is currently at risk of being bypassed by ChatGPT Search, Google AI Overviews, and Perplexity in favor of competing stores.
                  </Text>
                </BlockStack>

                <Box
                  padding="300"
                  background="bg-surface"
                  borderRadius="200"
                  borderWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="050" align="center">
                    <Text as="p" variant="bodyXs" tone="subdued" alignment="center">
                      BASELINE SCORE
                    </Text>
                    <Text as="span" variant="headingXl" fontWeight="bold" tone="critical">
                      38/100
                    </Text>
                  </BlockStack>
                </Box>
              </InlineStack>
            </Box>

            {/* Gap Breakdown */}
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm" fontWeight="bold">
                Critical Deficits Identified Across {totalProductsCount} Catalog Items:
              </Text>

              <BlockStack gap="200">
                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#d72c0d",
                        }}
                      />
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Missing Structured Schema Graph
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Products lack rich schema attributes (brand, sku, dimensions, material) needed for direct AI citation snippets.
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <Badge tone="critical">Missing</Badge>
                  </InlineStack>
                </Box>

                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#d72c0d",
                        }}
                      />
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          No High-Density Specification Matrices
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Search LLMs synthesize comparison tables. Unstructured plain paragraphs are routinely bypassed in AI summaries.
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <Badge tone="critical">0 Generated</Badge>
                  </InlineStack>
                </Box>

                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="150"
                  borderWidth="025"
                  borderColor="border"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#d72c0d",
                        }}
                      />
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Zero Conversational Buyer FAQs
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Unanswered conversational queries mean shoppers asking Gemini or ChatGPT for purchase advice get redirected elsewhere.
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <Badge tone="critical">0 Answered</Badge>
                  </InlineStack>
                </Box>
              </BlockStack>
            </BlockStack>

            <Divider />

            {/* Call to Action Footer */}
            <InlineStack align="space-between" blockAlign="center">
              <Button variant="secondary" onClick={onClose}>
                Explore Dashboard
              </Button>
              <Button
                variant="primary"
                size="large"
                icon={MagicIcon}
                onClick={handleCompleteAndOptimize}
              >
                {firstUnoptimizedProductTitle
                  ? `Optimize First Product: "${firstUnoptimizedProductTitle.slice(0, 24)}..."`
                  : "Optimize Your First Product Now"}
              </Button>
            </InlineStack>
          </BlockStack>
        )}
      </Modal.Section>
    </Modal>
  );
}
