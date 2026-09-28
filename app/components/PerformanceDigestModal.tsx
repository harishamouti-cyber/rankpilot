import React from "react";
import {
  Modal,
  Card,
  Text,
  Badge,
  InlineStack,
  BlockStack,
  Box,
  Divider,
  Banner,
} from "@shopify/polaris";

export interface PerformanceDigestData {
  weekStartDate: string;
  weeklyPings: number;
  totalPings: number;
  optimizedProductsCount: number;
  totalProductsCount: number;
  backupSnapshotsCount: number;
  weeklyBackupsCount: number;
  syncFrequency: string;
  autopilotStatus: string;
}

interface PerformanceDigestModalProps {
  open: boolean;
  onClose: () => void;
  digest: PerformanceDigestData | null;
}

export function PerformanceDigestModal({
  open,
  onClose,
  digest,
}: PerformanceDigestModalProps) {
  const data = digest || {
    weekStartDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    weeklyPings: 0,
    totalPings: 0,
    optimizedProductsCount: 0,
    totalProductsCount: 0,
    backupSnapshotsCount: 0,
    weeklyBackupsCount: 0,
    syncFrequency: "Real-Time (Continuous)",
    autopilotStatus: "Active (Monitoring 24/7)",
  };

  const hasActivity = data.weeklyPings > 0 || data.optimizedProductsCount > 0 || data.backupSnapshotsCount > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Weekly Performance & AEO Impact Digest"
      size="large"
      primaryAction={{
        content: "Close",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Card background="bg-surface-secondary">
            <InlineStack align="space-between" blockAlign="center" wrap>
              <BlockStack gap="050">
                <Text as="h3" variant="headingMd" fontWeight="bold">
                  Store Catalog &amp; Search Indexing Digest
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  7-day catalog audit tracking real-time IndexNow submissions, live schema metafields, and rollback snapshots.
                </Text>
              </BlockStack>
              <Badge tone={hasActivity ? "success" : "info"} size="large">
                {hasActivity ? "Verified Store Activity" : "Collecting Initial 7-Day Data"}
              </Badge>
            </InlineStack>
          </Card>

          {!hasActivity && (
            <Banner tone="info">
              <Text as="p" variant="bodySm">
                Collecting initial 7-day data. As soon as you optimize products or push catalog changes to Shopify, your real-time IndexNow pings, backup revisions, and active metafields will be reported here.
              </Text>
            </Banner>
          )}

          <InlineStack gap="300" align="space-between" wrap={false}>
            <Box
              width="23%"
              padding="300"
              background="bg-surface"
              borderRadius="200"
              borderWidth="025"
              borderColor="border"
            >
              <BlockStack gap="100">
                <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                  INDEXNOW PINGS
                </Text>
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  {data.weeklyPings}
                </Text>
                <Text as="p" variant="bodyXs" tone="subdued">
                  {data.totalPings === 1 ? "1 total ping dispatched" : `${data.totalPings} total dispatched (Bing & Perplexity)`}
                </Text>
              </BlockStack>
            </Box>

            <Box
              width="23%"
              padding="300"
              background="bg-surface"
              borderRadius="200"
              borderWidth="025"
              borderColor="border"
            >
              <BlockStack gap="100">
                <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                  METAFIELDS ACTIVE
                </Text>
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  {`${data.optimizedProductsCount} / ${data.totalProductsCount}`}
                </Text>
                <Text as="p" variant="bodyXs" tone="subdued">
                  Live schema, specs &amp; FAQs
                </Text>
              </BlockStack>
            </Box>

            <Box
              width="23%"
              padding="300"
              background="bg-surface"
              borderRadius="200"
              borderWidth="025"
              borderColor="border"
            >
              <BlockStack gap="100">
                <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                  BACKUP SNAPSHOTS
                </Text>
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  {data.backupSnapshotsCount}
                </Text>
                <Text as="p" variant="bodyXs" tone="subdued">
                  {data.weeklyBackupsCount > 0
                    ? `${data.weeklyBackupsCount} created this week (1-Click Undo)`
                    : "Zero-risk rollback history"}
                </Text>
              </BlockStack>
            </Box>

            <Box
              width="23%"
              padding="300"
              background="bg-surface"
              borderRadius="200"
              borderWidth="025"
              borderColor="border"
            >
              <BlockStack gap="100">
                <Text as="p" variant="bodyXs" tone="subdued" fontWeight="medium">
                  SYNC FREQUENCY
                </Text>
                <Text as="h2" variant="headingLg" fontWeight="bold">
                  Instant
                </Text>
                <Text as="p" variant="bodyXs" tone="subdued">
                  {data.syncFrequency}
                </Text>
              </BlockStack>
            </Box>
          </InlineStack>

          <Card>
            <BlockStack gap="200">
              <Text as="h4" variant="headingSm" fontWeight="bold">
                Automated Safeguard Health
              </Text>
              <Divider />
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">
                  Zero-Click Autopilot Status
                </Text>
                <Badge tone="success">{data.autopilotStatus}</Badge>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">
                  Storefront Performance Impact
                </Text>
                <Badge tone="success">0ms (100% Metafield Execution)</Badge>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">
                  Search Engine Verification
                </Text>
                <Badge tone="info">IndexNow &amp; Google AI Synced</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
