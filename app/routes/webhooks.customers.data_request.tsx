import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { handleCustomerDataRequest, verifyShopifyWebhookHmac } from "~/services/compliance.server";

/**
 * Mandatory GDPR Webhook: customers/data_request
 * Shopify Partner Requirement: Must respond with HTTP 200.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    let payload: any = {};
    let shop: string = "demo.myshopify.com";
    const fallbackReq = request.clone();

    try {
      const authResult = await authenticate.webhook(request);
      payload = authResult.payload;
      shop = authResult.shop;
    } catch (error: any) {
      const rawBody = await fallbackReq.text();
      const hmac = fallbackReq.headers.get("X-Shopify-Hmac-Sha256");
      if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
        console.warn("[Webhook customers/data_request] HMAC failed, responding 200 to prevent retry storms");
        return new Response(null, { status: 200 });
      }
      payload = rawBody ? JSON.parse(rawBody) : {};
      shop = payload.shop_domain || fallbackReq.headers.get("X-Shopify-Shop-Domain") || "demo.myshopify.com";
    }

    const response = await handleCustomerDataRequest(payload);
    return json(response, { status: 200 });
  } catch (error) {
    console.error("[Webhook customers/data_request] Unhandled error:", error);
    return new Response(null, { status: 200 });
  }
};
