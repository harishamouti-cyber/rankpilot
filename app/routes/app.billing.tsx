import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
import React from "react";
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
import {
  PLANS,
  APP_ACTIVE_SUBSCRIPTIONS_QUERY,
  APP_SUBSCRIPTION_CANCEL_MUTATION,
} from "~/services/billing.server";
import { authenticate, MONTHLY_PLAN, MANAGED_PLAN, MANAGED_PLAN_HANDLE } from "~/shopify.server";
import { db } from "~/db.server";

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeSubGid(id?: string | null): string | null {
  if (!id) return null;
  const trimmed = String(id).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("gid://")) return trimmed;
  if (/^\d+$/.test(trimmed)) return `gid://shopify/AppSubscription/${trimmed}`;
  return trimmed;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop") || "demo.myshopify.com";
  const isPreview = shopParam.includes("demo") || url.searchParams.get("preview") === "true";

  // Check incoming redirect parameters when returning from Shopify plan approval
  const returnedChargeId = url.searchParams.get("charge_id");
  const returnedPlanHandle = url.searchParams.get("plan_handle");
  const explicitCancelledParam = url.searchParams.get("cancelled") === "true";
  const hasReturnedFromApproval = Boolean(
    returnedChargeId || (returnedPlanHandle && returnedPlanHandle.toLowerCase() === "pro")
  );

  const cancelledCookie = getCookieValue(request.headers.get("cookie"), "rankpilot_cancelled");

  let shop = shopParam;
  let hasActiveSubscription = false;
  let activeSub: any = null;
  let isValidApprovalReturn = false;
  let shouldClearCancelledCookie = false;

  try {
    const { billing, session, admin } = await authenticate.admin(request);
    shop = session.shop;

    const existingSetting = await db.appSetting.findUnique({ where: { shop } });
    const isDbCancelled = existingSetting?.status === "CANCELLED";

    // Build set of subscription IDs that were explicitly cancelled by the merchant
    const cancelledIds = new Set<string>();
    if (isDbCancelled && existingSetting?.subscriptionConfirmationUrl) {
      for (const part of existingSetting.subscriptionConfirmationUrl.split(",")) {
        const norm = normalizeSubGid(part);
        if (norm) cancelledIds.add(norm);
        if (part.trim()) cancelledIds.add(part.trim());
      }
    }
    if (cancelledCookie) {
      for (const part of cancelledCookie.split(",")) {
        const norm = normalizeSubGid(part);
        if (norm) cancelledIds.add(norm);
        if (part.trim()) cancelledIds.add(part.trim());
      }
    }

    const isSubCancelled = (subId?: string | null): boolean => {
      if (explicitCancelledParam) return true;
      const norm = normalizeSubGid(subId);
      if (norm && (cancelledIds.has(norm) || cancelledIds.has(String(subId)))) {
        return true;
      }
      if (!norm && (isDbCancelled || Boolean(cancelledCookie) || cancelledIds.has("cancelled_all"))) {
        return true;
      }
      return false;
    };

    // Determine if URL approval params represent a fresh approval vs stale post-cancel URL
    if (hasReturnedFromApproval && !explicitCancelledParam) {
      if (returnedChargeId) {
        isValidApprovalReturn = !isSubCancelled(returnedChargeId) && !cancelledIds.has("cancelled_all");
      } else {
        isValidApprovalReturn = !isDbCancelled && !cancelledCookie;
      }
    }

    let liveGraphqlChecked = false;

    // 1. Check with Shopify live billing API with all possible plan names
    try {
      const billingCheck = await billing.check({
        plans: [MONTHLY_PLAN, MANAGED_PLAN, MANAGED_PLAN_HANDLE],
        isTest: true,
      });

      const validCheckSubs = (billingCheck.appSubscriptions || []).filter(
        (sub: any) => !isSubCancelled(sub?.id)
      );

      if (validCheckSubs.length > 0) {
        hasActiveSubscription = true;
        activeSub = validCheckSubs[0];
      }
    } catch (checkErr) {
      console.warn("[Billing Check Warning]:", checkErr);
    }

    // 2. Direct GraphQL query to currentAppInstallation.activeSubscriptions
    if (!hasActiveSubscription && admin) {
      try {
        const res = await admin.graphql(APP_ACTIVE_SUBSCRIPTIONS_QUERY);
        const data = await res.json();
        const rawActiveSubs =
          data?.data?.currentAppInstallation?.activeSubscriptions ||
          data?.data?.appInstallation?.activeSubscriptions;

        if (Array.isArray(rawActiveSubs)) {
          liveGraphqlChecked = true;
          const validGqlSubs = rawActiveSubs.filter((sub: any) => !isSubCancelled(sub?.id));
          if (validGqlSubs.length > 0) {
            hasActiveSubscription = true;
            activeSub = validGqlSubs[0];
          }
        }
      } catch (gqlErr) {
        console.warn("[Billing GraphQL Check Warning]:", gqlErr);
      }
    }

    // 3. Fallback: If merchant just returned from approving on Shopify Managed Pricing (and has NOT cancelled it)
    if (!hasActiveSubscription && isValidApprovalReturn) {
      hasActiveSubscription = true;
      activeSub = {
        id: returnedChargeId ? `gid://shopify/AppSubscription/${returnedChargeId}` : `sub_managed_${Date.now()}`,
        name: "Pro Plan",
        status: "ACTIVE",
      };
    }

    if (hasActiveSubscription && activeSub) {
      if (cancelledCookie) {
        shouldClearCancelledCookie = true;
      }
      await db.appSetting.upsert({
        where: { shop },
        create: {
          shop,
          plan: "PRO",
          status: "ACTIVE",
          subscriptionId: activeSub.id,
          subscriptionConfirmationUrl: null,
        },
        update: {
          plan: "PRO",
          status: "ACTIVE",
          subscriptionId: activeSub.id,
          subscriptionConfirmationUrl: null,
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
      // Only fall back to existing DB active record if live GraphQL check failed due to transient network error
      // AND the subscription was not cancelled
      if (
        !liveGraphqlChecked &&
        existingSetting &&
        existingSetting.status === "ACTIVE" &&
        existingSetting.subscriptionId &&
        !isSubCancelled(existingSetting.subscriptionId)
      ) {
        hasActiveSubscription = true;
        activeSub = { id: existingSetting.subscriptionId, name: "Pro Plan", status: "ACTIVE" };
      } else {
        const nextStatus = isDbCancelled || Boolean(cancelledCookie) || explicitCancelledParam ? "CANCELLED" : "INACTIVE";
        await db.appSetting.upsert({
          where: { shop },
          create: {
            shop,
            plan: "PRO",
            status: nextStatus,
            subscriptionId: null,
          },
          update: {
            status: nextStatus,
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
    }
  } catch (error) {
    if (error instanceof Response && !isPreview) {
      throw error;
    }
    const setting = await db.appSetting.findUnique({ where: { shop } });
    const isCancelled = setting?.status === "CANCELLED" || Boolean(cancelledCookie) || explicitCancelledParam;
    hasActiveSubscription =
      !isCancelled && (Boolean(setting?.subscriptionId && setting?.status === "ACTIVE") || hasReturnedFromApproval);
  }

  const setting = await db.appSetting.findUnique({ where: { shop } });

  const storeHandle = shop.replace(".myshopify.com", "");
  const referer = request.headers.get("referer") || "";
  const match = referer.match(/\/apps\/([^/?#]+)/);
  const appHandle = match ? match[1] : (url.searchParams.get("handle") || "rankpilot-39");
  const managedPricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;

  const responseHeaders: Record<string, string> = {};
  if (shouldClearCancelledCookie) {
    responseHeaders["Set-Cookie"] = "rankpilot_cancelled=; Path=/; Max-Age=0; SameSite=None; Secure";
  }

  return json(
    {
      shop,
      plans: PLANS,
      hasActiveSubscription,
      managedPricingUrl,
      subscriptionId: hasActiveSubscription ? (activeSub?.id || setting?.subscriptionId || null) : null,
      trialEndsAt: hasActiveSubscription
        ? (activeSub?.currentPeriodEnd || setting?.trialEndsAt?.toISOString() || null)
        : null,
      justApproved: Boolean(hasActiveSubscription && isValidApprovalReturn),
    },
    { headers: responseHeaders }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop") || "demo.myshopify.com";
  const isPreview = shopParam.includes("demo") || url.searchParams.get("preview") === "true";

  try {
    const { billing, session, admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    const storeHandle = session.shop.replace(".myshopify.com", "");
    const referer = request.headers.get("referer") || "";
    const match = referer.match(/\/apps\/([^/?#]+)/);
    const appHandle = match ? match[1] : (url.searchParams.get("handle") || "rankpilot-39");
    const managedPricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;

    if (intent === "prepare_subscribe") {
      await db.appSetting.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          plan: "PRO",
          status: "PENDING",
          subscriptionId: null,
          subscriptionConfirmationUrl: null,
        },
        update: {
          status: "PENDING",
          subscriptionConfirmationUrl: null,
        },
      });
      return json(
        { ready: true },
        {
          headers: {
            "Set-Cookie": "rankpilot_cancelled=; Path=/; Max-Age=0; SameSite=None; Secure",
          },
        }
      );
    }

    if (intent === "subscribe") {
      await db.appSetting.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          plan: "PRO",
          status: "PENDING",
          subscriptionId: null,
          subscriptionConfirmationUrl: null,
        },
        update: {
          status: "PENDING",
          subscriptionConfirmationUrl: null,
        },
      });
      // Direct top-level redirection to Shopify App Pricing (Managed Pricing)
      throw new Response(undefined, {
        status: 401,
        statusText: "Unauthorized",
        headers: {
          "X-Shopify-API-Request-Failure-Reauthorize-Url": managedPricingUrl,
          "Set-Cookie": "rankpilot_cancelled=; Path=/; Max-Age=0; SameSite=None; Secure",
        },
      });
    }

    if (intent === "cancel") {
      const candidateSubIds = new Set<string>();

      const formSubId = normalizeSubGid(formData.get("subscriptionId") as string | null);
      if (formSubId) candidateSubIds.add(formSubId);

      const urlChargeId = normalizeSubGid(url.searchParams.get("charge_id"));
      if (urlChargeId) candidateSubIds.add(urlChargeId);

      try {
        const existing = await db.appSetting.findUnique({ where: { shop: session.shop } });
        const dbSubId = normalizeSubGid(existing?.subscriptionId);
        if (dbSubId) candidateSubIds.add(dbSubId);
      } catch {}

      try {
        const billingCheck = await billing.check({
          plans: [MONTHLY_PLAN, MANAGED_PLAN, MANAGED_PLAN_HANDLE],
          isTest: true,
        });
        for (const sub of billingCheck.appSubscriptions || []) {
          const norm = normalizeSubGid(sub?.id);
          if (norm) candidateSubIds.add(norm);
        }
      } catch {}

      if (admin) {
        try {
          const res = await admin.graphql(APP_ACTIVE_SUBSCRIPTIONS_QUERY);
          const data = await res.json();
          const subs =
            data?.data?.currentAppInstallation?.activeSubscriptions ||
            data?.data?.appInstallation?.activeSubscriptions ||
            [];
          for (const sub of subs) {
            const norm = normalizeSubGid(sub?.id);
            if (norm) candidateSubIds.add(norm);
          }
        } catch {}
      }

      // Cancel every discovered active subscription on Shopify via both GraphQL and billing.cancel
      for (const subId of candidateSubIds) {
        if (subId.startsWith("gid://shopify/AppSubscription/")) {
          if (admin) {
            try {
              await admin.graphql(APP_SUBSCRIPTION_CANCEL_MUTATION, {
                variables: { id: subId },
              });
            } catch (gqlCancelErr) {
              console.warn("[Billing GraphQL Cancel Warning]:", gqlCancelErr);
            }
          }
          try {
            await billing.cancel({
              subscriptionId: subId,
              isTest: true,
              prorate: true,
            });
          } catch (cancelErr) {
            console.warn("[Billing Cancel Warning]:", cancelErr);
          }
        }
      }

      const cancelledMarker =
        candidateSubIds.size > 0 ? Array.from(candidateSubIds).join(",") : "cancelled_all";

      await db.appSetting.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          plan: "PRO",
          status: "CANCELLED",
          subscriptionId: null,
          subscriptionConfirmationUrl: cancelledMarker,
        },
        update: {
          status: "CANCELLED",
          subscriptionId: null,
          subscriptionConfirmationUrl: cancelledMarker,
        },
      });

      await db.storeConfig.updateMany({
        where: { shop: session.shop },
        data: {
          subscriptionId: null,
        },
      });

      return json(
        { success: true, cancelled: true },
        {
          headers: {
            "Set-Cookie": `rankpilot_cancelled=${encodeURIComponent(cancelledMarker)}; Path=/; Max-Age=86400; SameSite=None; Secure`,
          },
        }
      );
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
  const { shop, hasActiveSubscription, subscriptionId, trialEndsAt, managedPricingUrl, justApproved } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; cancelled?: boolean }>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const [wasCancelledClient, setWasCancelledClient] = React.useState(false);

  React.useEffect(() => {
    if (actionData?.cancelled) {
      setWasCancelledClient(true);
    }
  }, [actionData?.cancelled]);

  // Strip charge_id and plan_handle from URL after initial approval load or cancellation
  // so refreshing the browser page does not re-send stale approval query parameters
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has("charge_id") || currentUrl.searchParams.has("plan_handle")) {
        currentUrl.searchParams.delete("charge_id");
        currentUrl.searchParams.delete("plan_handle");
        const cleanSearch = currentUrl.searchParams.toString();
        const cleanUrl = `${currentUrl.pathname}${cleanSearch ? `?${cleanSearch}` : ""}`;
        window.history.replaceState({}, "", cleanUrl);
      }
    } catch {}
  }, [justApproved, actionData?.cancelled]);

  const isSubscribed = Boolean(hasActiveSubscription && !actionData?.cancelled && !wasCancelledClient);

  const isUpdating = navigation.state === "submitting" && navigation.formData?.get("intent") === "subscribe";
  const isCanceling = navigation.state === "submitting" && navigation.formData?.get("intent") === "cancel";

  const handleStartTrial = () => {
    let targetUrl = managedPricingUrl;
    if (typeof window !== "undefined") {
      try {
        fetch("/app/billing", {
          method: "POST",
          body: new URLSearchParams({ intent: "prepare_subscribe" }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
      try {
        const ref = document.referrer || "";
        const m = ref.match(/\/apps\/([^/?#]+)/);
        if (m && m[1]) {
          const storeName = shop.replace(".myshopify.com", "");
          targetUrl = `https://admin.shopify.com/store/${storeName}/charges/${m[1]}/pricing_plans`;
        }
      } catch {}
    }
    if (targetUrl) {
      if (window.top) {
        window.top.location.href = targetUrl;
      } else {
        window.location.href = targetUrl;
      }
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
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%" }}>
        <BlockStack gap="500">
          {justApproved && isSubscribed && (
            <Banner tone="success">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                🎉 Subscription approved! Your 7-day free trial of RankPilot Pro is now active.
              </Text>
            </Banner>
          )}

          {actionData?.error && (
            <Banner tone="critical">
              <Text as="p" variant="bodyMd">
                {String(actionData.error)}
              </Text>
            </Banner>
          )}

          {(actionData?.cancelled || wasCancelledClient) && !isSubscribed && (
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

          <Box
            padding="600"
            background="bg-surface"
            borderRadius="400"
            borderWidth="050"
            borderColor={isSubscribed ? "border-success" : "border-emphasis"}
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

                {isSubscribed ? (
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
                    <div style={{ display: "inline-flex", alignItems: "baseline", gap: "6px" }}>
                      <Text as="span" variant="heading3xl" fontWeight="bold">
                        $29
                      </Text>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        / month (USD)
                      </Text>
                    </div>
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
              {isSubscribed ? (
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
                      <input type="hidden" name="subscriptionId" value={subscriptionId || ""} />
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
                  <Form method="post" onSubmit={handleStartTrial}>
                    <input type="hidden" name="intent" value="subscribe" />
                    <Button
                      variant="primary"
                      size="large"
                      fullWidth
                      onClick={handleStartTrial}
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
        </BlockStack>
      </div>
    </Page>
  );
}
