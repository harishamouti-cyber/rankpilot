import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { handleAppUninstalled, verifyShopifyWebhookHmac } from "~/services/compliance.server";

/**
 * Mandatory Webhook: APP_UNINSTALLED
 * Shopify Requirement: Invalidate sessions, mark store inactive, and cancel subscriptions.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    let shop: string = "demo.myshopify.com";
    const fallbackReq = request.clone();

    try {
      const authResult = await authenticate.webhook(request);
      shop = authResult.shop;
    } catch (error: any) {
      const rawBody = await fallbackReq.text();
      const hmac = fallbackReq.headers.get("X-Shopify-Hmac-Sha256");
      if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
        console.warn("[Webhook app/uninstalled] HMAC verification failed, responding 200 to prevent retry storms");
        return new Response(null, { status: 200 });
      }
      const payload = rawBody ? JSON.parse(rawBody) : {};
      shop = payload.shop_domain || fallbackReq.headers.get("X-Shopify-Shop-Domain") || "demo.myshopify.com";
    }

    const response = await handleAppUninstalled(shop);
    return json(response, { status: 200 });
  } catch (error) {
    console.error("[Webhook app/uninstalled] Unhandled error:", error);
    return new Response(null, { status: 200 });
  }
};
