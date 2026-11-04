import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "~/shopify.server";
import { getShopifyProducts } from "~/services/shopify.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session: __rpSession } = await authenticate.admin(request);
  const shop = __rpSession.shop;
  const url = new URL(request.url);
  let adminClient: any = null;
  let authError: string | null = null;

  try {
    const auth = await authenticate.admin(request);
    adminClient = auth.admin;
    if (auth.session?.shop) {
    }
  } catch (e: any) {
    authError = e?.message || (e instanceof Response ? `Response ${e.status}` : String(e));
    try {
      const unauth = await unauthenticated.admin(shop);
      adminClient = unauth.admin;
    } catch (uErr: any) {
      authError += " | unauth: " + (uErr?.message || String(uErr));
    }
  }

  if (url.searchParams.get("purge") === "true") {
    try {
      await db.session.deleteMany({ where: { shop } });
    } catch {}
  }

  const products = await getShopifyProducts(shop, adminClient);
  const isLive = Boolean(adminClient);

  return json({
    success: true,
    shop,
    isLive,
    products,
    totalProducts: products.length,
    authError,
  });
};
