import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  getCurrentPlan,
  createAppSubscription,
  confirmShopPlan,
  cancelAppSubscription,
  PLANS,
  PlanId,
} from "~/services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";
  const currentPlan = await getCurrentPlan(shop);
  return json({ currentPlan, plans: PLANS });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      shop = "demo.myshopify.com",
      planId,
      action: billingAction = "create_subscription",
      returnUrl = `/app/billing?shop=${encodeURIComponent(shop)}`,
      subscriptionId,
    } = body;

    if (billingAction === "cancel") {
      const result = await cancelAppSubscription({ shop });
      return json({ success: true, result });
    }

    if (billingAction === "confirm") {
      const result = await confirmShopPlan(shop, planId as PlanId, subscriptionId);
      return json({ success: true, result });
    }

    // Default: create subscription via GraphQL / checkout confirmationUrl
    if (!planId || !["STARTER", "PRO", "SCALE"].includes(planId)) {
      return json({ error: "Valid planId (STARTER, PRO, SCALE) is required" }, { status: 400 });
    }

    const subscription = await createAppSubscription({
      shop,
      planId: planId as PlanId,
      returnUrl,
    });

    return json({
      success: true,
      confirmationUrl: subscription.confirmationUrl,
      subscriptionId: subscription.subscriptionId,
      plan: subscription.plan,
    });
  } catch (error: any) {
    console.error("api.billing error:", error);
    return json({ error: error.message || "Failed to process billing request" }, { status: 500 });
  }
};
