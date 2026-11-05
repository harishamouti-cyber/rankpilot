import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { readCollectionIntent } from "~/services/collection_seo";
import {
  createShopifyCollectionPort,
  handleAuthenticatedCollectionRequest,
} from "~/services/collection_seo.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const cursor = new URL(request.url).searchParams.get("after");
  const result = await handleAuthenticatedCollectionRequest({
    session,
    shop: session.shop,
    intent: "read",
    cursor,
    port: createShopifyCollectionPort(admin),
  });
  return json(result.body, { status: result.status });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed", wroteToShopify: false }, { status: 405 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "A JSON body is required.", wroteToShopify: false, code: "BAD_JSON" }, { status: 400 });
  }

  const intent = readCollectionIntent(body);
  const result = await handleAuthenticatedCollectionRequest({
    session,
    shop: session.shop,
    intent: intent.intent,
    collectionId: intent.collectionId,
    previewId: intent.previewId,
    approved: intent.approved,
    port: createShopifyCollectionPort(admin),
  });
  return json(result.body, { status: result.status });
};
