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
  const apiKey = process.env.SHOPIFY_API_KEY || "rankpilot_dev_key";
  try {
    const { session } = await authenticate.admin(request);
    return json({ apiKey, shop: session.shop, isEmbedded: true });
  } catch {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") || "demo.myshopify.com";
    return json({ apiKey, shop, isEmbedded: false });
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
