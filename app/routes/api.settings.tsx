import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { db } from "~/db.server";

const MASK = "••••";
export function maskSecret(v?: string | null) {
  return v ? `${MASK}${v.slice(-4)}` : "";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session: __rpSession } = await authenticate.admin(request);
  const shop = __rpSession.shop;
  const url = new URL(request.url);

  let setting = await db.appSetting.findUnique({ where: { shop } });
  if (!setting) {
    setting = await db.appSetting.create({
      data: {
        shop,
        storeDomain: "store.myshopify.com",
        autoPingIndexNow: true,
        isOnboarded: false,
      },
    });
  }

  return json({
    success: true,
    setting: {
      geminiApiKey: maskSecret(setting.geminiApiKey),
      indexNowKey: setting.indexNowKey || "",
      autoPingIndexNow: setting.autoPingIndexNow,
      storeDomain: setting.storeDomain || "store.myshopify.com",
      isOnboarded: setting.isOnboarded,
      plan: setting.plan,
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session: __rpSession } = await authenticate.admin(request);
  const shop = __rpSession.shop;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      geminiApiKey,
      indexNowKey,
      autoPingIndexNow,
      storeDomain,
      isOnboarded,
      autopilotEnabled,
      autoOptimizeNewProducts,
    } = body;

    const dataToUpdate: any = {};
    // Masked value coming back from the UI means "unchanged".
    if (geminiApiKey !== undefined && !String(geminiApiKey).startsWith(MASK))
      dataToUpdate.geminiApiKey = geminiApiKey?.trim() || null;
    if (indexNowKey !== undefined) dataToUpdate.indexNowKey = indexNowKey?.trim() || null;
    if (autoPingIndexNow !== undefined) dataToUpdate.autoPingIndexNow = autoPingIndexNow === true || autoPingIndexNow === "true";
    if (storeDomain !== undefined) dataToUpdate.storeDomain = storeDomain?.trim() || null;
    if (isOnboarded !== undefined) dataToUpdate.isOnboarded = Boolean(isOnboarded);
    if (autopilotEnabled !== undefined) dataToUpdate.autopilotEnabled = autopilotEnabled === true || autopilotEnabled === "true";

    const updated = await db.appSetting.upsert({
      where: { shop },
      create: {
        shop,
        ...dataToUpdate,
      },
      update: dataToUpdate,
    });

    // Also sync to StoreConfig
    const configUpdate: any = {};
    if (isOnboarded !== undefined) configUpdate.isOnboarded = Boolean(isOnboarded);
    if (autoOptimizeNewProducts !== undefined)
      configUpdate.zeroClickAutopilot = autoOptimizeNewProducts === true || autoOptimizeNewProducts === "true";

    if (Object.keys(configUpdate).length > 0) {
      await db.storeConfig.upsert({
        where: { shop },
        create: {
          shop,
          ...configUpdate,
        },
        update: configUpdate,
      });
    }

    return json({
      success: true,
      setting: {
        geminiApiKey: maskSecret(updated.geminiApiKey),
        indexNowKey: updated.indexNowKey || "",
        autoPingIndexNow: updated.autoPingIndexNow,
        autopilotEnabled: updated.autopilotEnabled,
        storeDomain: updated.storeDomain,
        isOnboarded: updated.isOnboarded,
        plan: updated.plan,
      },
    });
  } catch (error: any) {
    console.error("api.settings error:", error?.message);
    return json({ error: "Failed to update settings" }, { status: 500 });
  }
};
