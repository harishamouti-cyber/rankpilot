import React, { useState } from "react";
import {
  Modal,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Banner,
} from "@shopify/polaris";
import { SearchIcon, MagicIcon, CheckCircleIcon } from "@shopify/polaris-icons";
import { StrikingQuery } from "~/services/gsc.server";

interface StrikingQueriesModalProps {
  open: boolean;
  onClose: () => void;
  queries: StrikingQuery[];
  shop?: string;
  onQueryBoosted?: (productId: string, query: string, newTitle: string) => void;
}

export function StrikingQueriesModal({
  open,
  onClose,
  queries: initialQueries,
  shop = "demo.myshopify.com",
  onQueryBoosted,
}: StrikingQueriesModalProps) {
  const [queries, setQueries] = useState<StrikingQuery[]>(initialQueries);
  const [boostingId, setBoostingId] = useState<string | null>(null);
  const [boostedMessage, setBoostedMessage] = useState<string | null>(null);

  // Sync state if initialQueries changes
  React.useEffect(() => {
    setQueries(initialQueries);
  }, [initialQueries]);

  const handleBoost = async (queryItem: StrikingQuery) => {
    setBoostingId(queryItem.id);
    setBoostedMessage(null);

    try {
      const response = await fetch("/api/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          productId: queryItem.productId,
          query: queryItem.query,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setQueries((prev) =>
          prev.map((q) =>
            q.id === queryItem.id ? { ...q, status: "BOOSTED" as const } : q
          )
        );
        setBoostedMessage(
          `Successfully boosted "${queryItem.query}"! New title: "${data.newTitle}"`
        );
        if (onQueryBoosted) {
          onQueryBoosted(queryItem.productId, queryItem.query, data.newTitle);
        }
      }
    } catch (err) {
      console.error("Boost failed:", err);
    } finally {
      setBoostingId(null);
    }
  };

  const resourceName = {
    singular: "query",
    plural: "queries",
  };

  const rowMarkup = queries.map((item, index) => (
    <IndexTable.Row id={item.id} key={item.id} position={index}>
      <IndexTable.Cell>
        <BlockStack gap="050">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {item.query}
          </Text>
          <Text as="span" variant="bodyXs" tone="subdued">
            Target SKU: {item.productId.split("/").pop()}
          </Text>
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">{`#${item.position.toFixed(1)}`}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" numeric>
          {item.impressions.toLocaleString()}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" numeric>
          {`${(item.ctr * 100).toFixed(1)}%`}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {item.status === "BOOSTED" ? (
          <Badge tone="success" icon={CheckCircleIcon}>
            Boosted to Page 1
          </Badge>
        ) : (
          <Badge tone="warning">Striking Distance</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          size="micro"
          variant={item.status === "BOOSTED" ? "secondary" : "primary"}
          icon={MagicIcon}
          disabled={item.status === "BOOSTED"}
          loading={boostingId === item.id}
          onClick={() => handleBoost(item)}
        >
          {item.status === "BOOSTED" ? "Boosted" : "Boost to Page 1"}
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Google Search Console: Striking Distance Radar"
      size="large"
      primaryAction={{
        content: "Done",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {boostedMessage && (
            <Banner
              tone="success"
              onDismiss={() => setBoostedMessage(null)}
            >
              <Text as="p" variant="bodySm">
                {boostedMessage}
              </Text>
            </Banner>
          )}

          <Banner tone="info">
            <Text as="p" variant="bodySm">
              These high-intent search queries currently rank between positions <strong>#4 and #15</strong> with over 100 search impressions. 
              Clicking <strong>&ldquo;Boost to Page 1&rdquo;</strong> dynamically injects the query entity into your product schema and title to capture top-3 organic clicks.
            </Text>
          </Banner>

          <Card padding="0">
            <IndexTable
              resourceName={resourceName}
              itemCount={queries.length}
              headings={[
                { title: "Query Phrase" },
                { title: "GSC Rank" },
                { title: "Monthly Impr." },
                { title: "CTR" },
                { title: "Status" },
                { title: "Action" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
