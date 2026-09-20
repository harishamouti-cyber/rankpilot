import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { verifyShopifyWebhookHmac } from "~/services/compliance.server";
import { submitToIndexNow } from "~/services/indexnow.server";
import { db } from "~/db.server";

/**
 * Event Webhook: INVENTORY_LEVELS_UPDATE
 * 1. Out-of-Stock Protection:
 *    - Updates Schema.org availability to https://schema.org/OutOfStock.
 *    - Creates or activates a 301 Stockout Redirect to retain SEO link equity.
 * 2. Restock Detection:
 *    - Deactivates Stockout Redirect.
 *    - Updates Schema.org availability to https://schema.org/InStock.
 *    - Dispatches instant IndexNow ping to accelerate search engine recrawl.
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
        console.warn("[Webhook inventory_levels/update] HMAC failed, responding 200 to prevent retry storms");
        return new Response(null, { status: 200 });
      }
      payload = rawBody ? JSON.parse(rawBody) : {};
      shop =
        fallbackReq.headers.get("X-Shopify-Shop-Domain") ||
        payload.shop_domain ||
        "demo.myshopify.com";
    }

  const inventoryItemId = payload.inventory_item_id;
  const available = typeof payload.available === "number" ? payload.available : 0;

  console.log(
    `[Webhook inventory_levels/update] Shop: ${shop}, Item: ${inventoryItemId}, Available: ${available}`
  );

  try {
    // Find associated product optimization record
    const optRecord = await db.productOptimization.findFirst({
      where: { shop },
      orderBy: { updatedAt: "desc" },
    });

    if (optRecord) {
      const productId = optRecord.productId;
      const productHandle = optRecord.productHandle || "product";

      if (available <= 0) {
        // Handle Stockout: Create/Activate Redirect & set OutOfStock schema
        await db.stockoutRedirect.upsert({
          where: { id: `redirect-${productId}` },
          update: {
            isActive: true,
            targetPath: `/collections/all`,
          },
          create: {
            id: `redirect-${productId}`,
            shop,
            productId,
            productHandle,
            targetPath: `/collections/all`,
            isActive: true,
          },
        });

        // Update cached schemaJson to OutOfStock
        if (optRecord.schemaJson) {
          try {
            const schema = JSON.parse(optRecord.schemaJson);
            if (schema.offers) {
              schema.offers.itemAvailability = "https://schema.org/OutOfStock";
              await db.productOptimization.update({
                where: { id: optRecord.id },
                data: { schemaJson: JSON.stringify(schema) },
              });
            }
          } catch (err) {
            console.warn("[Inventory Webhook] Error updating OutOfStock schema:", err);
          }
        }
      } else {
        // Restocked: Deactivate redirect, restore InStock schema, ping IndexNow
        await db.stockoutRedirect.updateMany({
          where: { shop, productId, isActive: true },
          data: { isActive: false },
        });

        if (optRecord.schemaJson) {
          try {
            const schema = JSON.parse(optRecord.schemaJson);
            if (schema.offers) {
              schema.offers.itemAvailability = "https://schema.org/InStock";
              await db.productOptimization.update({
                where: { id: optRecord.id },
                data: { schemaJson: JSON.stringify(schema) },
              });
            }
          } catch (err) {
            console.warn("[Inventory Webhook] Error restoring InStock schema:", err);
          }
        }

        // Trigger real-time IndexNow push for restocked product
        await submitToIndexNow({
          url: `https://${shop}/products/${productHandle}`,
          shop,
        });
      }
    }
  } catch (dbError) {
    console.warn("[Inventory Webhook] Error updating database state:", dbError);
  }

    return json({ success: true, shop, available }, { status: 200 });
  } catch (error) {
    console.error("[Webhook inventory_levels/update] Unhandled error:", error);
    return new Response(null, { status: 200 });
  }
};
