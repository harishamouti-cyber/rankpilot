import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { verifyShopifyWebhookHmac } from "~/services/compliance.server";
import { optimizeProductWithAI } from "~/services/gemini.server";
import { submitToIndexNow } from "~/services/indexnow.server";
import { applyOptimizationToProduct, ShopifyProductItem } from "~/services/shopify.server";
import { db } from "~/db.server";

/**
 * Event Webhook: PRODUCTS_CREATE
 * Zero-Click Autopilot:
 * Automatically audits and optimizes newly published products if autopilot is enabled.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    let shop = "demo.myshopify.com";
    let admin: any = null;
    const fallbackReq = request.clone();
    let payload: any = {};

    try {
      const authResult = await authenticate.webhook(request);
      shop = authResult.shop;
      payload = authResult.payload;
      admin = authResult.admin;
    } catch (error: any) {
      const rawBody = await fallbackReq.text();
      const hmac = fallbackReq.headers.get("X-Shopify-Hmac-Sha256");
      if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
        console.warn("[Webhook products/create] HMAC failed, responding 200 to prevent retry storms");
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
  const title = payload.title || "New Product";
  const handle = payload.handle || "new-product";

  console.log(`[Webhook products/create] Received product ${productId} ("${title}") on shop ${shop}`);

  // Check store autopilot configuration
  const config = await db.storeConfig.findUnique({ where: { shop } });
  const appSetting = await db.appSetting.findUnique({ where: { shop } });

  const isAutopilotOn =
    config?.zeroClickAutopilot ?? appSetting?.autopilotEnabled ?? true;

  if (!isAutopilotOn) {
    console.log(`[Webhook products/create] Autopilot disabled for ${shop}. Storing in NEEDS_OPTIMIZATION status.`);
    await db.productOptimization.upsert({
      where: { productId },
      update: {
        productTitle: title,
        productHandle: handle,
        status: "NEEDS_OPTIMIZATION",
        geoScore: 38,
      },
      create: {
        shop,
        productId,
        productTitle: title,
        productHandle: handle,
        status: "NEEDS_OPTIMIZATION",
        geoScore: 38,
        originalTitle: title,
        originalBodyHtml: payload.body_html || "",
      },
    });
    return json({ success: true, optimized: false, message: "Stored as NEEDS_OPTIMIZATION" });
  }

  // Zero-Click Autopilot is active: Generate full GEO optimization
  const price = payload.variants?.[0]?.price || "49.99";
  const currency = payload.variants?.[0]?.currency || "USD";

  const optimization = await optimizeProductWithAI(
    {
      title,
      descriptionHtml: payload.body_html || "",
      vendor: payload.vendor || "Brand",
      productType: payload.product_type || "General",
      tags: typeof payload.tags === "string" ? payload.tags.split(",").map((t: string) => t.trim()) : [],
      price,
      currency,
      handle,
    },
    shop
  );

  const productItem: ShopifyProductItem = {
    id: productId,
    title,
    handle,
    descriptionHtml: payload.body_html || "",
    vendor: payload.vendor || "Brand",
    productType: payload.product_type || "General",
    tags: typeof payload.tags === "string" ? payload.tags.split(",").map((t: string) => t.trim()) : [],
    totalInventory: 100,
    priceRange: {
      minVariantPrice: { amount: price, currencyCode: currency },
    },
    seo: {
      title,
      description: payload.body_html?.replace(/<[^>]+>/g, "").slice(0, 150) || "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "AI_READY",
    aiScore: optimization.aiScore,
    geoScore: optimization.aiScore,
    hasRollback: false,
  };

  await applyOptimizationToProduct({
    productId,
    shop,
    currentProduct: productItem,
    optimization,
    adminClient: admin,
  });

  // Log to AutopilotLog
  await db.autopilotLog.create({
    data: {
      shop,
      productId,
      actionType: "AUTO_OPTIMIZE_ON_CREATE",
      details: `Zero-Click Autopilot optimized "${title}" (GEO Score: ${optimization.aiScore}/100)`,
    },
  });

  // Push to IndexNow
  await submitToIndexNow({
    url: `https://${shop}/products/${handle}`,
    shop,
  });

    console.log(`[Webhook products/create] Zero-Click Autopilot successfully optimized "${title}"`);
    return json({ success: true, optimized: true, productId, geoScore: optimization.aiScore });
  } catch (error) {
    console.error("[Webhook products/create] Unhandled error:", error);
    return new Response(null, { status: 200 });
  }
};
