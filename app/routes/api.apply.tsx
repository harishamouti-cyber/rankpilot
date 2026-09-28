import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getShopifyProducts, applyOptimizationToProduct, ShopifyProductItem } from "~/services/shopify.server";
import { pingIndexNow } from "~/services/indexnow.server";
import { authenticate, unauthenticated } from "~/shopify.server";
import { db } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { productId, shop = "demo.myshopify.com", optimization, currentProduct: clientProduct } = body;

    if (!productId || !optimization) {
      return json({ error: "productId and optimization are required" }, { status: 400 });
    }

    let adminClient: any = null;
    let effectiveShop = shop;

    try {
      const auth = await authenticate.admin(request);
      adminClient = auth.admin;
      if (auth.session?.shop) {
        effectiveShop = auth.session.shop;
      }
    } catch {
      try {
        const unauth = await unauthenticated.admin(shop);
        adminClient = unauth.admin;
      } catch {
        // Fallback for standalone demo
      }
    }

    let currentProduct: ShopifyProductItem | undefined = clientProduct;
    if (!currentProduct) {
      const products = await getShopifyProducts(effectiveShop, adminClient);
      currentProduct = products.find((p) => p.id === productId);
    }

    if (!currentProduct) {
      return json({ error: `Product ${productId} not found in store catalog` }, { status: 404 });
    }

    // Apply optimization with snapshot revision history and live Shopify GraphQL sync
    const result = await applyOptimizationToProduct({
      productId,
      shop: effectiveShop,
      currentProduct,
      optimization,
      adminClient,
    });

    // Check if autoPingIndexNow is enabled
    const setting = await db.appSetting.findUnique({ where: { shop: effectiveShop } });
    const autoPing = setting?.autoPingIndexNow ?? true;
    const storeDomain = setting?.storeDomain || effectiveShop || "demo.myshopify.com";

    let indexNowResult = null;
    if (autoPing && currentProduct.handle) {
      const productUrl = `https://${storeDomain}/products/${currentProduct.handle}`;
      try {
        indexNowResult = await pingIndexNow({
          host: storeDomain,
          urls: [productUrl],
          key: setting?.indexNowKey || undefined,
          shop: effectiveShop,
        });
      } catch (pingErr) {
        console.warn("[api.apply] IndexNow ping notice:", pingErr);
      }
    }

    return json({
      success: true,
      result,
      shopifySynced: result.shopifySynced ?? false,
      warning: result.warning,
      updatedDescriptionHtml: result.descriptionHtml,
      imageAltText: optimization.imageAltText,
      indexNowPinged: autoPing,
      indexNowResult,
    });
  } catch (error: any) {
    console.error("api.apply error:", error);
    return json({ success: false, error: error.message || "Failed to apply optimization" }, { status: 500 });
  }
};
