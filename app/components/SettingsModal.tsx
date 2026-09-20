import React, { useState } from "react";
import {
  Modal,
  TextField,
  Checkbox,
  BlockStack,
  Text,
  Badge,
  InlineStack,
  Banner,
  Divider,
  Button,
} from "@shopify/polaris";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  geminiApiKey: string;
  indexNowKey: string;
  autoPing: boolean;
  storeDomain: string;
  onSave: (settings: {
    geminiApiKey: string;
    indexNowKey: string;
    autoPing: boolean;
    storeDomain: string;
  }) => Promise<void>;
  onTestIndexNow: (domain: string, key: string) => Promise<void>;
  isSaving: boolean;
  isTestingPing: boolean;
}

export function SettingsModal({
  open,
  onClose,
  geminiApiKey: initialGeminiKey,
  indexNowKey: initialIndexKey,
  autoPing: initialAutoPing,
  storeDomain: initialStoreDomain,
  onSave,
  onTestIndexNow,
  isSaving,
  isTestingPing,
}: SettingsModalProps) {
  const [geminiKey, setGeminiKey] = useState(initialGeminiKey);
  const [indexKey, setIndexKey] = useState(initialIndexKey);
  const [autoPing, setAutoPing] = useState(initialAutoPing);
  const [storeDomain, setStoreDomain] = useState(initialStoreDomain || "store.myshopify.com");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="RankPilot Engine & API Settings"
      primaryAction={{
        content: isSaving ? "Saving..." : "Save Settings",
        loading: isSaving,
        onAction: () =>
          onSave({
            geminiApiKey: geminiKey,
            indexNowKey: indexKey,
            autoPing,
            storeDomain,
          }),
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info">
            <Text as="p" variant="bodySm">
              Configure your Google Gemini API credentials and IndexNow search engine protocol keys.
              RankPilot includes automatic fallback generation if no API key is provided.
            </Text>
          </Banner>

          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm" fontWeight="bold">
                Google GenAI / Gemini Engine
              </Text>
              <Badge tone="success">Gemini 2.5 Flash / 3.8 Flash Ready</Badge>
            </InlineStack>
            <TextField
              label="Gemini API Key"
              type="password"
              value={geminiKey}
              onChange={setGeminiKey}
              autoComplete="off"
              placeholder="AIzaSy..."
              helpText="Leave blank to use server environment variable GEMINI_API_KEY or built-in fallback."
            />
          </BlockStack>

          <Divider />

          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm" fontWeight="bold">
                IndexNow Protocol Configuration
              </Text>
              <Badge tone="info">Instant Bing & Perplexity Crawler</Badge>
            </InlineStack>

            <TextField
              label="Store Domain"
              value={storeDomain}
              onChange={setStoreDomain}
              autoComplete="off"
              placeholder="brandstore.com"
              helpText="The primary domain where your Shopify product pages are served."
            />

            <TextField
              label="IndexNow API Key"
              value={indexKey}
              onChange={setIndexKey}
              autoComplete="off"
              placeholder="rankpilot_indexnow_key"
              helpText="IndexNow key verified on your host (e.g., https://your-store.com/{key}.txt)"
            />

            <Checkbox
              label="Automatically ping IndexNow whenever a product is optimized or restored"
              checked={autoPing}
              onChange={setAutoPing}
            />

            <InlineStack align="start">
              <Button
                variant="secondary"
                loading={isTestingPing}
                onClick={() => onTestIndexNow(storeDomain, indexKey)}
              >
                Send Test Ping to api.indexnow.org
              </Button>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
