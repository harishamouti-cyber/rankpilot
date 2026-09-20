import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { extractCompetitorData, mineCompetitorReviewSentiment } from "~/services/competitor.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { competitorUrl, productId, productTitle, shop = "demo.myshopify.com" } = body;

    if (!competitorUrl || typeof competitorUrl !== "string") {
      return json({ error: "competitorUrl is required" }, { status: 400 });
    }

    const data = await extractCompetitorData(competitorUrl);
    let sentiment = null;

    if (productId && productTitle) {
      sentiment = await mineCompetitorReviewSentiment({
        competitorUrl,
        productId,
        productTitle,
        shop,
      });
    }

    return json({ success: true, data, sentiment });
  } catch (error: any) {
    console.error("api.competitor error:", error);
    return json({ error: error.message || "Failed to extract competitor data" }, { status: 500 });
  }
};
