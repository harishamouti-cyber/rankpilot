import { db } from "~/db.server";

export type PlanId = "STARTER" | "PRO" | "SCALE";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number;
  interval: "EVERY_30_DAYS";
  currency: "USD";
  productLimit: number;
  trialDays: number;
  features: string[];
  recommended?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    price: 19,
    interval: "EVERY_30_DAYS",
    currency: "USD",
    productLimit: 250,
    trialDays: 0,
    features: [
      "Up to 250 Catalog SKUs",
      "Automatic Schema.org JSON-LD Markup",
      "Daily IndexNow Search Engine Sync",
      "Basic SEO Title & Meta Descriptions",
      "Standard E-Commerce Support",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 49,
    interval: "EVERY_30_DAYS",
    currency: "USD",
    productLimit: 2000,
    trialDays: 7, // 7-day free trial
    recommended: true,
    features: [
      "Up to 2,000 Catalog SKUs",
      "Includes 7-Day Free Trial",
      "Google AI Overview Spec Matrices",
      "Conversational Buyer FAQ Generator",
      "AI Citation Tracker & Grounding",
      "1-Click Rollback Snapshot Engine",
      "Instant IndexNow Crawler Pushes",
    ],
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    price: 79,
    interval: "EVERY_30_DAYS",
    currency: "USD",
    productLimit: 1000000, // Unlimited
    trialDays: 0,
    features: [
      "Unlimited Catalog SKUs",
      "Autopilot 24/7 Catalog Guard",
      "Priority IndexNow Real-Time Webhooks",
      "Competitor Gap Stealer (Amazon & DTC)",
      "Zero-Latency /llms.txt AI Feeds",
      "Dedicated High-Throughput Pipeline",
    ],
  },
};

