import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { rollbackProduct } from "~/services/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { productId, shop = "demo.myshopify.com" } = body;

    if (!productId) {
      return json({ error: "productId is required" }, { status: 400 });
    }

    const result = await rollbackProduct({ productId, shop });
    return json({ success: true, result });
  } catch (error: any) {
    const isNotFound = error.message?.includes("No previous revision snapshot");
    if (!isNotFound) {
      console.error("api.rollback error:", error);
    }
    const status = isNotFound ? 404 : 500;
    return json({ error: error.message || "Failed to rollback product" }, { status });
  }
};
