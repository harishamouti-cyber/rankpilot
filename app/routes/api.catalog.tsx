import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "~/shopify.server";
import { getShopifyProducts } from "~/services/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") || "demo.myshopify.com";
  let adminClient: any = null;
  let authError: string | null = null;

  try {
    const auth = await authenticate.admin(request);
    adminClient = auth.admin;
    if (auth.session?.shop) {
      shop = auth.session.shop;
    }
  } catch (e: any) {
    if (e instanceof Response) {
      throw e;
    }
    authError = e?.message || String(e);
    try {
      const unauth = await unauthenticated.admin(shop);
      adminClient = unauth.admin;
    } catch (uErr: any) {
      authError += " | unauth: " + (uErr?.message || String(uErr));
    }
  }

  const products = await getShopifyProducts(shop, adminClient);
  const isLive = Boolean(adminClient) && !products.some((p) => p.id === "gid://shopify/Product/9182371901");

  return json({
    success: true,
    shop,
    isLive,
    products,
    totalProducts: products.length,
    authError,
  });
};
