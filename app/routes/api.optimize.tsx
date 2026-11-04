import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getShopifyProducts, ShopifyProductItem } from "~/services/shopify.server";
import { optimizeProductWithAI, productInputFromItem, computeBaselineScore } from "~/services/gemini.server";
import { extractCompetitorData } from "~/services/competitor.server";
import { authenticate, unauthenticated } from "~/shopify.server";
import { db } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session: __rpSession } = await authenticate.admin(request);
  const shop = __rpSession.shop;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { productId, competitorUrl, product: clientProduct } = body;

    if (!productId) {
      return json({ error: "productId is required" }, { status: 400 });
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

    let product: ShopifyProductItem | undefined = clientProduct;

    if (!product) {
      const products = await getShopifyProducts(effectiveShop, adminClient);
      product = products.find((p) => p.id === productId);
    }

    if (!product) {
      return json({ error: `Product ${productId} not found in store catalog` }, { status: 404 });
    }

    let competitorData;
    if (competitorUrl && typeof competitorUrl === "string" && competitorUrl.trim() !== "") {
      try {
        competitorData = await extractCompetitorData(competitorUrl.trim());
      } catch (e) {
        console.warn("Could not extract competitor:", e);
      }
    }

    const setting = await db.appSetting.findUnique({ where: { shop: effectiveShop } });
    const storeDomain = setting?.storeDomain || effectiveShop || "demo.myshopify.com";

    const optimization = await optimizeProductWithAI(
      productInputFromItem(product, storeDomain, {
        competitorData: competitorData
          ? {
              url: competitorData.url,
              title: competitorData.title,
              extractedKeywords: competitorData.extractedKeywords,
              specifications: competitorData.specifications,
            }
          : undefined,
      }),
      effectiveShop
    );
    optimization.baselineScore = computeBaselineScore(product);

    return json({
      success: true,
      productId,
      product,
      optimization,
      competitorData: competitorData || null,
    });
  } catch (error: any) {
    console.error("api.optimize error:", error);
    return json({ error: error.message || "Failed to optimize product" }, { status: 500 });
  }
};
