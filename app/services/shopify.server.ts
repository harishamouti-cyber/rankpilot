import { db } from "~/db.server";
import { OptimizationResult } from "./gemini.server";

export interface ShopifyProductItem {
  [key: string]: unknown;
  id: string; // e.g. gid://shopify/Product/8472917263
  title: string;
  handle: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  totalInventory: number;
  featuredImage?: {
    url: string;
    altText?: string;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  seo: {
    title?: string;
    description?: string;
  };
  rankpilotMetafields: {
    specMatrix?: string;
    schemaJson?: string;
    faqJson?: string;
    seoScore?: number;
  };
  optimizationStatus: "OPTIMIZED" | "NOT_OPTIMIZED" | "PENDING" | "NEEDS_OPTIMIZATION" | "AI_READY";
  aiScore: number;
  geoScore?: number;
  hasRollback: boolean;
  lastOptimizedAt?: string;
}

// In-memory / database synced demo catalog for offline & development mode
const INITIAL_DEMO_PRODUCTS: ShopifyProductItem[] = [
  {
    id: "gid://shopify/Product/9182371901",
    title: "Raw unoptimized backpack 26L",
    handle: "raw-unoptimized-backpack-26l",
    descriptionHtml: "<p>A durable, weather-resistant backpack for daily commuting and weekend travel. Basic unformatted description without technical specs or comparison tables.</p>",
    vendor: "Vanguard Gear",
    productType: "Luggage & Bags",
    tags: ["backpack", "travel", "waterproof", "edc"],
    totalInventory: 45,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
      altText: "Raw unoptimized backpack 26L",
    },
    priceRange: {
      minVariantPrice: { amount: "129.00", currencyCode: "USD" },
    },
    seo: {
      title: "Raw unoptimized backpack 26L",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/9182371902",
    title: "Titanium Armor Apple Watch Ultra Band 49mm",
    handle: "titanium-armor-apple-watch-ultra-band-49mm",
    descriptionHtml: "<p>Grade 2 titanium link bracelet engineered specifically for Apple Watch Ultra. DLC scratch-resistant coating with dual magnetic clasp.</p>",
    vendor: "Apex Elements",
    productType: "Watch Accessories",
    tags: ["titanium", "apple-watch", "wearables", "ultra"],
    totalInventory: 18,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
      altText: "Titanium Armor Apple Watch Band",
    },
    priceRange: {
      minVariantPrice: { amount: "179.00", currencyCode: "USD" },
    },
    seo: {
      title: "Titanium Apple Watch Ultra Band (Grade 2 Titanium) | Apex",
      description: "Custom Grade 2 Titanium link bracelet for Apple Watch Ultra. DLC coated, ultralight, magnetic deployment clasp. Order with free express delivery.",
    },
    rankpilotMetafields: {
      specMatrix: "<table class='rankpilot-spec-matrix'><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Material</td><td>Grade 2 Aerospace Titanium + DLC Scratch-Resistant Coating</td></tr><tr><td>Compatibility</td><td>Apple Watch Ultra 1/2 (49mm) & Series 10/9/8 (45mm/44mm)</td></tr><tr><td>Clasp Type</td><td>Dual Magnetic Deployment Clasp (Ultra-Secure)</td></tr><tr><td>Weight & Dimensions</td><td>68 grams | Adjustable 140mm - 225mm wrist circumference</td></tr><tr><td>Water Resistance</td><td>100m Ocean / Saltwater & Sweat Proof</td></tr><tr><td>Warranty</td><td>Lifetime Structural Warranty + Free Sizing Tool</td></tr></tbody></table>",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Titanium Armor Apple Watch Ultra Band 49mm",
        offers: { "@type": "Offer", price: "179.00", priceCurrency: "USD", availability: "https://schema.org/InStock" }
      }),
      faqJson: JSON.stringify([
        { question: "Will this titanium band scratch easily during daily workouts?", answer: "No. The band is coated with Diamond-Like Carbon (DLC) matte finish, providing 5x higher scratch resistance than standard stainless steel." },
        { question: "Is this compatible with the Apple Watch Ultra 2 49mm?", answer: "Yes, precision-machined 49mm titanium end lugs ensure a zero-gap factory fit for both Apple Watch Ultra 1 and Ultra 2." },
        { question: "Can I adjust the link size myself without a jeweler?", answer: "Yes, each order includes a precision stainless steel link removal tool with 6 micro-adjustment pins." }
      ]),
      seoScore: 96,
    },
    optimizationStatus: "AI_READY",
    aiScore: 96,
    geoScore: 96,
    hasRollback: true,
    lastOptimizedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: "gid://shopify/Product/9182371903",
    title: "Raw unoptimized insulated bottle 32oz",
    handle: "raw-unoptimized-insulated-bottle-32oz",
    descriptionHtml: "<p>Double-wall vacuum insulated stainless steel water bottle with built-in magnetic phone mount lid. Keeps drinks cold for 24 hours.</p>",
    vendor: "Vanguard Gear",
    productType: "Kitchen & Dining",
    tags: ["tumbler", "magsafe", "insulated", "gym"],
    totalInventory: 92,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
      altText: "Raw unoptimized insulated bottle 32oz",
    },
    priceRange: {
      minVariantPrice: { amount: "48.00", currencyCode: "USD" },
    },
    seo: {
      title: "Raw unoptimized insulated bottle 32oz",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/9182371904",
    title: "QuantumGrip MagSafe Wireless Car Vent Charger 15W",
    handle: "quantumgrip-magsafe-wireless-car-vent-charger-15w",
    descriptionHtml: "<p>Ultra-strong N52 neodymium magnetic car mount with active cooling fan and Qi2 15W fast wireless charging for iPhone and Android devices.</p>",
    vendor: "Apex Elements",
    productType: "Automotive & Mobile",
    tags: ["charger", "magsafe", "car-mount", "qi2"],
    totalInventory: 64,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80",
      altText: "QuantumGrip MagSafe Car Charger",
    },
    priceRange: {
      minVariantPrice: { amount: "59.95", currencyCode: "USD" },
    },
    seo: {
      title: "15W Qi2 MagSafe Car Charger Mount with Active Cooling | Apex",
      description: "Fast 15W Qi2 wireless car charger with active cooling and N52 magnets. Guaranteed zero-slip grip on any vent. Ships free today with 2-year warranty.",
    },
    rankpilotMetafields: {
      specMatrix: "<table class='rankpilot-spec-matrix'><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Charging Standard</td><td>Official Qi2 Certified 15W Fast Wireless Charging</td></tr><tr><td>Magnet Array</td><td>16x N52 Neodymium Magnets (Holds up to 1.8kg)</td></tr><tr><td>Thermal System</td><td>Silent Active Cooling Turbine Fan (Prevents Phone Throttling)</td></tr><tr><td>Mounting Mechanism</td><td>Steel-Core Hook Lock Clip for Standard & Round AC Vents</td></tr><tr><td>Input Power</td><td>USB-C PD 3.0 (Includes 36W Dual USB-C 12V Car Adapter)</td></tr><tr><td>Warranty</td><td>2-Year Replacement Warranty + 30-Day Money-Back Guarantee</td></tr></tbody></table>",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "QuantumGrip MagSafe Wireless Car Vent Charger 15W",
        offers: { "@type": "Offer", price: "59.95", priceCurrency: "USD", availability: "https://schema.org/InStock" }
      }),
      faqJson: JSON.stringify([
        { question: "Does the charger overheat during navigation with Apple Maps?", answer: "No. The active aerodynamic cooling turbine prevents your iPhone from overheating and thermal throttling." },
        { question: "Will this mount securely on round air conditioning vents?", answer: "Yes, the steel-reinforced hook mechanism secures firmly onto both horizontal and vertical louvers without slipping." },
        { question: "Does it charge at the full 15W speed for iPhone 15 and 16?", answer: "Yes, certified Qi2 hardware delivers full 15W wireless power identical to Apple MagSafe." }
      ]),
      seoScore: 96,
    },
    optimizationStatus: "AI_READY",
    aiScore: 96,
    geoScore: 96,
    hasRollback: true,
    lastOptimizedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "gid://shopify/Product/9182371905",
    title: "Zenith ANC Wireless Noise-Cancelling Headphones",
    handle: "zenith-anc-wireless-headphones",
    descriptionHtml: "<p>Over-ear wireless headphones with hybrid active noise cancellation, 40-hour battery life, and spatial audio support with head tracking.</p>",
    vendor: "Aura Acoustics",
    productType: "Electronics & Audio",
    tags: ["headphones", "anc", "bluetooth", "spatial-audio"],
    totalInventory: 31,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
      altText: "Zenith ANC Wireless Headphones",
    },
    priceRange: {
      minVariantPrice: { amount: "249.00", currencyCode: "USD" },
    },
    seo: {
      title: "Zenith ANC Wireless Headphones (Spatial Audio & 40H Battery) | Aura",
      description: "Studio-grade hybrid active noise cancelling headphones. 40-hour battery, lossless LDAC codec, and personalized spatial audio. Shop with 30-day trial.",
    },
    rankpilotMetafields: {
      specMatrix: "<table class='rankpilot-spec-matrix'><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Noise Cancellation</td><td>Hybrid 4-Mic Active Noise Cancellation (-42dB attenuation)</td></tr><tr><td>Driver Architecture</td><td>40mm Custom Bio-Cellulose Dynamic Drivers</td></tr><tr><td>Battery Life</td><td>40 Hours (ANC ON) / 60 Hours (ANC OFF) | Fast Charge 10m = 5h</td></tr><tr><td>Bluetooth & Codecs</td><td>Bluetooth 5.4, LDAC, aptX Adaptive, AAC, SBC</td></tr><tr><td>Microphone Array</td><td>6-Beamforming Mics with AI Wind Noise Suppression</td></tr><tr><td>Warranty</td><td>2-Year Global Manufacturer Warranty & 30-Day Audition Trial</td></tr></tbody></table>",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Zenith ANC Wireless Noise-Cancelling Headphones",
        offers: { "@type": "Offer", price: "249.00", priceCurrency: "USD", availability: "https://schema.org/InStock" }
      }),
      faqJson: JSON.stringify([
        { question: "How does the active noise cancellation compare to industry flagships?", answer: "The custom quad-microphone hybrid array suppresses up to 42dB of low-frequency ambient noise, ideal for flights and busy offices." },
        { question: "Can I connect to both my MacBook and iPhone simultaneously?", answer: "Yes, Bluetooth Multipoint allows seamless auto-switching between two paired devices without manual re-pairing." },
        { question: "What codecs are supported for high-resolution lossless audio?", answer: "Zenith supports Sony LDAC (up to 990kbps 24bit/96kHz), aptX Adaptive, AAC, and standard SBC." }
      ]),
      seoScore: 96,
    },
    optimizationStatus: "AI_READY",
    aiScore: 96,
    geoScore: 96,
    hasRollback: true,
    lastOptimizedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

