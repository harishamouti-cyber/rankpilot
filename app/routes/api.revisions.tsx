import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session: __rpSession } = await authenticate.admin(request);
  const shop = __rpSession.shop;
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return json({ error: "productId parameter is required" }, { status: 400 });
  }

  const revisions = await db.revisionHistory.findMany({
    where: { shop, productId },
    orderBy: { createdAt: "desc" },
  });

  return json({ success: true, revisions });
};
