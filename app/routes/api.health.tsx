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
