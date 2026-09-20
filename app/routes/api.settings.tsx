import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";

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
      geminiApiKey: setting.geminiApiKey || "",
      indexNowKey: setting.indexNowKey || "",
      autoPingIndexNow: setting.autoPingIndexNow,
      storeDomain: setting.storeDomain || "store.myshopify.com",
      isOnboarded: setting.isOnboarded,
      plan: setting.plan,
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      shop = "demo.myshopify.com",
      geminiApiKey,
      indexNowKey,
      autoPingIndexNow,
      storeDomain,
      isOnboarded,
      autopilotEnabled,
    } = body;

    const dataToUpdate: any = {};
    if (geminiApiKey !== undefined) dataToUpdate.geminiApiKey = geminiApiKey?.trim() || null;
    if (indexNowKey !== undefined) dataToUpdate.indexNowKey = indexNowKey?.trim() || null;
    if (autoPingIndexNow !== undefined) dataToUpdate.autoPingIndexNow = Boolean(autoPingIndexNow);
    if (storeDomain !== undefined) dataToUpdate.storeDomain = storeDomain?.trim() || null;
    if (isOnboarded !== undefined) dataToUpdate.isOnboarded = Boolean(isOnboarded);
    if (autopilotEnabled !== undefined) dataToUpdate.autopilotEnabled = Boolean(autopilotEnabled);

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
    if (autopilotEnabled !== undefined) configUpdate.zeroClickAutopilot = Boolean(autopilotEnabled);

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

    return json({ success: true, setting: updated });
  } catch (error: any) {
    console.error("api.settings error:", error);
    return json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
};
