import React, { useState } from "react";
import {
  Modal,
  TextField,
  BlockStack,
  Text,
  Badge,
  InlineStack,
  Card,
  Box,
  Banner,
  Divider,
} from "@shopify/polaris";
import { ShopifyProductItem } from "~/services/shopify.server";
import { CompetitorExtractedData } from "~/services/competitor.server";

interface CompetitorStealerModalProps {
  open: boolean;
  onClose: () => void;
  product: ShopifyProductItem | null;
  onRunGapStealer: (product: ShopifyProductItem, competitorUrl: string) => Promise<void>;
  isLoading: boolean;
  extractedData: CompetitorExtractedData | null;
}

export function CompetitorStealerModal({
  open,
  onClose,
  product,
  onRunGapStealer,
  isLoading,
  extractedData,
}: CompetitorStealerModalProps) {
  const [url, setUrl] = useState("https://www.amazon.com/dp/B0CX234LMN");

  if (!product) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Competitor Gap Stealer — ${product.title}`}
      primaryAction={{
        content: isLoading ? "Analyzing & Stealing Angle..." : "Steal Ranking Angle & Optimize",
        loading: isLoading,
        disabled: !url.trim() || isLoading,
        onAction: () => onRunGapStealer(product, url.trim()),
      }}
      secondaryActions={[
        {
          content: "Close",
          onAction: onClose,
          disabled: isLoading,
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info">
            <Text as="p" variant="bodySm">
              Paste the URL of any top-ranking competitor product (Amazon, DTC Shopify store, or category leader).
              RankPilot will extract their core semantic entities, high-converting feature bullets, and search keywords,
              then rewrite your product copy to outrank them on Google and Generative AI engines.
            </Text>
          </Banner>

          <TextField
            label="Competitor Product URL (Amazon, Shopify, or Brand Store)"
            value={url}
            onChange={setUrl}
            autoComplete="off"
            placeholder="https://www.amazon.com/dp/... or https://competitor.com/products/..."
            helpText="Supports full URL paths from Amazon, Nike, Apple, Nomad, or any e-commerce competitor."
          />

          {extractedData && (
            <Card background="bg-surface-secondary">
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm" fontWeight="bold">
                    Extracted Competitor Intelligence
                  </Text>
                  <Badge tone="success">{extractedData.domain}</Badge>
                </InlineStack>

                <Divider />

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Competitor Title:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {extractedData.title}
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Top Ranking Semantic Keywords Extracted:
                  </Text>
                  <InlineStack gap="100" wrap>
                    {extractedData.extractedKeywords.map((kw, i) => (
                      <Badge key={i} tone="info">
                        {`+${kw}`}
                      </Badge>
                    ))}
                  </InlineStack>
                </BlockStack>

                {extractedData.features.length > 0 && (
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      Key Competitor Claim Bullets:
                    </Text>
                    <Box padding="200" background="bg-surface" borderRadius="150">
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {extractedData.features.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </Box>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
