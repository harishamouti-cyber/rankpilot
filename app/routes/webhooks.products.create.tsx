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

  // "Auto-optimize new products" setting (StoreConfig.zeroClickAutopilot).
  // If the merchant never chose, default ON only for shops with an active paid subscription.
  const config = await db.storeConfig.findUnique({ where: { shop } });
  const appSetting = await db.appSetting.findUnique({ where: { shop } });
  const hasPaidPlan = Boolean(appSetting?.subscriptionId && appSetting?.status === "ACTIVE");
  const isAutoOptimizeOn = config ? config.zeroClickAutopilot : hasPaidPlan;

  const baseRecord = {
    productTitle: title,
    productHandle: handle,
    originalTitle: title,
    originalBodyHtml: payload.body_html || "",
  };

  if (!isAutoOptimizeOn) {
    const existing = await db.productOptimization.findUnique({ where: { productId } });
    if (!existing) {
      await db.productOptimization.create({
        data: { shop, productId, ...baseRecord, status: "NEEDS_OPTIMIZATION", geoScore: 38 },
      }).catch(() => undefined); // concurrent retry already created it
    }
    return json({ success: true, optimized: false, message: "Auto-optimize off; stored as NEEDS_OPTIMIZATION" });
  }

  // Idempotency: claim the product before calling Gemini so Shopify webhook retries
  // (or duplicate deliveries) never double-optimize or double-write.
  const STALE_CLAIM_MS = 10 * 60 * 1000;
  let claimed = false;
  try {
    await db.productOptimization.create({
      data: { shop, productId, ...baseRecord, status: "AUTO_OPTIMIZING", geoScore: 38 },
    });
    claimed = true;
  } catch {
    // Row exists: only take over if it was never optimized and no fresh claim is in flight.
    const res = await db.productOptimization.updateMany({
      where: {
        productId,
        lastOptimizedAt: null,
        OR: [
          { status: "NEEDS_OPTIMIZATION" },
          { status: "AUTO_OPTIMIZING", updatedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } },
        ],
      },
      data: { status: "AUTO_OPTIMIZING" },
    });
    claimed = res.count > 0;
  }
  if (!claimed) {
    console.log(`[Webhook products/create] ${productId} already optimized or in progress; skipping (idempotent).`);
    return json({ success: true, optimized: false, message: "Already handled" });
  }

  try {
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
      details: `Auto-optimized new product "${title}" (GEO Score: ${optimization.aiScore}/100)`,
    },
  });

  // Push to IndexNow
  if (appSetting?.autoPingIndexNow ?? true) {
    await submitToIndexNow({ url: `https://${shop}/products/${handle}`, shop }).catch(() => undefined);
  }

    console.log(`[Webhook products/create] Auto-optimized "${title}"`);
    return json({ success: true, optimized: true, productId, geoScore: optimization.aiScore });
  } catch (genErr: any) {
    // Gemini failure / rate limit: release the claim so the merchant can optimize manually later.
    // Return 200 so Shopify does not hammer us with retries while the AI quota is exhausted.
    console.warn(`[Webhook products/create] Auto-optimize failed for ${productId}:`, genErr?.message || genErr);
    await db.productOptimization
      .updateMany({ where: { productId, status: "AUTO_OPTIMIZING" }, data: { status: "NEEDS_OPTIMIZATION" } })
      .catch(() => undefined);
    await db.autopilotLog
      .create({ data: { shop, productId, actionType: "AUTO_OPTIMIZE_FAILED", details: `Auto-optimize skipped for "${title}": AI unavailable or rate-limited. Optimize manually from the dashboard.` } })
      .catch(() => undefined);
    return json({ success: true, optimized: false, message: "AI unavailable; left as NEEDS_OPTIMIZATION" });
  }

  } catch (error) {
    console.error("[Webhook products/create] Unhandled error:", error);
    return new Response(null, { status: 200 });
  }
};
