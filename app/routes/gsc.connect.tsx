import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { buildAuthUrl } from "~/services/gsc.oauth.server";

// Opened top-level (window.open) from the embedded app. Off unless GSC_ENABLED=true.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = buildAuthUrl(session.shop);
  if (!url) return redirect("/app");
  return redirect(url);
};