/**
 * Modern Shopify Admin GraphQL Queries
 */
export const GET_PRODUCTS_QUERY = `#graphql
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      title
      handle
      descriptionHtml
      vendor
      productType
      tags
      totalInventory
      featuredImage {
        url
        altText
      }
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      seo {
        title
        description
      }
      metafields(first: 10, namespace: "rankpilot") {
        nodes {
          key
          value
        }
      }
    }
  }
}
`;

/**
 * Modern Shopify 2025/2026 productSet Mutation
 */
export const PRODUCT_SET_MUTATION = `#graphql
mutation productSet($input: ProductSetInput!) {
  productSet(input: $input) {
    product {
      id
      title
      handle
      seo {
        title
        description
      }
      metafields(first: 10, namespace: "rankpilot") {
        nodes {
          key
          value
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export interface GraphQLThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
  requestedQueryCost?: number;
  actualQueryCost?: number;
}

export interface GraphQLExtensions {
  cost?: {
    requestedQueryCost: number;
    actualQueryCost?: number;
    throttleStatus: GraphQLThrottleStatus;
  };
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Production-Grade GraphQL Execution with Adaptive Rate-Limiting & Throttling Buffer.
 * Inspects `extensions.cost.throttleStatus`.
 * If `currentlyAvailable < 100`, introduces an automated asynchronous exponential backoff delay:
 * sleep((100 - currentlyAvailable) / restoreRate * 1000).
 * Handles HTTP 429 and "THROTTLED" errors with automated retry backoff.
 */
export async function executeGraphQLWithThrottling<T = any>(
  adminClient: any,
  query: string,
  variables: Record<string, any> = {},
  maxRetries: number = 3
): Promise<{ data: T; extensions?: GraphQLExtensions }> {
  if (!adminClient || typeof adminClient.graphql !== "function") {
    throw new Error("Invalid or unauthenticated adminClient provided to executeGraphQLWithThrottling");
  }

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await adminClient.graphql(query, { variables });
      const jsonResult = await response.json();

      // Check extensions cost and throttleStatus
      const throttleStatus = jsonResult?.extensions?.cost?.throttleStatus as GraphQLThrottleStatus | undefined;
      if (throttleStatus) {
        const { currentlyAvailable, restoreRate = 50 } = throttleStatus;
        if (currentlyAvailable < 100) {
          const needed = 100 - currentlyAvailable;
          const waitMs = Math.max(800, Math.ceil((needed / restoreRate) * 1000));
          console.warn(
            `[Throttling Engine] GraphQL credit buffer low (${currentlyAvailable}/1000 points). Backing off for ${waitMs}ms to maintain rate limit safety margin.`
          );
          await sleep(waitMs);
        }
      }

      // Check for Shopify userErrors or top-level errors with THROTTLED
      if (
        jsonResult.errors &&
        jsonResult.errors.some(
          (e: any) =>
            e.message?.toLowerCase().includes("throttled") ||
            e.extensions?.code === "THROTTLED"
        )
      ) {
        throw new Error("THROTTLED: Rate limit reached");
      }

      return jsonResult;
    } catch (error: any) {
      attempt++;
      const isThrottled =
        error.message?.includes("THROTTLED") ||
        error.message?.includes("429") ||
        error.status === 429;

      if (attempt >= maxRetries || !isThrottled) {
        throw error;
      }

      const backoffMs = Math.min(10000, 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500));
      console.warn(
        `[Throttling Engine] 429/Throttling detected. Backing off for ${backoffMs}ms (attempt ${attempt}/${maxRetries})...`
      );
      await sleep(backoffMs);
    }
  }

  throw new Error("GraphQL execution failed after max retries due to rate limit throttling");
}

/**
 * Splits array into chunks of specified size (default: 50 SKUs)
 */
export function chunkArray<T>(items: T[], size: number = 50): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Batches large catalog operations into chunks of 50 SKUs using sequential task workers.
 * Ensures background jobs never trigger 429 errors or serverless execution timeouts.
 */
export async function batchExecuteProductUpdates<T, R>(
  items: T[],
  workerFn: (item: T) => Promise<R>,
  batchSize: number = 50,
  delayBetweenBatchesMs: number = 250
): Promise<{ results: R[]; totalProcessed: number; failedCount: number }> {
  const chunks = chunkArray(items, batchSize);
  const results: R[] = [];
  let failedCount = 0;

  console.log(
    `[Batch Engine] Starting sequential processing of ${items.length} items across ${chunks.length} batches (size: ${batchSize}).`
  );

  for (let batchIdx = 0; batchIdx < chunks.length; batchIdx++) {
    const chunk = chunks[batchIdx];
    console.log(`[Batch Engine] Processing batch ${batchIdx + 1}/${chunks.length} (${chunk.length} items)...`);

    for (const item of chunk) {
      try {
        const res = await workerFn(item);
        results.push(res);
      } catch (err) {
        console.warn(`[Batch Engine] Item in batch ${batchIdx + 1} encountered error:`, err);
        failedCount++;
      }
    }

    // Safety pause between batches to allow Shopify GraphQL leaky bucket to refill
    if (batchIdx < chunks.length - 1) {
      await sleep(delayBetweenBatchesMs);
    }
  }

  console.log(`[Batch Engine] Batch processing completed. Success: ${results.length}, Failed: ${failedCount}.`);
  return { results, totalProcessed: results.length + failedCount, failedCount };
}

/**
 * Fetches products list. First checks local DB cache and demo catalog,
 * and if a live Shopify session exists, queries Shopify Admin GraphQL API.
 */
export async function getShopifyProducts(
  shop: string = "demo.myshopify.com",
  adminClient?: any
): Promise<ShopifyProductItem[]> {
  // Check if we have optimizations in local SQLite DB
  const storedOptimizations = await db.productOptimization.findMany({
    where: { shop },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const optimizationMap = new Map(
    storedOptimizations.map((item) => [item.productId, item])
  );

  let products = [...INITIAL_DEMO_PRODUCTS];

  // If live adminClient is provided, query Shopify GraphQL with automated rate-limiting
  if (adminClient && typeof adminClient.graphql === "function") {
    try {
      const data = await executeGraphQLWithThrottling<any>(adminClient, GET_PRODUCTS_QUERY, { first: 50 });
      if (data?.data?.products?.nodes) {
        products = data.data.products.nodes.map((node: any) => {
          const specMatrixNode = node.metafields?.nodes?.find(
            (m: any) => m.key === "spec_matrix"
          );
          const schemaJsonNode = node.metafields?.nodes?.find(
            (m: any) => m.key === "schema_json"
          );
          const faqJsonNode = node.metafields?.nodes?.find(
            (m: any) => m.key === "faq_json"
          );
          const seoScoreNode = node.metafields?.nodes?.find(
            (m: any) => m.key === "seo_score"
          );

          return {
            id: node.id,
            title: node.title,
            handle: node.handle,
            descriptionHtml: node.descriptionHtml || "",
            vendor: node.vendor || "",
            productType: node.productType || "",
            tags: node.tags || [],
            totalInventory: node.totalInventory ?? 0,
            featuredImage: node.featuredImage,
            priceRange: {
              minVariantPrice: {
                amount: node.priceRangeV2?.minVariantPrice?.amount || "0.00",
                currencyCode: node.priceRangeV2?.minVariantPrice?.currencyCode || "USD",
              },
            },
            seo: {
              title: node.seo?.title || "",
              description: node.seo?.description || "",
            },
            rankpilotMetafields: {
              specMatrix: specMatrixNode?.value,
              schemaJson: schemaJsonNode?.value,
              faqJson: faqJsonNode?.value,
              seoScore: seoScoreNode?.value ? parseInt(seoScoreNode.value, 10) : undefined,
            },
            optimizationStatus: (seoScoreNode?.value && parseInt(seoScoreNode.value, 10) >= 80)
              ? "OPTIMIZED"
              : "NOT_OPTIMIZED",
            aiScore: seoScoreNode?.value ? parseInt(seoScoreNode.value, 10) : 40,
            hasRollback: false,
          };
        });
      }
    } catch (e) {
      console.warn("Shopify GraphQL fetch failed, using local catalog:", e);
    }
  }

  // Merge with local SQLite optimization status
  return products.map((prod) => {
    const opt = optimizationMap.get(prod.id);
    if (opt) {
      return {
        ...prod,
        title: opt.optimizedTitle || prod.title,
        seo: {
          title: opt.optimizedTitle || prod.seo.title,
          description: opt.optimizedMetaDesc || prod.seo.description,
        },
        optimizationStatus: opt.status as any,
        aiScore: opt.aiScore,
        geoScore: opt.aiScore,
        hasRollback: opt.revisions.length > 0,
        lastOptimizedAt: opt.lastOptimizedAt?.toISOString(),
        rankpilotMetafields: {
          specMatrix: opt.specMatrixHtml || prod.rankpilotMetafields.specMatrix,
          schemaJson: opt.schemaJson || prod.rankpilotMetafields.schemaJson,
          faqJson: opt.faqJson || prod.rankpilotMetafields.faqJson,
          seoScore: opt.aiScore,
        },
      };
    }
    return {
      ...prod,
      geoScore: prod.aiScore,
    };
  });
}

/**
 * Applies AI Optimization to a product:
 * 1. Takes snapshot into RevisionHistory for instant 1-click rollback.
 * 2. Updates SQLite ProductOptimization record.
 * 3. If Shopify Admin client is connected, executes productSet GraphQL mutation.
 */
export async function applyOptimizationToProduct({
  productId,
  shop = "demo.myshopify.com",
  currentProduct,
  optimization,
  adminClient,
}: {
  productId: string;
  shop?: string;
  currentProduct: ShopifyProductItem;
  optimization: OptimizationResult;
  adminClient?: any;
}) {
  // 1. Snapshot prior state for Rollback & Safety Engine
  let optRecord = await db.productOptimization.findUnique({
    where: { shop_productId: { shop, productId } },
  });

  if (!optRecord) {
    optRecord = await db.productOptimization.create({
      data: {
        productId,
        shop,
        title: currentProduct.title,
        handle: currentProduct.handle,
        originalTitle: currentProduct.title,
        originalDescription: currentProduct.descriptionHtml,
        status: "AI_READY",
        aiScore: optimization.aiScore,
        optimizedTitle: optimization.seoTitle,
        optimizedMetaDesc: optimization.seoDescription,
        specMatrixHtml: optimization.specMatrixHtml,
        faqJson: JSON.stringify(optimization.faqList),
        schemaJson: JSON.stringify(optimization.schemaJson),
        lastOptimizedAt: new Date(),
      },
    });
  }

  // Create Snapshot in RevisionHistory
  await db.revisionHistory.create({
    data: {
      productOptimizationId: optRecord.id,
      productId,
      shop,
      titleSnapshot: currentProduct.title,
      bodyHtmlSnapshot: currentProduct.descriptionHtml,
      seoTitleSnapshot: currentProduct.seo.title || currentProduct.title,
      seoDescriptionSnapshot: currentProduct.seo.description || "",
      metafieldsSnapshot: JSON.stringify(currentProduct.rankpilotMetafields),
      rolledBack: false,
    },
  });

  // Update record with optimized data
  await db.productOptimization.update({
    where: { id: optRecord.id },
    data: {
      status: "AI_READY",
      aiScore: optimization.aiScore,
      optimizedTitle: optimization.seoTitle,
      optimizedMetaDesc: optimization.seoDescription,
      specMatrixHtml: optimization.specMatrixHtml,
      faqJson: JSON.stringify(optimization.faqList),
      schemaJson: JSON.stringify(optimization.schemaJson),
      lastOptimizedAt: new Date(),
    },
  });

  // Update in-memory initial demo products cache
  const demoItem = INITIAL_DEMO_PRODUCTS.find((p) => p.id === productId);
  if (demoItem) {
    demoItem.seo.title = optimization.seoTitle;
    demoItem.seo.description = optimization.seoDescription;
    demoItem.optimizationStatus = "AI_READY";
    demoItem.aiScore = optimization.aiScore;
    demoItem.geoScore = optimization.aiScore;
    demoItem.hasRollback = true;
    demoItem.lastOptimizedAt = new Date().toISOString();
    demoItem.rankpilotMetafields = {
      specMatrix: optimization.specMatrixHtml,
      schemaJson: JSON.stringify(optimization.schemaJson),
      faqJson: JSON.stringify(optimization.faqList),
      seoScore: optimization.aiScore,
    };
  }

  // 2. Modern Shopify GraphQL productSet mutation
  if (adminClient && typeof adminClient.graphql === "function") {
    try {
      const metafields = [
        {
          namespace: "rankpilot",
          key: "spec_matrix",
          type: "multi_line_text_field",
          value: optimization.specMatrixHtml,
        },
        {
          namespace: "rankpilot",
          key: "spec_table",
          type: "multi_line_text_field",
          value: optimization.specMatrixHtml,
        },
        {
          namespace: "rankpilot",
          key: "schema_json",
          type: "json",
          value: JSON.stringify(optimization.schemaJson),
        },
        {
          namespace: "rankpilot",
          key: "faq_json",
          type: "json",
          value: JSON.stringify(optimization.faqList),
        },
        {
          namespace: "rankpilot",
          key: "seo_score",
          type: "number_integer",
          value: optimization.aiScore.toString(),
        },
      ];

      const input = {
        id: productId,
        seo: {
          title: optimization.seoTitle,
          description: optimization.seoDescription,
        },
        metafields,
      };

      const res = await executeGraphQLWithThrottling(adminClient, PRODUCT_SET_MUTATION, { input });
      const userErrors = res.data?.productSet?.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.warn(
          `[Shopify GraphQL] productSet returned userErrors: ${userErrors.map((u: any) => u.message).join(", ")}`
        );
      }
    } catch (e) {
      console.warn("GraphQL productSet mutation error:", e);
    }
  }

  return { success: true, aiScore: optimization.aiScore };
}

/**
 * 1-Click Rollback Engine:
 * Reverts product to the most recent snapshot stored in RevisionHistory.
 */
export async function rollbackProduct({
  productId,
  shop = "demo.myshopify.com",
  adminClient,
}: {
  productId: string;
  shop?: string;
  adminClient?: any;
}) {
  const optRecord = await db.productOptimization.findUnique({
    where: { shop_productId: { shop, productId } },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!optRecord || optRecord.revisions.length === 0) {
    throw new Error("No previous revision snapshot found to roll back to.");
  }

  const snapshot = optRecord.revisions[0];

  // Mark revision as rolled back
  await db.revisionHistory.update({
    where: { id: snapshot.id },
    data: { rolledBack: true },
  });

  // Reset ProductOptimization state in SQLite
  await db.productOptimization.update({
    where: { id: optRecord.id },
    data: {
      status: "NEEDS_OPTIMIZATION",
      geoScore: 38,
      aiScore: 38,
      optimizedTitle: snapshot.seoTitleSnapshot,
      optimizedMetaDesc: snapshot.seoDescriptionSnapshot,
      specMatrixHtml: null,
      faqJson: null,
      schemaJson: null,
    },
  });

  // Revert in-memory demo item
  const demoItem = INITIAL_DEMO_PRODUCTS.find((p) => p.id === productId);
  if (demoItem) {
    demoItem.title = snapshot.titleSnapshot || demoItem.title;
    demoItem.seo.title = snapshot.seoTitleSnapshot || snapshot.titleSnapshot || undefined;
    demoItem.seo.description = snapshot.seoDescriptionSnapshot || "";
    demoItem.optimizationStatus = "NEEDS_OPTIMIZATION";
    demoItem.aiScore = 38;
    demoItem.geoScore = 38;
    demoItem.hasRollback = false;
    demoItem.rankpilotMetafields = {};
  }

  // Restore via productSet mutation with rate-limiting protection if connected
  if (adminClient && typeof adminClient.graphql === "function") {
    try {
      const input = {
        id: productId,
        seo: {
          title: snapshot.seoTitleSnapshot || snapshot.titleSnapshot,
          description: snapshot.seoDescriptionSnapshot || "",
        },
        metafields: [
          {
            namespace: "rankpilot",
            key: "seo_score",
            type: "number_integer",
            value: "38",
          },
        ],
      };
      const res = await executeGraphQLWithThrottling(adminClient, PRODUCT_SET_MUTATION, { input });
      const userErrors = res.data?.productSet?.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.warn(
          `[Shopify GraphQL Rollback] productSet returned userErrors: ${userErrors.map((u: any) => u.message).join(", ")}`
        );
      }
    } catch (e) {
      console.warn("GraphQL rollback error:", e);
    }
  }

  return { success: true, restoredTitle: snapshot.seoTitleSnapshot };
}
