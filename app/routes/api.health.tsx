import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let dbStatus = "healthy";
  try {
    // Quick probe to verify SQLite connection
    await db.$queryRaw`SELECT 1`;
  } catch (e: any) {
    dbStatus = `degraded: ${e.message}`;
  }

  return json(
    {
      status: dbStatus === "healthy" ? "ok" : "degraded",
      app: "RankPilot",
      version: "1.0.0",
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      shopifyApiKey: process.env.SHOPIFY_API_KEY ? `${process.env.SHOPIFY_API_KEY.slice(0, 6)}...` : "missing",
      shopifyApiSecretConfigured: Boolean(process.env.SHOPIFY_API_SECRET && process.env.SHOPIFY_API_SECRET !== "rankpilot_dev_secret"),
      shopifyApiSecretLength: process.env.SHOPIFY_API_SECRET?.length || 0,
      shopifyApiSecretPrefix: process.env.SHOPIFY_API_SECRET ? `${process.env.SHOPIFY_API_SECRET.slice(0, 4)}...` : "missing",
      timestamp: new Date().toISOString(),
    },
    {
      status: dbStatus === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
};
