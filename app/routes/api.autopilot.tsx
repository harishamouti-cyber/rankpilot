import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { runAutopilotScan, getAutopilotLogs } from "~/services/autopilot.server";
import { authenticate, unauthenticated } from "~/shopify.server";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";

  const logs = await getAutopilotLogs(shop);
  const setting = await db.appSetting.findUnique({ where: { shop } });

  return json({
    autopilotEnabled: setting?.autopilotEnabled ?? true,
    logs,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { shop = "demo.myshopify.com", toggleEnabled } = body;

    let adminClient: any = null;
    let effectiveShop = shop;

    try {
      const auth = await authenticate.admin(request);
      adminClient = auth.admin;
      if (auth.session?.shop) {
        effectiveShop = auth.session.shop;
      }
    } catch {
      try {
        const unauth = await unauthenticated.admin(shop);
        adminClient = unauth.admin;
      } catch {
        // Fallback for standalone demo
      }
    }

    if (typeof toggleEnabled === "boolean") {
      const updated = await db.appSetting.upsert({
        where: { shop: effectiveShop },
        create: { shop: effectiveShop, autopilotEnabled: toggleEnabled },
        update: { autopilotEnabled: toggleEnabled },
      });
      return json({ success: true, autopilotEnabled: updated.autopilotEnabled });
    }

    // Trigger on-demand Autopilot run with live adminClient
    const result = await runAutopilotScan(effectiveShop, adminClient);
    return json({ success: true, result });
  } catch (error: any) {
    console.error("api.autopilot error:", error);
    return json({ error: error.message || "Autopilot execution failed" }, { status: 500 });
  }
};
