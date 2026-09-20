import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getShopifyProducts } from "~/services/shopify.server";
import { optimizeProductWithAI } from "~/services/gemini.server";
import { extractCompetitorData } from "~/services/competitor.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { productId, shop = "demo.myshopify.com", competitorUrl } = body;

    if (!productId) {
      return json({ error: "productId is required" }, { status: 400 });
    }

    const products = await getShopifyProducts(shop);
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }

    let competitorData;
    if (competitorUrl && typeof competitorUrl === "string" && competitorUrl.trim() !== "") {
      try {
        competitorData = await extractCompetitorData(competitorUrl.trim());
      } catch (e) {
        console.warn("Could not extract competitor:", e);
      }
    }

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
        competitorData: competitorData
          ? {
              url: competitorData.url,
              title: competitorData.title,
              extractedKeywords: competitorData.extractedKeywords,
              specifications: competitorData.specifications,
            }
          : undefined,
      },
      shop
    );

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
