import { useState } from "react";
import { Banner, BlockStack, Checkbox, Modal, Text } from "@shopify/polaris";
import { plainTextFromHtml, type CollectionSuggestion } from "~/services/collection_seo";

interface ComparisonFields {
  seoTitle: string;
  seoDescription: string;
  descriptionHtml: string;
}

interface CollectionSeoModalProps {
  open: boolean;
  collectionTitle: string;
  sampleData: boolean;
  current: ComparisonFields;
  suggestion: CollectionSuggestion;
  approving: boolean;
  error?: string | null;
  success?: string | null;
  onClose: () => void;
  onApprove: () => void;
}

function FieldColumn({ label, fields }: { label: string; fields: ComparisonFields }) {
  const rows = [
    ["SEO title", fields.seoTitle],
    ["Meta description", fields.seoDescription],
    ["Collection description", plainTextFromHtml(fields.descriptionHtml)],
  ];
  return (
    <BlockStack gap="400">
      <Text as="h3" variant="headingSm">
        {label}
      </Text>
      {rows.map(([name, value]) => (
        <BlockStack gap="200" key={name}>
          <Text as="p" variant="bodySm" tone="subdued">
            {name}
          </Text>
          <div className="rankpilot-relaxed" style={{ maxHeight: 160, overflow: "auto" }}>
            <Text as="p" variant="bodyMd">
              {value || "Empty"}
            </Text>
          </div>
        </BlockStack>
      ))}
    </BlockStack>
  );
}

export function CollectionSeoModal({
  open,
  collectionTitle,
  sampleData,
  current,
  suggestion,
  approving,
  error,
  success,
  onClose,
  onApprove,
}: CollectionSeoModalProps) {
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const approvalKey = `${collectionTitle}:${suggestion.seoTitle}:${suggestion.seoDescription}`;
  const checked = approvedId === approvalKey;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Review ${collectionTitle}`}
      primaryAction={{
        content: sampleData ? "Sample only" : "Approve and update this collection",
        disabled: sampleData || !checked || Boolean(success),
        loading: approving,
        onAction: () => {
          if (!sampleData && checked) onApprove();
        },
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose, disabled: approving }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {sampleData ? (
            <Banner tone="warning" title="Sample data">
              <p>These collections are not from a Shopify store. Nothing on this page is written to Shopify.</p>
            </Banner>
          ) : null}
          <Banner tone="info">
            <p>
              RankPilot does not guarantee rankings. This suggestion uses the collection text and{" "}
              {suggestion.productsUsed} member product{suggestion.productsUsed === 1 ? "" : "s"}
              {suggestion.productsTruncated ? " returned by Shopify. More products were not loaded." : "."}{" "}
              {suggestion.source === "gemini"
                ? "Optional wording was kept only when every word stayed inside those facts."
                : "The wording is assembled from those facts."}
            </p>
          </Banner>
          {error ? (
            <Banner tone="critical" title="Not written">
              <p>{error}</p>
            </Banner>
          ) : null}
          {success ? (
            <Banner tone="success" title="Updated">
              <p>{success}</p>
            </Banner>
          ) : null}
          <div className="rankpilot-pair-grid">
            <FieldColumn label="Current" fields={current} />
            <FieldColumn
              label="Suggested"
              fields={{
                seoTitle: suggestion.seoTitle,
                seoDescription: suggestion.seoDescription,
                descriptionHtml: suggestion.descriptionHtml,
              }}
            />
          </div>
          {sampleData ? null : (
            <Checkbox
              label="I approve writing this SEO title, meta description, and collection description to this collection only."
              checked={checked}
              disabled={Boolean(success) || approving}
              onChange={(next) => setApprovedId(next ? approvalKey : null)}
            />
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
