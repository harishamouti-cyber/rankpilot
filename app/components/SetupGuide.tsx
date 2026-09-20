import React, { useState } from "react";
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
  Collapsible,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  MagicIcon,
  ShieldCheckMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XSmallIcon,
} from "@shopify/polaris-icons";
import { ShopifyProductItem } from "~/services/shopify.server";

interface SetupGuideProps {
  totalCount: number;
  unoptimizedCount: number;
  firstUnoptimizedProduct: ShopifyProductItem | null;
  onOpenDiff: (product: ShopifyProductItem) => void;
  onActivateAutopilot: () => void;
  isAutopilotActive: boolean;
  isOptimizing?: boolean;
  onDismiss: () => void;
  onReplayOnboarding?: () => void;
}

export function SetupGuide({
  totalCount,
  unoptimizedCount,
  firstUnoptimizedProduct,
  onOpenDiff,
  onActivateAutopilot,
  isAutopilotActive,
  isOptimizing = false,
  onDismiss,
  onReplayOnboarding,
}: SetupGuideProps) {
  const [isOpen, setIsOpen] = useState(true);

  const step1Complete = true; // Catalog Synced on install
  const step2Complete = totalCount > 0 && unoptimizedCount < totalCount;
  const step3Complete = isAutopilotActive && (step2Complete || unoptimizedCount === 0);

  const completedCount = (step1Complete ? 1 : 0) + (step2Complete ? 1 : 0) + (step3Complete ? 1 : 0);
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <Card background="bg-surface">
      <BlockStack gap="400">
        {/* Card Header */}
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="300" blockAlign="center">
            <BlockStack gap="050">
              <InlineStack gap="200" blockAlign="center" wrap={true}>
                <Text as="h2" variant="headingMd" fontWeight="bold">
                  RankPilot Quick-Start Setup
                </Text>
                <Badge tone="info">{`${completedCount} of 3 completed`}</Badge>
                {completedCount === 3 ? (
                  <Badge tone="success">Setup Complete</Badge>
                ) : (
                  <Badge tone="attention">{`${3 - completedCount} Steps Remaining`}</Badge>
                )}
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Complete these 3 foundational setup steps to get your catalog cited by ChatGPT Search, Perplexity, and Google AI Overviews.
              </Text>
            </BlockStack>
          </InlineStack>

          <InlineStack gap="300" blockAlign="center">
            <Box minWidth="160px">
              <BlockStack gap="100">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" fontWeight="semibold">
                    Progress
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {progressPercent}%
                  </Text>
                </InlineStack>
                <ProgressBar
                  progress={progressPercent}
                  tone={completedCount === 3 ? "success" : "primary"}
                  size="small"
                />
              </BlockStack>
            </Box>

            <InlineStack gap="100" blockAlign="center">
              {onReplayOnboarding && (
                <Button
                  variant="plain"
                  size="slim"
                  onClick={onReplayOnboarding}
                >
                  Replay Scan
                </Button>
              )}
              <Button
                variant="plain"
                icon={isOpen ? ChevronUpIcon : ChevronDownIcon}
                accessibilityLabel={isOpen ? "Collapse setup guide" : "Expand setup guide"}
                onClick={() => setIsOpen(!isOpen)}
              />
              <Button
                variant="plain"
                icon={XSmallIcon}
                accessibilityLabel="Dismiss setup guide"
                onClick={onDismiss}
              />
            </InlineStack>
          </InlineStack>
        </InlineStack>

        <Collapsible id="setup-guide-collapsible" open={isOpen} transition={{ duration: "200ms", timingFunction: "ease-in-out" }}>
          <BlockStack gap="400">
            <Divider />

            <InlineStack gap="400" align="space-between">
              {/* STEP 1: CATALOG SYNCED */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Step 1: Catalog Synced
                    </Text>
                    <Badge tone="success" size="small">Completed</Badge>
                  </InlineStack>

                  <InlineStack gap="150" blockAlign="start">
                    <CheckCircleIcon width={18} height={18} fill="#008060" />
                    <Text as="p" variant="bodySm">
                      {totalCount} products imported and indexed into RankPilot's GEO monitoring graph.
                    </Text>
                  </InlineStack>

                  <Text as="p" variant="bodyXs" tone="subdued">
                    Zero-overhead GraphQL connection active.
                  </Text>
                </BlockStack>
              </Box>

              {/* STEP 2: OPTIMIZE FIRST PRODUCT */}
              <Box
                width="31%"
                padding="400"
                background={step2Complete ? "bg-surface-secondary" : "bg-surface-active"}
                borderRadius="200"
                borderWidth="050"
                borderColor={step2Complete ? "border" : "border-emphasis"}
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Step 2: Optimize First Product
                    </Text>
                    {step2Complete ? (
                      <Badge tone="success" size="small">Completed</Badge>
                    ) : (
                      <Badge tone="attention" size="small">Action Required</Badge>
                    )}
                  </InlineStack>

                  <Text as="p" variant="bodySm" tone="subdued">
                    {step2Complete
                      ? "First product successfully enriched with high-density spec matrix & schema."
                      : firstUnoptimizedProduct
                      ? `Enrich "${firstUnoptimizedProduct.title.slice(0, 26)}..." with search-intent titles & FAQs.`
                      : "Enrich unranked products with search-intent titles, spec tables, and buyer FAQs."}
                  </Text>

                  {!step2Complete && firstUnoptimizedProduct ? (
                    <Button
                      variant="primary"
                      icon={MagicIcon}
                      size="slim"
                      loading={isOptimizing}
                      onClick={() => onOpenDiff(firstUnoptimizedProduct)}
                    >
                      Open Diff
                    </Button>
                  ) : (
                    <InlineStack gap="150" blockAlign="center">
                      <CheckCircleIcon width={18} height={18} fill="#008060" />
                      <Text as="p" variant="bodySm" tone="success">
                        First product live &amp; cited
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </Box>

              {/* STEP 3: ACTIVATE AUTOPILOT GUARD */}
              <Box
                width="31%"
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Step 3: Activate Autopilot Guard
                    </Text>
                    {step3Complete ? (
                      <Badge tone="success" size="small">Active</Badge>
                    ) : (
                      <Badge tone="info" size="small">Ready</Badge>
                    )}
                  </InlineStack>

                  <InlineStack gap="150" blockAlign="start">
                    <ShieldCheckMarkIcon width={18} height={18} fill={step3Complete ? "#008060" : "#5c5f62"} />
                    <Text as="p" variant="bodySm">
                      24/7 background drift detection, inventory-aware schemas, and instant IndexNow pings.
                    </Text>
                  </InlineStack>

                  {!step3Complete ? (
                    <Button
                      variant="secondary"
                      size="slim"
                      icon={ShieldCheckMarkIcon}
                      onClick={onActivateAutopilot}
                    >
                      Enable
                    </Button>
                  ) : (
                    <InlineStack gap="150" blockAlign="center">
                      <CheckCircleIcon width={18} height={18} fill="#008060" />
                      <Text as="p" variant="bodySm" tone="success">
                        24/7 Guard Active
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </Box>
            </InlineStack>
          </BlockStack>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}
