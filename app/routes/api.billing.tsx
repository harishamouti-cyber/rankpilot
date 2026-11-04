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
import { authenticate, unauthenticated } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session: __rpSession } = await authenticate.admin(request);
  const shop = __rpSession.shop;
  const url = new URL(request.url);
  const currentPlan = await getCurrentPlan(shop);
  return json({ currentPlan, plans: PLANS });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session: __rpSession } = await authenticate.admin(request);
  const shop = __rpSession.shop;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      planId = "PRO",
      action: billingAction = "create_subscription",
      returnUrl = `/app/billing?shop=${encodeURIComponent(shop)}`,
      subscriptionId,
    } = body;

    let adminClient: any = null;
    let effectiveShop = shop;

    try {
      const auth = await authenticate.admin(request);
      adminClient = auth.admin;
      if (auth.session?.shop) {
        effectiveShop = auth.session.shop;
      }
    } catch {
      try {
        const unauth = await unauthenticated.admin(shop);
        adminClient = unauth.admin;
      } catch {}
    }

    if (billingAction === "cancel") {
      const result = await cancelAppSubscription({ shop: effectiveShop, adminClient });
      return json({ success: true, result });
    }

    if (billingAction === "confirm") {
      const result = await confirmShopPlan(effectiveShop, "PRO", subscriptionId);
      return json({ success: true, result });
    }

    // Default: create subscription via GraphQL / checkout confirmationUrl
    const subscription = await createAppSubscription({
      shop: effectiveShop,
      planId: "PRO",
      returnUrl,
      adminClient,
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