export const APP_SUBSCRIPTION_CREATE_MUTATION = `#graphql
  mutation appSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $test: Boolean
    $trialDays: Int
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      lineItems: $lineItems
      test: $test
      trialDays: $trialDays
    ) {
      appSubscription {
        id
        status
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

export const APP_SUBSCRIPTION_CANCEL_MUTATION = `#graphql
  mutation appSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      appSubscription {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Returns the currently active plan for the merchant store.
 */
export async function getCurrentPlan(shop: string = "demo.myshopify.com"): Promise<PlanDefinition> {
  const setting = await db.appSetting.findUnique({ where: { shop } });
  const rawPlan = (setting?.plan || "PRO").toUpperCase();
  const validPlanKey: PlanId = rawPlan === "STARTER" || rawPlan === "PRO" || rawPlan === "SCALE"
    ? rawPlan
    : "PRO";

  return PLANS[validPlanKey];
}

/**
 * Generates an appSubscriptionCreate GraphQL mutation or mock confirmation in development.
 */
export async function createAppSubscription({
  shop = "demo.myshopify.com",
  planId,
  returnUrl,
  adminClient,
  isTest = process.env.NODE_ENV !== "production",
}: {
  shop?: string;
  planId: PlanId;
  returnUrl: string;
  adminClient?: any;
  isTest?: boolean;
}) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Invalid plan: ${planId}`);

  let confirmationUrl: string = "";
  let subscriptionId: string = `sub_sim_${Date.now()}`;

  // If live Shopify GraphQL Admin context is present
  if (adminClient && typeof adminClient.graphql === "function") {
    try {
      const lineItems = [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.price,
                currencyCode: "USD",
              },
              interval: "EVERY_30_DAYS",
            },
          },
        },
      ];

      const variables: Record<string, any> = {
        name: `RankPilot ${plan.name} Plan`,
        returnUrl,
        lineItems,
        test: isTest,
      };

      if (plan.trialDays > 0) {
        variables.trialDays = plan.trialDays;
      }

      const res = await adminClient.graphql(APP_SUBSCRIPTION_CREATE_MUTATION, { variables });
      const data = await res.json();

      const userErrors = data?.data?.appSubscriptionCreate?.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.warn("[Billing] appSubscriptionCreate userErrors:", userErrors);
        throw new Error(userErrors.map((e: any) => e.message).join(", "));
      }

      confirmationUrl = data?.data?.appSubscriptionCreate?.confirmationUrl || "";
      subscriptionId = data?.data?.appSubscriptionCreate?.appSubscription?.id || subscriptionId;
    } catch (e: any) {
      console.warn("[Billing] Shopify GraphQL appSubscriptionCreate failed, fallback to direct authorization:", e.message);
    }
  }

  // If running in development / test mode and no live confirmation URL was returned
  if (!confirmationUrl) {
    const separator = returnUrl.includes("?") ? "&" : "?";
    confirmationUrl = `${returnUrl}${separator}charge_id=${subscriptionId}&plan=${planId}&confirmed=true`;
  }

  // Update AppSetting with pending subscription
  await db.appSetting.upsert({
    where: { shop },
    create: {
      shop,
      plan: planId,
      status: "ACTIVE",
      subscriptionId,
      subscriptionConfirmationUrl: confirmationUrl,
      trialEndsAt: plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86400000) : null,
    },
    update: {
      subscriptionId,
      subscriptionConfirmationUrl: confirmationUrl,
      trialEndsAt: plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86400000) : null,
    },
  });

  return {
    confirmationUrl,
    subscriptionId,
    plan,
  };
}

/**
 * Confirms subscription after merchant approves charges.
 */
export async function confirmShopPlan(
  shop: string = "demo.myshopify.com",
  planId: PlanId,
  subscriptionId?: string
) {
  if (!PLANS[planId]) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  const updated = await db.appSetting.upsert({
    where: { shop },
    create: {
      shop,
      plan: planId,
      status: "ACTIVE",
      subscriptionId: subscriptionId || `sub_${Date.now()}`,
    },
    update: {
      plan: planId,
      status: "ACTIVE",
      subscriptionId: subscriptionId || undefined,
    },
  });

  await db.storeConfig.upsert({
    where: { shop },
    create: {
      shop,
      planTier: planId,
      subscriptionId: subscriptionId || `sub_${Date.now()}`,
    },
    update: {
      planTier: planId,
      subscriptionId: subscriptionId || undefined,
    },
  });

  return { success: true, plan: PLANS[planId], setting: updated };
}

/**
 * Cancels active app subscription.
 */
export async function cancelAppSubscription({
  shop = "demo.myshopify.com",
  adminClient,
}: {
  shop?: string;
  adminClient?: any;
}) {
  const setting = await db.appSetting.findUnique({ where: { shop } });
  if (setting?.subscriptionId && adminClient && typeof adminClient.graphql === "function") {
    try {
      await adminClient.graphql(APP_SUBSCRIPTION_CANCEL_MUTATION, {
        variables: { id: setting.subscriptionId },
      });
    } catch (e) {
      console.warn("[Billing] Error canceling subscription via GraphQL:", e);
    }
  }

  await db.appSetting.update({
    where: { shop },
    data: {
      plan: "STARTER",
      subscriptionId: null,
    },
  });

  await db.storeConfig.updateMany({
    where: { shop },
    data: {
      planTier: "STARTER",
      subscriptionId: null,
    },
  });

  return { success: true, plan: PLANS.STARTER };
}

/**
 * Gating Middleware: Checks if the store's current plan allows a given operation.
 */
export async function checkSubscriptionGating({
  shop = "demo.myshopify.com",
  feature,
  skuCount = 1,
}: {
  shop?: string;
  feature: "BULK_OPTIMIZE" | "AUTOPILOT" | "SPEC_MATRIX" | "BUYER_FAQ" | "COMPETITOR_STEAL";
  skuCount?: number;
}): Promise<{ allowed: boolean; requiredPlan?: PlanId; reason?: string }> {
  const plan = await getCurrentPlan(shop);

  if (plan.id === "STARTER") {
    if (feature === "AUTOPILOT") {
      return {
        allowed: false,
        requiredPlan: "SCALE",
        reason: "Autopilot 24/7 Catalog Guard requires the Scale plan.",
      };
    }
    if (feature === "BULK_OPTIMIZE" && skuCount > 250) {
      return {
        allowed: false,
        requiredPlan: "PRO",
        reason: `Your catalog size (${skuCount} SKUs) exceeds Starter limit (250 SKUs). Upgrade to Pro or Scale.`,
      };
    }
  }

  if (plan.id === "PRO") {
    if (feature === "AUTOPILOT") {
      return {
        allowed: false,
        requiredPlan: "SCALE",
        reason: "Autopilot 24/7 Catalog Guard requires the Scale plan ($79/mo).",
      };
    }
    if (skuCount > 2000) {
      return {
        allowed: false,
        requiredPlan: "SCALE",
        reason: `Your catalog size (${skuCount} SKUs) exceeds Pro limit (2,000 SKUs). Upgrade to Scale for unlimited SKUs.`,
      };
    }
  }

  return { allowed: true };
}
