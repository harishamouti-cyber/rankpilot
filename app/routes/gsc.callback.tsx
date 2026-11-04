import type { LoaderFunctionArgs } from "@remix-run/node";
import { isGscEnabled } from "~/services/gsc.server";
import { verifyState, exchangeCodeAndStore, syncStrikingQueries } from "~/services/gsc.oauth.server";

const page = (msg: string, status = 200) =>
  new Response(`<!doctype html><meta charset="utf-8"><p style="font-family:sans-serif">${msg}</p>`, {
    status,
    headers: { "Content-Type": "text/html" },
  });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!isGscEnabled()) return page("Not found", 404);
  const url = new URL(request.url);
  const shop = verifyState(url.searchParams.get("state") || "");
  const code = url.searchParams.get("code");
  if (!shop || !code) return page("Search Console connection failed or expired. Close this tab and try again.", 400);
  const ok = await exchangeCodeAndStore(shop, code);
  if (!ok) return page("Google did not return access. Close this tab and try again.", 400);
  const n = await syncStrikingQueries(shop).catch(() => 0);
  return page(`Search Console connected. Found ${n} real queries close to page 1. You can close this tab.`);
};
