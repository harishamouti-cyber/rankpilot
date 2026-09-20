import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { pingIndexNow, getRecentIndexNowLogs } from "~/services/indexnow.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";
  const logs = await getRecentIndexNowLogs(shop);
  return json({ success: true, logs });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { host, urls, key, shop = "demo.myshopify.com" } = body;

    const setting = await db.appSetting.findUnique({ where: { shop } });
    const effectiveHost = host || setting?.storeDomain || "store.myshopify.com";
    const effectiveKey = key || setting?.indexNowKey || undefined;

    const targetUrls =
      Array.isArray(urls) && urls.length > 0
        ? urls
        : [`https://${effectiveHost}/`];

    const result = await pingIndexNow({
      host: effectiveHost,
      urls: targetUrls,
      key: effectiveKey,
      shop,
    });

    return json({ success: true, result });
  } catch (error: any) {
    console.error("api.indexnow error:", error);
    return json({ error: error.message || "Failed to ping IndexNow" }, { status: 500 });
  }
};
