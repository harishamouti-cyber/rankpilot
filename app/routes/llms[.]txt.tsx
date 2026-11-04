import type { LoaderFunctionArgs } from "@remix-run/node";
import { getShopifyProducts } from "~/services/shopify.server";
import { db } from "~/db.server";
import { unauthenticated } from "~/shopify.server";

const notFound = () =>
  new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = (url.searchParams.get("shop") || "").trim().toLowerCase();

  // Only serve shops that actually installed the app (valid domain + stored offline session).
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return notFound();
  const session = await db.session.findFirst({ where: { shop, isOnline: false } }).catch(() => null);
  if (!session) return notFound();

  let admin: any = null;
  try {
    admin = (await unauthenticated.admin(shop)).admin;
  } catch {
    return notFound();
  }

  const setting = await db.appSetting.findUnique({ where: { shop } });
  const domain = (setting?.storeDomain || shop).replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const products = await getShopifyProducts(shop, admin);

  const markdownLines: string[] = [
    `# ${domain} product index`,
    `> Product catalog summary for AI assistants and search crawlers.`,
    ``,
    `## Store Identity`,
    `- Primary Domain: https://${domain}`,
    `- Platform: Shopify`,
    ``,
    `## Products`,
  ];

  for (const product of products.slice(0, 100)) {
    const price = product.priceRange.minVariantPrice.amount;
    const currency = product.priceRange.minVariantPrice.currencyCode;
    const productUrl = `https://${domain}/products/${product.handle}`;
    const cleanDesc = product.descriptionHtml.replace(/<[^>]+>/g, " ").trim();

    markdownLines.push(`### [${product.title}](${productUrl})`);
    markdownLines.push(`- **Price**: ${price} ${currency}`);
    markdownLines.push(`- **Inventory**: ${product.totalInventory > 0 ? "In stock" : "Check product page"}`);
    markdownLines.push(`- **Vendor**: ${product.vendor}`);
    markdownLines.push(`- **Category**: ${product.productType}`);
    markdownLines.push(`- **Tags**: ${product.tags.join(", ")}`);
    markdownLines.push(`- **SEO Title**: ${product.seo?.title || product.title}`);
    markdownLines.push(`- **Meta Description**: ${product.seo?.description || cleanDesc.slice(0, 150)}`);
    markdownLines.push(`- **Description Summary**: ${cleanDesc}`);

    if (product.rankpilotMetafields?.faqJson) {
      try {
        const faqs = JSON.parse(product.rankpilotMetafields.faqJson);
        if (Array.isArray(faqs) && faqs.length > 0) {
          markdownLines.push(`- **Frequently Asked Buyer Questions**:`);
          for (const faq of faqs) {
            markdownLines.push(`  - Q: ${faq.question}`);
            markdownLines.push(`    A: ${faq.answer}`);
          }
        }
      } catch {
        // ignore parse error
      }
    }

    markdownLines.push(``);
  }

  markdownLines.push(`## Notes`);
  markdownLines.push(`Prices and availability can change; the product URLs above are the source of truth.`);

  return new Response(markdownLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "all",
    },
  });
};
