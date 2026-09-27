import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator, useNavigate } from "@remix-run/react";
import React, { useState } from "react";
import {
  Page,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Banner,
  Divider,
  Card,
  Icon,
} from "@shopify/polaris";
import { CheckIcon, CreditCardIcon } from "@shopify/polaris-icons";
import { getCurrentPlan, confirmShopPlan, cancelAppSubscription, PLANS, PlanDefinition } from "~/services/billing.server";
import { authenticate } from "~/shopify.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") || "demo.myshopify.com";
  try {
    const auth = await authenticate.admin(request);
    if (auth.session?.shop) {
      shop = auth.session.shop;
    }
  } catch {}

  const confirmed = url.searchParams.get("confirmed");
  const chargeId = url.searchParams.get("charge_id");

  if (confirmed === "true") {
    await confirmShopPlan(shop, "PRO", chargeId || undefined);
  }

  const currentPlan = await getCurrentPlan(shop);
  const setting = await db.appSetting.findUnique({ where: { shop } });
  const hasActiveSubscription = Boolean(setting?.subscriptionId && setting?.status === "ACTIVE");

  return json({
    shop,
    currentPlan,
    plans: PLANS,
    hasActiveSubscription,
    subscriptionId: setting?.subscriptionId || null,
    trialEndsAt: setting?.trialEndsAt?.toISOString() || null,
    justConfirmed: confirmed === "true",
  });
};

async function appFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  try {
    if (typeof window !== "undefined" && (window as any).shopify?.idToken) {
      const token = await (window as any).shopify.idToken();
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
  } catch (e) {
    console.warn("[appFetch] Could not get App Bridge idToken:", e);
  }
  return fetch(url, { ...options, headers });
}

