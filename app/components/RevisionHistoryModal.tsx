import React from "react";
import {
  Modal,
  BlockStack,
  Text,
  Badge,
  InlineStack,
  Card,
  Button,
  Banner,
  Divider,
  EmptyState,
} from "@shopify/polaris";
import { UndoIcon } from "@shopify/polaris-icons";
import { ShopifyProductItem } from "~/services/shopify.server";

export interface RevisionItem {
  id: string;
  productId: string;
  titleSnapshot: string;
  bodyHtmlSnapshot?: string | null;
  seoTitleSnapshot?: string | null;
  seoDescriptionSnapshot?: string | null;
  rolledBack: boolean;
  createdAt: string;
}

interface RevisionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  product: ShopifyProductItem | null;
  revisions: RevisionItem[];
  isRollingBack: boolean;
  onRollback: (productId: string) => Promise<void>;
}

export function RevisionHistoryModal({
  open,
  onClose,
  product,
  revisions,
  isRollingBack,
  onRollback,
}: RevisionHistoryModalProps) {
  if (!product) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Revision Snapshots & Safety Engine — ${product.title}`}
      secondaryActions={[
        {
          content: "Close",
          onAction: onClose,
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info">
            <Text as="p" variant="bodySm">
              Every time RankPilot modifies a product, an immutable snapshot is preserved.
              You can instantly revert your product title, SEO description, and metafields to the original
              pre-AI state with a single click.
            </Text>
          </Banner>

          {revisions.length === 0 ? (
            <EmptyState
              heading="No revisions stored yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <Text as="p" variant="bodySm" tone="subdued">
                When you optimize this product with RankPilot, a snapshot of the current state will be saved here automatically.
              </Text>
            </EmptyState>
          ) : (
            <BlockStack gap="300">
              {revisions.map((rev, index) => (
                <Card key={rev.id} background={rev.rolledBack ? "bg-surface-secondary" : "bg-surface"}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingSm" fontWeight="bold">
                          Snapshot #{revisions.length - index}
                        </Text>
                        <span suppressHydrationWarning>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {new Date(rev.createdAt).toLocaleString()}
                          </Text>
                        </span>
                      </InlineStack>
                      {rev.rolledBack ? (
                        <Badge tone="attention">Already Restored</Badge>
                      ) : (
                        <Badge tone="success">Active Snapshot</Badge>
                      )}
                    </InlineStack>

                    <Divider />

                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        Original SEO Title:
                      </Text>
                      <Text as="p" variant="bodySm">
                        {rev.seoTitleSnapshot || rev.titleSnapshot}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        Original Meta Description:
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {rev.seoDescriptionSnapshot || "No previous meta description."}
                      </Text>
                    </BlockStack>

                    {!rev.rolledBack && (
                      <InlineStack align="end">
                        <Button
                          icon={UndoIcon}
                          tone="critical"
                          loading={isRollingBack}
                          disabled={isRollingBack}
                          onClick={() => onRollback(product.id)}
                        >
                          Restore to This Original Version
                        </Button>
                      </InlineStack>
                    )}
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
