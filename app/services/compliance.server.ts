import crypto from "crypto";
import { db } from "~/db.server";

/**
 * Validates Shopify Webhook HMAC header manually when needed.
 */
export function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return true; // allow in dev/test simulation
  const secret = process.env.SHOPIFY_API_SECRET || "rankpilot_dev_secret";
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

/**
 * Handles customers/data_request
 * RankPilot stores zero end-customer PII.
 */
export async function handleCustomerDataRequest(payload: any) {
  console.log("[GDPR Compliance] Processing customers/data_request:", payload?.customer?.id);
  return {
    success: true,
    message: "No customer PII is stored by RankPilot. App operates strictly on product catalog SEO metadata and schema markup.",
    customer: payload?.customer || null,
    orders_requested: payload?.orders_requested || [],
  };
}

/**
 * Handles customers/redact
 * RankPilot stores zero customer PII, nothing to delete.
 */
export async function handleCustomerRedact(payload: any) {
  console.log("[GDPR Compliance] Processing customers/redact for customer:", payload?.customer?.id);
  return {
    success: true,
    message: "Customer redact acknowledged. No customer PII exists within RankPilot database.",
  };
}

/**
 * Handles shop/redact
 * Dispatched by Shopify 48 hours post-uninstall to completely purge all shop data.
 */
export async function handleShopRedact(shopDomain: string) {
  console.log(`[GDPR Compliance] Executing 48hr shop/redact purge for: ${shopDomain}`);
  try {
    await db.revisionHistory.deleteMany({ where: { shop: shopDomain } });
    await db.productOptimization.deleteMany({ where: { shop: shopDomain } });
    await db.indexNowLog.deleteMany({ where: { shop: shopDomain } });
    await db.autopilotLog.deleteMany({ where: { shop: shopDomain } });
    await db.citationMetric.deleteMany({ where: { shop: shopDomain } });
    await db.strikingDistanceQuery.deleteMany({ where: { shop: shopDomain } });
    await db.stockoutRedirect.deleteMany({ where: { shop: shopDomain } });
    await db.competitorTracker.deleteMany({ where: { shop: shopDomain } });
    await db.performanceDigest.deleteMany({ where: { shop: shopDomain } });
    await db.storeConfig.deleteMany({ where: { shop: shopDomain } });
    await db.session.deleteMany({ where: { shop: shopDomain } });
    await db.appSetting.deleteMany({ where: { shop: shopDomain } });

    console.log(`[GDPR Compliance] ✓ Store data completely erased for: ${shopDomain}`);
    return { success: true, message: `Successfully redacted and purged all store data for ${shopDomain}` };
  } catch (error: any) {
    console.error(`[GDPR Compliance] Error redacting shop ${shopDomain}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Handles app/uninstalled webhook
 * Marks the store status as INACTIVE, deactivates autopilot, invalidates cached sessions,
 * and resets active subscriptions.
 */
export async function handleAppUninstalled(shopDomain: string) {
  console.log(`[Shopify Webhook] Processing APP_UNINSTALLED for: ${shopDomain}`);
  try {
    // 1. Invalidate all stored offline/online sessions
    await db.session.deleteMany({ where: { shop: shopDomain } });

    // 2. Mark StoreConfig and AppSetting as INACTIVE and disable 24/7 autopilot
    await db.storeConfig.updateMany({
      where: { shop: shopDomain },
      data: {
        zeroClickAutopilot: false,
        subscriptionId: null,
      },
    });

    await db.appSetting.upsert({
      where: { shop: shopDomain },
      create: {
        shop: shopDomain,
        status: "INACTIVE",
        autopilotEnabled: false,
        autoPingIndexNow: false,
      },
      update: {
        status: "INACTIVE",
        autopilotEnabled: false,
        autoPingIndexNow: false,
        subscriptionId: null,
      },
    });

    // 3. Log uninstall event for audit trail
    await db.autopilotLog.create({
      data: {
        shop: shopDomain,
        productId: "GLOBAL_APP",
        actionType: "APP_UNINSTALLED",
        details: "Store uninstalled RankPilot. Sessions revoked and autopilot disabled.",
      },
    });

    console.log(`[Shopify Webhook] ✓ APP_UNINSTALLED completed for: ${shopDomain}`);
    return { success: true, message: `App marked inactive and sessions revoked for ${shopDomain}` };
  } catch (error: any) {
    console.error(`[Shopify Webhook] Error processing APP_UNINSTALLED for ${shopDomain}:`, error);
    return { success: false, error: error.message };
  }
}
