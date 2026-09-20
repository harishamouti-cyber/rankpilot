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
  Button,
} from "@shopify/polaris";
import { MagicIcon, SearchIcon } from "@shopify/polaris-icons";
import { ShopifyProductItem } from "~/services/shopify.server";
import { CompetitorExtractedData } from "~/services/competitor.server";

interface CompetitorModalProps {
  open: boolean;
  onClose: () => void;
  product: ShopifyProductItem | null;
  onExtractAndOptimize: (product: ShopifyProductItem, competitorInput: string) => Promise<void>;
  isLoading: boolean;
  extractedData: CompetitorExtractedData | null;
}

export function CompetitorModal({
  open,
  onClose,
  product,
  onExtractAndOptimize,
  isLoading,
  extractedData,
}: CompetitorModalProps) {
  const [inputVal, setInputVal] = useState("https://www.amazon.com/dp/B0CX234LMN");

  if (!product) return null;

  const handleExtract = () => {
    let cleanInput = inputVal.trim();
    // If user enters an Amazon ASIN directly (e.g. 10 chars like B0CX234LMN)
    if (/^[A-Z0-9]{10}$/i.test(cleanInput)) {
      cleanInput = `https://www.amazon.com/dp/${cleanInput}`;
    }
    onExtractAndOptimize(product, cleanInput);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Competitor Gap Stealer: ${product.title}`}
      primaryAction={{
        content: isLoading ? "Extracting & Closing Gap..." : "Extract Ranking Entities & Optimize",
        loading: isLoading,
        disabled: !inputVal.trim() || isLoading,
        onAction: handleExtract,
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
              Paste the URL of any winning competitor product (Amazon listing, DTC Shopify competitor, or Amazon ASIN).
              RankPilot extracts their highest-ranking semantic entities, spec tables, and keywords, then rewrites your copy to outrank them.
            </Text>
          </Banner>

          <TextField
            label="Paste Competitor Product URL or Amazon ASIN"
            value={inputVal}
            onChange={setInputVal}
            autoComplete="off"
            placeholder="e.g. B0CX234LMN or https://www.amazon.com/dp/..."
            helpText="Accepts full product URLs from Amazon, Nike, Apple, Nomad, or standalone 10-character Amazon ASINs."
          />

          {extractedData && (
            <Card background="bg-surface-secondary">
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Extracted Ranking Entities
                    </Text>
                    <Badge tone="success">{extractedData.domain}</Badge>
                  </InlineStack>
                  <Badge tone="info">Keywords Merged into Diff</Badge>
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
                    High-Intent Keywords Captured:
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
                      Competitor Claims Identified &amp; Closed:
                    </Text>
                    <Box padding="200" background="bg-surface" borderRadius="150">
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {extractedData.features.slice(0, 4).map((f, i) => (
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
