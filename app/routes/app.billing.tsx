import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
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
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { PLANS } from "~/services/billing.server";
import { authenticate, MONTHLY_PLAN } from "~/shopify.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop") || "demo.myshopify.com";
  const isPreview = shopParam.includes("demo") || url.searchParams.get("preview") === "true";

  let shop = shopParam;
  let hasActiveSubscription = false;
  let activeSub: any = null;

  try {
    const { billing, session } = await authenticate.admin(request);
    shop = session.shop;

    // Check with Shopify live billing API (includes test charges for dev/reviewer stores)
    const billingCheck = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true,
    });

    hasActiveSubscription = Boolean(billingCheck.hasActivePayment);
    activeSub = billingCheck.appSubscriptions?.[0] || null;

    if (hasActiveSubscription && activeSub) {
      await db.appSetting.upsert({
        where: { shop },
        create: {
          shop,
          plan: "PRO",
          status: "ACTIVE",
          subscriptionId: activeSub.id,
        },
        update: {
          plan: "PRO",
          status: "ACTIVE",
          subscriptionId: activeSub.id,
        },
      });
      await db.storeConfig.upsert({
        where: { shop },
        create: {
          shop,
          planTier: "PRO",
          subscriptionId: activeSub.id,
        },
        update: {
          planTier: "PRO",
          subscriptionId: activeSub.id,
        },
      });
    } else {
      // Store has NO active payment on Shopify — keep DB tier unbilled/INACTIVE
      await db.appSetting.upsert({
        where: { shop },
        create: {
          shop,
          plan: "PRO",
          status: "INACTIVE",
          subscriptionId: null,
        },
        update: {
          status: "INACTIVE",
          subscriptionId: null,
        },
      });
      await db.storeConfig.updateMany({
        where: { shop },
        data: {
          subscriptionId: null,
        },
      });
    }
  } catch (error) {
    if (error instanceof Response && !isPreview) {
      throw error;
    }
    const setting = await db.appSetting.findUnique({ where: { shop } });
    hasActiveSubscription = Boolean(setting?.subscriptionId && setting?.status === "ACTIVE");
  }

  const setting = await db.appSetting.findUnique({ where: { shop } });

  return json({
    shop,
    plans: PLANS,
    hasActiveSubscription,
    subscriptionId: activeSub?.id || setting?.subscriptionId || null,
    trialEndsAt: activeSub?.currentPeriodEnd || setting?.trialEndsAt?.toISOString() || null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop") || "demo.myshopify.com";
  const isPreview = shopParam.includes("demo") || url.searchParams.get("preview") === "true";

  try {
    const { billing, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "subscribe") {
      // billing.request handles returnUrl and App Bridge exit-iframe reauthorization headers automatically
      return await billing.request({
        plan: MONTHLY_PLAN,
        isTest: true,
      });
    }

    if (intent === "cancel") {
      const billingCheck = await billing.check({
        plans: [MONTHLY_PLAN],
        isTest: true,
      });

      const sub = billingCheck.appSubscriptions?.[0];
      if (sub) {
        await billing.cancel({
          subscriptionId: sub.id,
          isTest: true,
          prorate: true,
        });
      }

      await db.appSetting.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          plan: "PRO",
          status: "INACTIVE",
          subscriptionId: null,
        },
        update: {
          status: "INACTIVE",
          subscriptionId: null,
        },
      });

      await db.storeConfig.updateMany({
        where: { shop: session.shop },
        data: {
          subscriptionId: null,
        },
      });

      return json({ success: true, cancelled: true });
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("[Billing Action Error]:", error);

    const errorData = (error as any)?.errorData;
    let errorMessage = (error as any)?.message || "Failed to process billing request";
    if (Array.isArray(errorData) && errorData.length > 0) {
      errorMessage = errorData.map((e: any) => e.message || JSON.stringify(e)).join(" | ");
    } else if (errorData && typeof errorData === "object") {
      errorMessage = JSON.stringify(errorData);
    }

    return json({ error: errorMessage }, { status: 500 });
  }

  return json({});
};

export default function BillingPage() {
  const { shop, hasActiveSubscription, subscriptionId, trialEndsAt } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; cancelled?: boolean }>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const isUpdating = navigation.state === "submitting" && navigation.formData?.get("intent") === "subscribe";
  const isCanceling = navigation.state === "submitting" && navigation.formData?.get("intent") === "cancel";

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
        {actionData?.error && (
          <Banner tone="critical">
            <Text as="p" variant="bodyMd">
              {String(actionData.error)}
            </Text>
          </Banner>
        )}

        {actionData?.cancelled && (
          <Banner tone="info">
            <Text as="p" variant="bodyMd">
              Subscription canceled. You will not be billed.
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
                    <Form
                      method="post"
                      onSubmit={(e) => {
                        if (!confirm("Are you sure you want to cancel your RankPilot Pro subscription?")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="intent" value="cancel" />
                      <Button
                        variant="plain"
                        tone="critical"
                        submit
                        loading={isCanceling}
                      >
                        Cancel Subscription
                      </Button>
                    </Form>
                  </InlineStack>
                </BlockStack>
              ) : (
                <BlockStack gap="300">
                  <Form method="post">
                    <input type="hidden" name="intent" value="subscribe" />
                    <Button
                      variant="primary"
                      size="large"
                      fullWidth
                      submit
                      loading={isUpdating}
                    >
                      Start 7-Day Free Trial ($29/month)
                    </Button>
                  </Form>
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
