import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";

export const headers: HeadersFunction = ({ parentHeaders }) => {
  if (parentHeaders) {
    return parentHeaders;
  }
  return new Headers();
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop") || "demo.myshopify.com";
  const isPreview =
    shopParam.includes("demo") ||
    url.searchParams.get("preview") === "true";
  const apiKey = process.env.SHOPIFY_API_KEY || "82464865c45f23d73b21b486de6ace7a";

  try {
    const { session } = await authenticate.admin(request);
    return json({ apiKey, shop: session.shop, isEmbedded: true });
  } catch (error) {
    if (error instanceof Response && !isPreview) {
      throw error;
    }
    return json({ apiKey, shop: shopParam, isEmbedded: false });
  }
};

export default function AppLayout() {
  useLoaderData<typeof loader>();
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--p-color-bg-surface-secondary, #f6f6f7)" }}>
      <Outlet />
    </div>
  );
}
