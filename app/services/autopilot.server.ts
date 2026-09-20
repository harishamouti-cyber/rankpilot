import { db } from "~/db.server";
import { getShopifyProducts, applyOptimizationToProduct } from "./shopify.server";
import { optimizeProductWithAI } from "./gemini.server";
import { pingIndexNow } from "./indexnow.server";

export interface AutopilotScanResult {
  shop: string;
  totalScanned: number;
  inventoryTransitions: number;
  autoOptimizedCount: number;
  indexNowDispatched: boolean;
  actions: string[];
}

/**
 * Runs an automated Autopilot scan on the catalog:
 * 1. Checks inventory levels & updates JSON-LD schema availability (InStock vs OutOfStock).
 * 2. Identifies unoptimized products and automatically optimizes them.
 * 3. Dispatches IndexNow pings to search engines.
 * 4. Records actions in AutopilotLog.
 */
export async function runAutopilotScan(
  shop: string = "demo.myshopify.com"
): Promise<AutopilotScanResult> {
  const products = await getShopifyProducts(shop);
  const setting = await db.appSetting.findUnique({ where: { shop } });
  const domain = setting?.storeDomain || "demo.myshopify.com";

  let inventoryTransitions = 0;
  let autoOptimizedCount = 0;
  const actions: string[] = [];
  const updatedUrls: string[] = [];

  for (const product of products) {
    // 1. Check Inventory & Schema Drift
    const isOutOfStock = product.totalInventory <= 0;
    let currentSchema: any = null;
    if (product.rankpilotMetafields.schemaJson) {
      try {
        currentSchema = JSON.parse(product.rankpilotMetafields.schemaJson);
      } catch {
        currentSchema = null;
      }
    }

    if (currentSchema && currentSchema.offers) {
      const currentAvailability = currentSchema.offers.itemAvailability;
      const expectedAvailability = isOutOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock";

      if (currentAvailability !== expectedAvailability) {
        currentSchema.offers.itemAvailability = expectedAvailability;
        inventoryTransitions++;

        const transitionText = `Updated schema itemAvailability to ${
          isOutOfStock ? "OutOfStock" : "InStock"
        } (Stock: ${product.totalInventory})`;
        actions.push(`${product.title}: ${transitionText}`);

        await db.autopilotLog.create({
          data: {
            shop,
            productId: product.id,
            actionType: "SCHEMA_AVAILABILITY_CHANGE",
            details: transitionText,
          },
        });

        updatedUrls.push(`https://${domain}/products/${product.handle}`);
      }
    }

    // 2. Auto-optimize if product is not optimized yet
    if (product.optimizationStatus !== "OPTIMIZED") {
      try {
        const optimization = await optimizeProductWithAI(
          {
            title: product.title,
            descriptionHtml: product.descriptionHtml,
            vendor: product.vendor,
            productType: product.productType,
            tags: product.tags,
            price: product.priceRange.minVariantPrice.amount,
            currency: product.priceRange.minVariantPrice.currencyCode,
            handle: product.handle,
          },
          shop
        );

        await applyOptimizationToProduct({
          productId: product.id,
          shop,
          currentProduct: product,
          optimization,
        });

        autoOptimizedCount++;
        const optText = `Autopilot auto-optimized product copy (Score: ${optimization.aiScore}/100)`;
        actions.push(`${product.title}: ${optText}`);

        await db.autopilotLog.create({
          data: {
            shop,
            productId: product.id,
            actionType: "AUTO_OPTIMIZE",
            details: optText,
          },
        });

        updatedUrls.push(`https://${domain}/products/${product.handle}`);
      } catch (optErr) {
        console.warn(`Autopilot failed to optimize ${product.id}:`, optErr);
      }
    }
  }

  // 3. Dispatch IndexNow ping for all modified items
  let indexNowDispatched = false;
  if (updatedUrls.length > 0) {
    try {
      await pingIndexNow({
        host: domain,
        urls: updatedUrls,
        key: setting?.indexNowKey || undefined,
        shop,
      });
      indexNowDispatched = true;
    } catch (pingErr) {
      console.warn("Autopilot IndexNow ping failed:", pingErr);
    }
  }

  return {
    shop,
    totalScanned: products.length,
    inventoryTransitions,
    autoOptimizedCount,
    indexNowDispatched,
    actions,
  };
}

export async function getAutopilotLogs(shop: string = "demo.myshopify.com") {
  return await db.autopilotLog.findMany({
    where: { shop },
    orderBy: { timestamp: "desc" },
    take: 30,
  });
}
