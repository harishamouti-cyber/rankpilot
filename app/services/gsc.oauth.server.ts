/**
 * Real Google Search Console OAuth + Search Analytics (scaffold).
 * OFF unless GSC_ENABLED=true and GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REDIRECT_URI are set.
 * Scope: webmasters.readonly (read-only). Nothing here writes to Search Console.
 */
import crypto from "node:crypto";
import { db } from "~/db.server";
import { isGscEnabled } from "~/services/gsc.server";

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function stateSecret() {
  return process.env.SHOPIFY_API_SECRET || "";
}

export function signState(shop: string): string {
  const payload = Buffer.from(JSON.stringify({ shop, t: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string | null {
  const [payload, sig] = (state || "").split(".");
  if (!payload || !sig || !stateSecret()) return null;
  const expected = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const { shop, t } = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (Date.now() - t > 15 * 60 * 1000) return null;
  return typeof shop === "string" && shop.endsWith(".myshopify.com") ? shop : null;
}

export function buildAuthUrl(shop: string): string | null {
  if (!isGscEnabled() || !process.env.GSC_REDIRECT_URI) return null;
  const p = new URLSearchParams({
    client_id: process.env.GSC_CLIENT_ID!,
    redirect_uri: process.env.GSC_REDIRECT_URI,
    response_type: "code",
    scope: GSC_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: signState(shop),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCodeAndStore(shop: string, code: string): Promise<boolean> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GSC_CLIENT_ID!,
      client_secret: process.env.GSC_CLIENT_SECRET!,
      redirect_uri: process.env.GSC_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return false;
  const tok = await res.json();
  if (!tok.refresh_token) return false;
  const siteUrl = await pickSite(tok.access_token, shop);
  await db.storeConfig.upsert({
    where: { shop },
    create: { shop, gscConnected: true, gscRefreshToken: tok.refresh_token, gscPropertyId: siteUrl },
    update: { gscConnected: true, gscRefreshToken: tok.refresh_token, gscPropertyId: siteUrl },
  });
  return true;
}

async function accessTokenFor(shop: string): Promise<{ token: string; site: string } | null> {
  const cfg = await db.storeConfig.findUnique({ where: { shop } });
  if (!cfg?.gscRefreshToken || !cfg.gscPropertyId) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GSC_CLIENT_ID!,
      client_secret: process.env.GSC_CLIENT_SECRET!,
      refresh_token: cfg.gscRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return { token: (await res.json()).access_token, site: cfg.gscPropertyId };
}

/** Choose the verified property that matches the store's domain (domain property or URL prefix). */
async function pickSite(accessToken: string, shop: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const sites: { siteUrl: string; permissionLevel: string }[] = (await res.json()).siteEntry || [];
  const setting = await db.appSetting.findUnique({ where: { shop } });
  const domain = (setting?.storeDomain || shop).replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");
  const usable = sites.filter((s) => s.permissionLevel !== "siteUnverifiedUser");
  return (
    usable.find((s) => s.siteUrl === `sc-domain:${domain}`)?.siteUrl ||
    usable.find((s) => s.siteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") === domain)?.siteUrl ||
    null
  );
}

/**
 * Pull last-28-day query+page rows from Search Analytics and store real
 * "striking distance" queries (avg position 4–15, >=100 impressions) for product pages.
 */
export async function syncStrikingQueries(shop: string): Promise<number> {
  if (!isGscEnabled()) return 0;
  const auth = await accessTokenFor(shop);
  if (!auth) return 0;
  const end = new Date(Date.now() - 3 * 864e5);
  const start = new Date(end.getTime() - 28 * 864e5);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(auth.site)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ["query", "page"],
        dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/products/" }] }],
        rowLimit: 5000,
      }),
    }
  );
  if (!res.ok) return 0;
  const rows: any[] = (await res.json()).rows || [];
  const products = await db.productOptimization.findMany({ where: { shop }, select: { productId: true, productHandle: true, handle: true } });
  const byHandle = new Map(products.map((p) => [p.productHandle || p.handle, p.productId]));
  const striking = rows.filter((r) => r.position >= 4 && r.position <= 15 && r.impressions >= 100);
  await db.strikingDistanceQuery.deleteMany({ where: { shop, status: { not: "BOOSTED" } } });
  let n = 0;
  for (const r of striking) {
    const handle = String(r.keys[1]).split("/products/")[1]?.split(/[/?#]/)[0];
    const productId = handle && byHandle.get(handle);
    if (!productId) continue;
    await db.strikingDistanceQuery.create({
      data: { shop, productId, query: r.keys[0], impressions: Math.round(r.impressions), clicks: Math.round(r.clicks), position: r.position, ctr: r.ctr, status: "PENDING" },
    });
    n++;
  }
  return n;
}
