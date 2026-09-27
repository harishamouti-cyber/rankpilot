import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "~/shopify.server";
import { GET_PRODUCTS_QUERY, executeGraphQLWithThrottling } from "~/services/shopify.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "rankpilot-xk8wrvgu.myshopify.com";

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    shop,
    url: request.url,
    hasAuthHeader: Boolean(request.headers.get("authorization")),
    authHeaderSnippet: request.headers.get("authorization") ? request.headers.get("authorization")?.slice(0, 20) + "..." : null,
    apiKeyConfigured: process.env.SHOPIFY_API_KEY ? "EXISTS" : "FALLBACK",
    apiSecretConfigured: process.env.SHOPIFY_API_SECRET ? "EXISTS" : "FALLBACK",
  };

  // 1. Check sessions stored in database
  try {
    const sessions = await db.session.findMany({ where: { shop } });
    diagnostics.storedSessionsCount = sessions.length;
    diagnostics.storedSessions = sessions.map((s) => ({
      id: s.id,
      shop: s.shop,
      isOnline: s.isOnline,
      expires: s.expires,
      hasAccessToken: Boolean(s.accessToken),
      tokenLength: s.accessToken?.length || 0,
    }));
  } catch (dbErr: any) {
    diagnostics.dbError = dbErr.message;
  }

  // 2. Try authenticate.admin(request)
  let adminClient: any = null;
  try {
    const auth = await authenticate.admin(request);
    adminClient = auth.admin;
    diagnostics.authenticateAdminSuccess = true;
    diagnostics.sessionShop = auth.session?.shop;
  } catch (authErr: any) {
    diagnostics.authenticateAdminSuccess = false;
    diagnostics.authenticateAdminError = authErr instanceof Response ? `Response ${authErr.status}` : authErr?.message || String(authErr);
  }

  // 3. Try unauthenticated.admin(shop) if adminClient is not yet obtained
  if (!adminClient) {
    try {
      const unauth = await unauthenticated.admin(shop);
      adminClient = unauth.admin;
      diagnostics.unauthenticatedAdminSuccess = true;
    } catch (unauthErr: any) {
      diagnostics.unauthenticatedAdminSuccess = false;
      diagnostics.unauthenticatedAdminError = unauthErr?.message || String(unauthErr);
    }
  }

  // 4. Test GraphQL with adminClient if available
  if (adminClient) {
    try {
      const testRes = await adminClient.graphql(`{ shop { name myshopifyDomain currencyCode } }`);
      const testData = await testRes.json();
      diagnostics.shopQuerySuccess = true;
      diagnostics.shopData = testData?.data?.shop;
      diagnostics.shopErrors = testData?.errors;
    } catch (testErr: any) {
      diagnostics.shopQuerySuccess = false;
      diagnostics.shopQueryError = testErr.message;
    }

    try {
      const prodRes = await executeGraphQLWithThrottling(adminClient, GET_PRODUCTS_QUERY, { first: 50 });
      diagnostics.productsQuerySuccess = true;
      diagnostics.productsCount = prodRes?.data?.products?.nodes?.length ?? 0;
      diagnostics.productsNodesSnippet = prodRes?.data?.products?.nodes?.slice(0, 3).map((p: any) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
      }));
      diagnostics.productsErrors = (prodRes as any)?.errors;
    } catch (prodErr: any) {
      diagnostics.productsQuerySuccess = false;
      diagnostics.productsQueryError = prodErr.message;
    }
  }

  return json(diagnostics);
};
