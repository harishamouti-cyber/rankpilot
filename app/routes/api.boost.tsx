import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getStrikingDistanceQueries, boostQueryToPage1 } from "~/services/gsc.server";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";
  const queries = await getStrikingDistanceQueries(shop);
  return json({ queries });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let admin: any = null;
  try {
    const auth = await authenticate.admin(request);
    admin = auth.admin;
  } catch {
    // Demo / offline mode
  }

  try {
    const body = await request.json();
    const { shop = "demo.myshopify.com", productId, query } = body;

    if (!productId || !query) {
      return json({ error: "Missing productId or query" }, { status: 400 });
    }

    const result = await boostQueryToPage1({
      shop,
      productId,
      query,
      adminClient: admin,
    });

    return json({ ...result });
  } catch (err: any) {
    console.error("api.boost error:", err);
    return json({ error: err.message || "Failed to boost query" }, { status: 500 });
  }
};
