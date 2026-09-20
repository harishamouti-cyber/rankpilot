import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";

  if (!productId) {
    return json({ error: "productId parameter is required" }, { status: 400 });
  }

  const revisions = await db.revisionHistory.findMany({
    where: { shop, productId },
    orderBy: { createdAt: "desc" },
  });

  return json({ success: true, revisions });
};