export default function BillingPage() {
  const { shop, currentPlan, plans, hasActiveSubscription, subscriptionId, trialEndsAt, justConfirmed } =
    useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(
    justConfirmed ? "✓ Welcome to RankPilot Pro! Your 7-day free trial is now active." : null
  );

  const proPlan = plans.PRO || {
    id: "PRO",
    name: "RankPilot Pro",
    price: 29,
    interval: "EVERY_30_DAYS",
    currency: "USD",
    productLimit: 1000000,
    trialDays: 7,
    features: [],
  };

  const handleStartTrial = async () => {
    setIsUpdating(true);
    try {
      const res = await appFetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          planId: "PRO",
          action: "create_subscription",
          returnUrl: `${window.location.origin}/app/billing?shop=${encodeURIComponent(shop)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate subscription");

      if (data.confirmationUrl) {
        if (data.confirmationUrl.startsWith("http")) {
          // Native Shopify Recurring Charge Confirmation URL
          if (window.top) {
            window.top.location.href = data.confirmationUrl;
          } else {
            window.location.href = data.confirmationUrl;
          }
        } else {
          navigate(data.confirmationUrl);
        }
      } else {
        setToastMessage("✓ Successfully activated RankPilot Pro with 7-day free trial!");
        revalidator.revalidate();
      }
    } catch (err: any) {
      alert(`Billing error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your RankPilot Pro subscription?")) return;
    setIsCanceling(true);
    try {
      const res = await appFetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          action: "cancel",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel subscription");
      setToastMessage("Subscription canceled. You will not be billed.");
      revalidator.revalidate();
    } catch (err: any) {
      alert(`Cancel error: ${err.message}`);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <Page
      title="Plans & Subscription"
      subtitle="Unlock automated Google AI Overviews, Perplexity citations, and full catalog GEO optimization."
      backAction={{
        content: "Back to Dashboard",
        onAction: () => navigate(`/app?shop=${encodeURIComponent(shop)}`),
      }}
    >
      <BlockStack gap="500">
        {toastMessage && (
          <Banner tone="success" onDismiss={() => setToastMessage(null)}>
            <Text as="p" variant="bodyMd">
              {toastMessage}
            </Text>
          </Banner>
        )}

        <Banner tone="info">
          <Text as="p" variant="bodySm">
            All subscription charges are handled natively through Shopify's secure billing system. Every new merchant
            receives a <strong>risk-free 7-day trial</strong>. You can cancel at any time directly in your Shopify Admin
            with zero lock-in or penalties.
          </Text>
        </Banner>

        <div style={{ maxWidth: "680px", margin: "0 auto", width: "100%" }}>
          <Box
            padding="600"
            background="bg-surface"
            borderRadius="400"
            borderWidth="050"
            borderColor={hasActiveSubscription ? "border-success" : "border-emphasis"}
            shadow="300"
          >
            <BlockStack gap="500">
              {/* Header with Title and Badges */}
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingXl" fontWeight="bold">
                    RankPilot Pro
                  </Text>
                  <Badge tone="attention" size="small">
                    7-Day Free Trial
                  </Badge>
                </InlineStack>

                {hasActiveSubscription ? (
                  <Badge tone="success" size="medium">
                    Active Plan
                  </Badge>
                ) : (
                  <Badge tone="info" size="medium">
                    Recommended
                  </Badge>
                )}
              </InlineStack>

              {/* Price & Guarantee */}
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <InlineStack gap="100" blockAlign="baseline">
                      <Text as="span" variant="heading3xl" fontWeight="bold">
                        $29
                      </Text>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        / month (USD)
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Includes 7-Day Free Trial • Cancel anytime with 1 click
                    </Text>
                  </BlockStack>
                  <div style={{ textAlign: "right" }}>
                    <Text as="p" variant="bodyXs" fontWeight="semibold" tone="success">
                      ✓ No upfront charge today
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      Billed on your Shopify invoice
                    </Text>
                  </div>
                </InlineStack>
              </Box>

              <Divider />

              {/* Comprehensive Feature Checklist */}
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm" fontWeight="semibold">
                  Everything Included in RankPilot Pro:
                </Text>

                {[
                  "Full Catalog AI Search & Schema Optimization (Unlimited SKUs)",
                  "Google AI Overview & Generative Spec Matrices for all products",
                  "High-Converting Buyer FAQ Generator tailored for voice & AI search",
                  "Schema.org JSON-LD Rich Data injected automatically into products",
                  "Instant Real-Time IndexNow Crawler Submissions (Bing, Yandex, Copilot)",
                  "1-Click Rollback Snapshot Engine with permanent version control",
                  "24/7 Autopilot Catalog Sentinel (Schema drift & out-of-stock guard)",
                  "Competitor Semantic Gap Stealer (Analyze Amazon & DTC competitors)",
                  "Zero Storefront Speed Impact (100% background processing via Shopify API)",
                ].map((feature, idx) => (
                  <InlineStack key={idx} gap="300" blockAlign="center">
                    <div style={{ color: "#008060", display: "flex", alignItems: "center" }}>
                      <CheckIcon width={18} height={18} fill="#008060" />
                    </div>
                    <Text as="span" variant="bodyMd">
                      {feature}
                    </Text>
                  </InlineStack>
                ))}
              </BlockStack>

              <Divider />

              {/* Action Buttons */}
              {hasActiveSubscription ? (
                <BlockStack gap="300">
                  <Box padding="300" background="bg-surface-success" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="050">
                        <Text as="p" variant="bodySm" fontWeight="bold">
                          ✓ RankPilot Pro Active
                        </Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          {trialEndsAt
                            ? `Free trial active until ${new Date(trialEndsAt).toLocaleDateString()}`
                            : "Subscription active on Shopify billing"}
                        </Text>
                      </BlockStack>
                      {subscriptionId && (
                        <Text as="span" variant="bodyXs" tone="subdued">
                          Ref: {subscriptionId.slice(-10)}
                        </Text>
                      )}
                    </InlineStack>
                  </Box>

                  <InlineStack align="space-between" blockAlign="center">
                    <Button variant="secondary" onClick={() => navigate(`/app?shop=${encodeURIComponent(shop)}`)}>
                      Back to Dashboard
                    </Button>
                    <Button
                      variant="plain"
                      tone="critical"
                      loading={isCanceling}
                      onClick={handleCancelSubscription}
                    >
                      Cancel Subscription
                    </Button>
                  </InlineStack>
                </BlockStack>
              ) : (
                <BlockStack gap="300">
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    loading={isUpdating}
                    onClick={handleStartTrial}
                  >
                    Start 7-Day Free Trial ($29/month)
                  </Button>
                  <Text as="p" variant="bodyXs" alignment="center" tone="subdued">
                    You won't be charged today. 7 full days of unrestricted access, then $29/mo billed directly to your Shopify
                    account. Cancel anytime with 1 click.
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          </Box>
        </div>
      </BlockStack>
    </Page>
  );
}
