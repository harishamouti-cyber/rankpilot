import React from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  ProgressBar,
  Box,
  Divider,
} from "@shopify/polaris";
import { CheckCircleIcon, MagicIcon, ShieldCheckMarkIcon } from "@shopify/polaris-icons";
import { ShopifyProductItem } from "~/services/shopify.server";

interface OnboardingCardProps {
  unoptimizedCount: number;
  totalCount: number;
  firstUnoptimizedProduct: ShopifyProductItem | null;
  onOptimizeFirst: (product: ShopifyProductItem) => void;
  onActivateAutopilot: () => void;
  isAutopilotActive: boolean;
  isOptimizing: boolean;
}

export function OnboardingCard({
  unoptimizedCount,
  totalCount,
  firstUnoptimizedProduct,
  onOptimizeFirst,
  onActivateAutopilot,
  isAutopilotActive,
  isOptimizing,
}: OnboardingCardProps) {
  const optimizedCount = totalCount - unoptimizedCount;
  const step1Complete = true; // Baseline scan completed on install
  const step2Complete = optimizedCount > 0;
  const step3Complete = isAutopilotActive && step2Complete;

  const completedSteps = (step1Complete ? 1 : 0) + (step2Complete ? 1 : 0) + (step3Complete ? 1 : 0);
  const progressPercent = Math.round((completedSteps / 3) * 100);

  return (
    <Card background="bg-surface">
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="050">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingMd" fontWeight="bold">
                RankPilot Setup: 3 Steps to AI & Google Dominance
              </Text>
              <Badge tone="attention">{`${unoptimizedCount} Products Need GEO`}</Badge>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Complete these 3 foundational setup steps to get your catalog cited by ChatGPT Search, Perplexity, and Google AI Overviews.
            </Text>
          </BlockStack>

          <Box minWidth="160px">
            <BlockStack gap="100">
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  Setup Progress
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {completedSteps}/3 Done
                </Text>
              </InlineStack>
              <ProgressBar progress={progressPercent} tone="primary" size="small" />
            </BlockStack>
          </Box>
        </InlineStack>

        <Divider />

        <InlineStack gap="400" align="space-between">
          {/* Step 1 */}
          <Box
            width="31%"
            padding="300"
            background="bg-surface-secondary"
            borderRadius="200"
            borderWidth="025"
            borderColor="border"
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm" fontWeight="bold">
                  Step 1: Baseline Audit
                </Text>
                <Badge tone="success" size="small">Completed</Badge>
              </InlineStack>
              <InlineStack gap="150" blockAlign="center">
                <CheckCircleIcon width={18} height={18} fill="#008060" />
                <Text as="p" variant="bodySm">
                  {totalCount} products cataloged &amp; scanned for GEO gaps.
                </Text>
              </InlineStack>
            </BlockStack>
          </Box>

          {/* Step 2 */}
          <Box
            width="31%"
            padding="300"
            background={step2Complete ? "bg-surface-secondary" : "bg-surface-active"}
            borderRadius="200"
            borderWidth="050"
            borderColor={step2Complete ? "border" : "border-emphasis"}
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm" fontWeight="bold">
                  Step 2: Optimize First SKU
                </Text>
                {step2Complete ? (
                  <Badge tone="success" size="small">Completed</Badge>
                ) : (
                  <Badge tone="attention" size="small">Action Required</Badge>
                )}
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                {step2Complete
                  ? `First product optimized with CTR title & Spec Matrix.`
                  : firstUnoptimizedProduct
                  ? `Optimize "${firstUnoptimizedProduct.title.slice(0, 30)}..."`
                  : "Optimize a high-value product to generate proof."}
              </Text>
              {!step2Complete && firstUnoptimizedProduct && (
                <Button
                  variant="primary"
                  icon={MagicIcon}
                  size="slim"
                  loading={isOptimizing}
                  onClick={() => onOptimizeFirst(firstUnoptimizedProduct)}
                >
                  Optimize First Product (3s)
                </Button>
              )}
            </BlockStack>
          </Box>

          {/* Step 3 */}
          <Box
            width="31%"
            padding="300"
            background="bg-surface-secondary"
            borderRadius="200"
            borderWidth="025"
            borderColor="border"
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm" fontWeight="bold">
                  Step 3: Autopilot Guard
                </Text>
                {step3Complete ? (
                  <Badge tone="success" size="small">Active</Badge>
                ) : (
                  <Badge tone="info" size="small">Ready</Badge>
                )}
              </InlineStack>
              <InlineStack gap="150" blockAlign="center">
                <ShieldCheckMarkIcon width={18} height={18} fill={step3Complete ? "#008060" : "#5c5f62"} />
                <Text as="p" variant="bodySm">
                  24/7 inventory drift monitoring &amp; auto-IndexNow pings.
                </Text>
              </InlineStack>
              {!step3Complete && (
                <Button
                  variant="secondary"
                  size="slim"
                  onClick={onActivateAutopilot}
                >
                  Activate Autopilot Guard
                </Button>
              )}
            </BlockStack>
          </Box>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
