import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { verifyShopifyWebhookHmac } from "~/services/compliance.server";
import { optimizeProductWithAI } from "~/services/gemini.server";
import { submitToIndexNow } from "~/services/indexnow.server";
import { applyOptimizationToProduct, ShopifyProductItem } from "~/services/shopify.server";
import { recordWebhookEvent } from "~/services/webhook_log.server";
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

  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  if (!hmac) {
    return new Response("Unauthorized: Missing HMAC signature", { status: 401 });
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
    } catch (authError: any) {
      if (authError instanceof Response && authError.status === 401) {
        throw authError;
      }
      const rawBody = await fallbackReq.text();
      if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
        return new Response("Unauthorized: Invalid HMAC signature", { status: 401 });
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

  await recordWebhookEvent({
    shop,
    topic: "products/create",
    status: "SUCCESS",
    statusCode: 200,
    latencyMs: 16,
    payload,
  });

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
  const payloadVariants: any[] = Array.isArray(payload.variants) ? payload.variants : [];
  const variantPrices = payloadVariants.map((v) => parseFloat(v.price)).filter((n) => isFinite(n) && n > 0);
  const price = variantPrices.length ? Math.min(...variantPrices).toFixed(2) : "";
  const maxPrice = variantPrices.length ? Math.max(...variantPrices).toFixed(2) : undefined;
  const settingForCurrency = await db.appSetting.findUnique({ where: { shop } });
  let currency: string = payload.variants?.[0]?.currency || "";
  if (!currency && admin) {
    try {
      const res = await admin.graphql(`#graphql
        { shop { currencyCode } }`);
      currency = (await res.json())?.data?.shop?.currencyCode || "";
    } catch {
      // leave empty: schema omits offers when currency is unknown
    }
  }
  const tracked = payloadVariants.some((v) => v.inventory_management);
  const totalInventory = tracked
    ? payloadVariants.reduce((sum, v) => sum + (Number(v.inventory_quantity) || 0), 0)
    : undefined;
  const realOptions = Array.isArray(payload.options)
    ? payload.options.map((o: any) => ({ name: String(o.name || ""), values: (o.values || []).map(String) }))
    : [];
  const realVariants = payloadVariants.map((v) => ({
    title: v.title,
    sku: v.sku || null,
    price: v.price,
    ...(tracked ? {} : { availableForSale: true }),
  }));

  const optimization = await optimizeProductWithAI(
    {
      title,
      descriptionHtml: payload.body_html || "",
      vendor: payload.vendor || "",
      productType: payload.product_type || "",
      tags: typeof payload.tags === "string" ? payload.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      price,
      maxPrice,
      currency,
      handle,
      options: realOptions,
      variants: realVariants,
      totalInventory,
      imageUrl: payload.image?.src || payload.images?.[0]?.src,
      currentAltText: payload.image?.alt || payload.images?.[0]?.alt || "",
      shopDomain: settingForCurrency?.storeDomain || shop,
    },
    shop
  );

  const productItem: ShopifyProductItem = {
    id: productId,
    title,
    handle,
    descriptionHtml: payload.body_html || "",
    vendor: payload.vendor || "",
    productType: payload.product_type || "",
    tags: typeof payload.tags === "string" ? payload.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    totalInventory: totalInventory ?? 0,
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
