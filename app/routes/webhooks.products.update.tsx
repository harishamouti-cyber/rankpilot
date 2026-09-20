import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { verifyShopifyWebhookHmac } from "~/services/compliance.server";
import { submitToIndexNow } from "~/services/indexnow.server";
import { db } from "~/db.server";

/**
 * Event Webhook: PRODUCTS_UPDATE
 * Drift Monitoring:
 * Detects merchant title/description/price edits and keeps Schema.org / IndexNow in continuous sync.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    let shop = "demo.myshopify.com";
    const fallbackReq = request.clone();
    let payload: any = {};

    try {
      const authResult = await authenticate.webhook(request);
      shop = authResult.shop;
      payload = authResult.payload;
    } catch (error: any) {
      const rawBody = await fallbackReq.text();
      const hmac = fallbackReq.headers.get("X-Shopify-Hmac-Sha256");
      if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
        console.warn("[Webhook products/update] HMAC failed, responding 200 to prevent retry storms");
        return new Response(null, { status: 200 });
      }
      payload = rawBody ? JSON.parse(rawBody) : {};
      shop =
        fallbackReq.headers.get("X-Shopify-Shop-Domain") ||
        payload.shop_domain ||
        "demo.myshopify.com";
    }

    const rawProductId = payload.id ? String(payload.id) : `prod_${Date.now()}`;
    const productId = rawProductId.startsWith("gid://")
      ? rawProductId
      : `gid://shopify/Product/${rawProductId}`;
    const title = payload.title;
    const handle = payload.handle || "product";

    console.log(`[Webhook products/update] Product ${productId} updated on ${shop}`);

    try {
      const existing = await db.productOptimization.findUnique({
        where: { productId },
      });

      if (existing) {
        // Update schema price/availability if changed
        if (existing.schemaJson && payload.variants?.[0]?.price) {
          try {
            const schema = JSON.parse(existing.schemaJson);
            if (schema.offers) {
              schema.offers.price = payload.variants[0].price;
              await db.productOptimization.update({
                where: { id: existing.id },
                data: {
                  schemaJson: JSON.stringify(schema),
                  productTitle: title || existing.productTitle,
                  productHandle: handle,
                },
              });
            }
          } catch (err) {
            console.warn("[Webhook products/update] Schema update warning:", err);
          }
        }

        // Fast IndexNow update ping so search engines recrawl title/price edits
        await submitToIndexNow({
          url: `https://${shop}/products/${handle}`,
          shop,
        });
      }
    } catch (err) {
      console.warn("[Webhook products/update] DB update failed:", err);
    }

    return json({ success: true, shop, productId });
  } catch (error) {
    console.error("[Webhook products/update] Unhandled error:", error);
    return new Response(null, { status: 200 });
  }
};
