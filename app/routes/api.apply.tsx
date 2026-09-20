import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getShopifyProducts, applyOptimizationToProduct } from "~/services/shopify.server";
import { pingIndexNow } from "~/services/indexnow.server";
import { db } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { productId, shop = "demo.myshopify.com", optimization } = body;

    if (!productId || !optimization) {
      return json({ error: "productId and optimization are required" }, { status: 400 });
    }

    const products = await getShopifyProducts(shop);
    const currentProduct = products.find((p) => p.id === productId);

    if (!currentProduct) {
      return json({ error: "Product not found" }, { status: 404 });
    }

    // Apply optimization with snapshot revision history
    const result = await applyOptimizationToProduct({
      productId,
      shop,
      currentProduct,
      optimization,
    });

    // Check if autoPingIndexNow is enabled
    const setting = await db.appSetting.findUnique({ where: { shop } });
    const autoPing = setting?.autoPingIndexNow ?? true;
    const storeDomain = setting?.storeDomain || "demo.myshopify.com";

    let indexNowResult = null;
    if (autoPing) {
      const productUrl = `https://${storeDomain}/products/${currentProduct.handle}`;
      indexNowResult = await pingIndexNow({
        host: storeDomain,
        urls: [productUrl],
        key: setting?.indexNowKey || undefined,
        shop,
      });
    }

    return json({
      success: true,
      result,
      indexNowPinged: autoPing,
      indexNowResult,
    });
  } catch (error: any) {
    console.error("api.apply error:", error);
    return json({ error: error.message || "Failed to apply optimization" }, { status: 500 });
  }
};
