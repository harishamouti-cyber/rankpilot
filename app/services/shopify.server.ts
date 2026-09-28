import { db } from "~/db.server";
import { clearSessionCache } from "~/shopify.server";
import { OptimizationResult } from "./gemini.server";
import { updateProductMediaAltText } from "./vision.server";

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
  featuredMediaId?: string;
  imageAltText?: string;
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

// Live store catalog seed representing the active store inventory
const INITIAL_DEMO_PRODUCTS: ShopifyProductItem[] = [
  {
    id: "gid://shopify/Product/8472917001",
    title: "The Collection Snowboard: Liquid",
    handle: "the-collection-snowboard-liquid",
    descriptionHtml: "<p>Premium all-mountain directional snowboard designed for high-speed carving, powder flotation, and backcountry freestyle performance. Features carbon fiber stringers and sintered base.</p>",
    vendor: "Hydrogen Vendor",
    productType: "snowboard",
    tags: ["snowboard", "all-mountain", "winter", "freeride", "powder"],
    totalInventory: 50,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&auto=format&fit=crop&q=80",
      altText: "The Collection Snowboard: Liquid",
    },
    featuredMediaId: "gid://shopify/MediaImage/8472917001-media",
    imageAltText: "The Collection Snowboard Liquid matte carbon directional freeride snowboard on powder snow",
    priceRange: {
      minVariantPrice: { amount: "749.95", currencyCode: "USD" },
    },
    seo: {
      title: "The Collection Snowboard: Liquid (All-Mountain Carving & Powder)",
      description: "Handcrafted all-mountain snowboard with carbon stringers and sintered race base. Maximum edge hold and backcountry flotation. Order with free express shipping.",
    },
    rankpilotMetafields: {
      specMatrix: "<table class='rankpilot-spec-matrix'><thead><tr><th>Specification</th><th>Details & Measurements</th></tr></thead><tbody><tr><td>Profile & Camber</td><td>Directional Camber with 10mm Tapered Powder Tail</td></tr><tr><td>Core Materials</td><td>FSC Poplar & Paulownia Wood Core with Carbon V-Bars</td></tr><tr><td>Base Technology</td><td>Sintered Ultra-High-Molecular-Weight (UHMW) Base</td></tr><tr><td>Flex Rating</td><td>7/10 (Medium-Stiff All-Mountain Response)</td></tr><tr><td>Warranty</td><td>3-Year Manufacturer Warranty + Lifetime Edge Guarantee</td></tr></tbody></table>",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "The Collection Snowboard: Liquid",
        offers: { "@type": "Offer", price: "749.95", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      }),
      faqJson: JSON.stringify([
        { question: "What riding style is the Collection Snowboard Liquid designed for?", answer: "It is an all-mountain directional board built for aggressive carving, tree runs, and deep powder flotation." },
        { question: "Does this snowboard include pre-waxed base?", answer: "Yes, each board arrives factory pre-tuned with biological all-temperature ski wax ready to ride." },
        { question: "What is the warranty coverage?", answer: "Backed by a comprehensive 3-year structural warranty against core delamination and edge defects." },
      ]),
      seoScore: 96,
    },
    optimizationStatus: "AI_READY",
    aiScore: 96,
    geoScore: 96,
    hasRollback: true,
    lastOptimizedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "gid://shopify/Product/8472917002",
    title: "The Collection Snowboard: Oxygen",
    handle: "the-collection-snowboard-oxygen",
    descriptionHtml: "<p>Ultralight freeride snowboard with triaxial fiberglass matrix, basalt dampening, and titanium mounting inserts. Engineered for alpine racing and steep terrain.</p>",
    vendor: "Hydrogen Vendor",
    productType: "snowboard",
    tags: ["snowboard", "freeride", "alpine", "winter", "pro"],
    totalInventory: 50,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1522056615691-da7b8106c665?w=800&auto=format&fit=crop&q=80",
      altText: "The Collection Snowboard: Oxygen",
    },
    featuredMediaId: "gid://shopify/MediaImage/8472917002-media",
    imageAltText: "The Collection Snowboard Oxygen ultralight alpine freeride board with basalt dampening",
    priceRange: {
      minVariantPrice: { amount: "885.00", currencyCode: "USD" },
    },
    seo: {
      title: "The Collection Snowboard: Oxygen (Ultralight Freeride Performance)",
      description: "Aerospace-grade freeride snowboard with basalt dampening and titanium mounting inserts. Built for high-speed alpine stability. Shop with 30-day trial.",
    },
    rankpilotMetafields: {
      specMatrix: "<table class='rankpilot-spec-matrix'><thead><tr><th>Specification</th><th>Details & Measurements</th></tr></thead><tbody><tr><td>Profile</td><td>Pure Camber with Early Rise Nose for Float</td></tr><tr><td>Reinforcement</td><td>Titanium Binding Inlays & Basalt Vibration Dampeners</td></tr><tr><td>Base</td><td>Electra 9000 Graphite Race Base</td></tr><tr><td>Flex</td><td>8/10 (Stiff Freeride / High-Speed Stability)</td></tr><tr><td>Warranty</td><td>3-Year Manufacturer Warranty</td></tr></tbody></table>",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "The Collection Snowboard: Oxygen",
        offers: { "@type": "Offer", price: "885.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      }),
      faqJson: JSON.stringify([
        { question: "Is the Oxygen board suitable for intermediate riders?", answer: "Due to its stiff 8/10 flex rating and high-speed camber, it is best suited for advanced and expert riders." },
        { question: "How does basalt dampening improve chatter resistance?", answer: "Woven basalt volcanic fibers absorb high-frequency ice vibrations 3x more effectively than traditional fiberglass." },
      ]),
      seoScore: 96,
    },
    optimizationStatus: "AI_READY",
    aiScore: 96,
    geoScore: 96,
    hasRollback: true,
    lastOptimizedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "gid://shopify/Product/8472917003",
    title: "The 3p Fulfilled Snowboard",
    handle: "the-3p-fulfilled-snowboard",
    descriptionHtml: "<p>Handcrafted limited-edition freestyle snowboard with custom camber profile, seamless polyurethane sidewalls, and competition sintered race base.</p>",
    vendor: "rankpilot",
    productType: "snowboard",
    tags: ["snowboard", "freestyle", "park", "limited", "3p"],
    totalInventory: 20,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=800&auto=format&fit=crop&q=80",
      altText: "The 3p Fulfilled Snowboard",
    },
    featuredMediaId: "gid://shopify/MediaImage/8472917003-media",
    imageAltText: "",
    priceRange: {
      minVariantPrice: { amount: "2629.95", currencyCode: "USD" },
    },
    seo: {
      title: "The 3p Fulfilled Snowboard",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/8472917004",
    title: "The Multi-managed Snowboard",
    handle: "the-multi-managed-snowboard",
    descriptionHtml: "<p>Versatile twin-tip park snowboard with medium flex, extruded durable base, and reinforced steel edges for rails, jumps, and terrain park laps.</p>",
    vendor: "Multi-managed Vendor",
    productType: "snowboard",
    tags: ["snowboard", "park", "twin-tip", "freestyle"],
    totalInventory: 100,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1565992441121-4367c2967103?w=800&auto=format&fit=crop&q=80",
      altText: "The Multi-managed Snowboard",
    },
    featuredMediaId: "gid://shopify/MediaImage/8472917004-media",
    imageAltText: "The Multi-managed Snowboard twin-tip freestyle park board with reinforced steel edges",
    priceRange: {
      minVariantPrice: { amount: "629.95", currencyCode: "USD" },
    },
    seo: {
      title: "The Multi-managed Snowboard (Twin-Tip Freestyle & Park)",
      description: "True twin freestyle park snowboard engineered for rails and kickers. Extruded impact-resistant base and reinforced steel edges. Ships today.",
    },
    rankpilotMetafields: {
      specMatrix: "<table class='rankpilot-spec-matrix'><thead><tr><th>Specification</th><th>Details & Measurements</th></tr></thead><tbody><tr><td>Shape</td><td>True Twin (Identical Tip and Tail)</td></tr><tr><td>Flex</td><td>5/10 (Playful Park & Jib Flex)</td></tr><tr><td>Edges</td><td>Hardened Carbon Steel Rail Edges</td></tr><tr><td>Base</td><td>Impact-Resistant Extruded 4400 Base</td></tr><tr><td>Warranty</td><td>2-Year Limited Warranty</td></tr></tbody></table>",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "The Multi-managed Snowboard",
        offers: { "@type": "Offer", price: "629.95", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      }),
      faqJson: JSON.stringify([
        { question: "Is this board true twin or directional?", answer: "It is a 100% true twin board with identical nose and tail measurements, perfect for switch riding." },
      ]),
      seoScore: 94,
    },
    optimizationStatus: "AI_READY",
    aiScore: 94,
    geoScore: 94,
    hasRollback: true,
    lastOptimizedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: "gid://shopify/Product/8472917005",
    title: "The Multi-location Snowboard",
    handle: "the-multi-location-snowboard",
    descriptionHtml: "<p>All-terrain hybrid rocker/camber board engineered for quick edge-to-edge transitions, tree runs, and groomed resort cruising.</p>",
    vendor: "rankpilot",
    productType: "snowboard",
    tags: ["snowboard", "all-terrain", "hybrid", "resort"],
    totalInventory: 100,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800&auto=format&fit=crop&q=80",
      altText: "The Multi-location Snowboard",
    },
    priceRange: {
      minVariantPrice: { amount: "729.95", currencyCode: "USD" },
    },
    seo: {
      title: "The Multi-location Snowboard",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/8472917006",
    title: "The Out of Stock Snowboard",
    handle: "the-out-of-stock-snowboard",
    descriptionHtml: "<p>Championship powder swallowtail snowboard featuring 3D spoon nose contouring and deep powder setback stance.</p>",
    vendor: "rankpilot",
    productType: "snowboard",
    tags: ["snowboard", "powder", "swallowtail", "deep-snow"],
    totalInventory: 0,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?w=800&auto=format&fit=crop&q=80",
      altText: "The Out of Stock Snowboard",
    },
    priceRange: {
      minVariantPrice: { amount: "785.00", currencyCode: "USD" },
    },
    seo: {
      title: "The Out of Stock Snowboard",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/8472917007",
    title: "Selling Plans Ski Wax",
    handle: "selling-plans-ski-wax",
    descriptionHtml: "<p>High-fluoro biological ski and snowboard tuning wax formulated for sub-zero temperature speed glide and base hydration.</p>",
    vendor: "rankpilot",
    productType: "accessories",
    tags: ["accessories", "wax", "tuning", "maintenance"],
    totalInventory: 30,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=800&auto=format&fit=crop&q=80",
      altText: "Selling Plans Ski Wax",
    },
    priceRange: {
      minVariantPrice: { amount: "24.95", currencyCode: "USD" },
    },
    seo: {
      title: "Selling Plans Ski Wax",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/8472917008",
    title: "The Hidden Snowboard",
    handle: "the-hidden-snowboard",
    descriptionHtml: "<p>Stealth matte black freeride board with vibration-dampening cork topsheet and stiff directional flex for technical descents.</p>",
    vendor: "Snowboard Vendor",
    productType: "snowboard",
    tags: ["snowboard", "stealth", "blackout", "freeride"],
    totalInventory: 50,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1516728778615-2d590ea1855e?w=800&auto=format&fit=crop&q=80",
      altText: "The Hidden Snowboard",
    },
    priceRange: {
      minVariantPrice: { amount: "699.95", currencyCode: "USD" },
    },
    seo: {
      title: "The Hidden Snowboard",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/8472917009",
    title: "The Videographer Snowboard",
    handle: "the-videographer-snowboard",
    descriptionHtml: "<p>Action-sports media-ready snowboard with integrated action camera mounting inserts and vibration-free core.</p>",
    vendor: "rankpilot",
    productType: "snowboard",
    tags: ["snowboard", "videography", "camera-mount", "park"],
    totalInventory: 50,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=800&auto=format&fit=crop&q=80",
      altText: "The Videographer Snowboard",
    },
    priceRange: {
      minVariantPrice: { amount: "850.00", currencyCode: "USD" },
    },
    seo: {
      title: "The Videographer Snowboard",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/8472917010",
    title: "The Archived Snowboard",
    handle: "the-archived-snowboard",
    descriptionHtml: "<p>Vintage retro-graphic directional camber snowboard celebrating 90s snowboarding heritage with modern carbon construction.</p>",
    vendor: "Snowboard Vendor",
    productType: "snowboard",
    tags: ["snowboard", "vintage", "retro", "camber"],
    totalInventory: 50,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?w=800&auto=format&fit=crop&q=80",
      altText: "The Archived Snowboard",
    },
    priceRange: {
      minVariantPrice: { amount: "750.00", currencyCode: "USD" },
    },
    seo: {
      title: "The Archived Snowboard",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
  },
  {
    id: "gid://shopify/Product/8472917011",
    title: "The Collection Snowboard: Hydrogen",
    handle: "the-collection-snowboard-hydrogen",
    descriptionHtml: "<p>Benchmark all-mountain twin snowboard with poplar-paulownia wood core and carbon V-bars for explosive pop and edge control.</p>",
    vendor: "Hydrogen Vendor",
    productType: "snowboard",
    tags: ["snowboard", "all-mountain", "twin", "winter"],
    totalInventory: 50,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&auto=format&fit=crop&q=80",
      altText: "The Collection Snowboard: Hydrogen",
    },
    priceRange: {
      minVariantPrice: { amount: "600.00", currencyCode: "USD" },
    },
    seo: {
      title: "The Collection Snowboard: Hydrogen",
      description: "",
    },
    rankpilotMetafields: {},
    optimizationStatus: "NEEDS_OPTIMIZATION",
    aiScore: 38,
    geoScore: 38,
    hasRollback: false,
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
      media(first: 3) {
        nodes {
          id
          alt
          ... on MediaImage {
            id
            image {
              url
              altText
            }
          }
        }
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
      specMatrix: metafield(namespace: "rankpilot", key: "spec_matrix") {
        value
      }
      schemaJson: metafield(namespace: "rankpilot", key: "schema_json") {
        value
      }
      faqJson: metafield(namespace: "rankpilot", key: "faq_json") {
        value
      }
      seoScore: metafield(namespace: "rankpilot", key: "seo_score") {
        value
      }
    }
  }
}
`;

export const SAFE_GET_PRODUCTS_QUERY = `#graphql
query SafeGetProducts($first: Int!) {
  products(first: $first) {
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
      media(first: 3) {
        nodes {
          id
          alt
          ... on MediaImage {
            id
            image {
              url
              altText
            }
          }
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
      descriptionHtml
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

export const PRODUCT_UPDATE_MUTATION = `#graphql
mutation productUpdate($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      title
      descriptionHtml
      seo {
        title
        description
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const METAFIELDS_SET_MUTATION = `#graphql
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
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
  let storedOptimizations: any[] = [];
  try {
    storedOptimizations = await db.productOptimization.findMany({
      where: { shop },
      include: {
        revisions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  } catch (err) {
    console.warn("[getShopifyProducts] Database fetch fallback:", err);
  }

  const optimizationMap = new Map(
    storedOptimizations.map((item) => [item.productId, item])
  );

  let products: ShopifyProductItem[] = [];
  let isLiveStore = false;

  // If live adminClient is provided, query Shopify GraphQL with automated rate-limiting
  if (adminClient && typeof adminClient.graphql === "function") {
    try {
      const data = await executeGraphQLWithThrottling<any>(adminClient, GET_PRODUCTS_QUERY, { first: 50 });
      if (data?.data?.products?.nodes !== undefined) {
        isLiveStore = true;
        products = data.data.products.nodes.map((node: any) => {
          const specMatrix = node.specMatrix?.value;
          const schemaJson = node.schemaJson?.value;
          const faqJson = node.faqJson?.value;
          const seoScoreVal = node.seoScore?.value;
          const seoScore = seoScoreVal ? parseInt(seoScoreVal, 10) : undefined;

          const firstMedia = node.media?.nodes?.[0];
          const featuredMediaId = firstMedia?.id;
          const imageAltText = firstMedia?.alt || firstMedia?.image?.altText || node.featuredImage?.altText || "";

          const minPrice =
            node.priceRangeV2?.minVariantPrice?.amount ||
            node.priceRange?.minVariantPrice?.amount ||
            "0.00";
          const currency =
            node.priceRangeV2?.minVariantPrice?.currencyCode ||
            node.priceRange?.minVariantPrice?.currencyCode ||
            "USD";

          return {
            id: node.id,
            title: node.title,
            handle: node.handle,
            descriptionHtml: node.descriptionHtml || "",
            vendor: node.vendor || "",
            productType: node.productType || "",
            tags: node.tags || [],
            totalInventory: node.totalInventory ?? 0,
            featuredImage: node.featuredImage ? {
              url: node.featuredImage.url,
              altText: imageAltText || node.featuredImage.altText,
            } : undefined,
            featuredMediaId,
            imageAltText,
            priceRange: {
              minVariantPrice: {
                amount: minPrice,
                currencyCode: currency,
              },
            },
            seo: {
              title: node.seo?.title || "",
              description: node.seo?.description || "",
            },
            rankpilotMetafields: {
              specMatrix,
              schemaJson,
              faqJson,
              seoScore,
            },
            optimizationStatus: (seoScore && seoScore >= 80)
              ? "OPTIMIZED"
              : "NOT_OPTIMIZED",
            aiScore: seoScore || 40,
            hasRollback: false,
          };
        });
        console.log(`[getShopifyProducts] Live store sync active: Retrieved ${products.length} products directly from store ${shop}`);
      }
    } catch (e: any) {
      console.warn("[getShopifyProducts] Primary GraphQL query notice:", e?.message || e);
      if (e?.message?.includes("403") || e?.message?.includes("Forbidden")) {
        clearSessionCache(shop);
      }
    }

    // Secondary fallback: if primary query failed, execute streamlined safe query
    if (!isLiveStore) {
      try {
        const safeData = await executeGraphQLWithThrottling<any>(adminClient, SAFE_GET_PRODUCTS_QUERY, { first: 50 });
        if (safeData?.data?.products?.nodes !== undefined) {
          isLiveStore = true;
          products = safeData.data.products.nodes.map((node: any) => {
            const firstMedia = node.media?.nodes?.[0];
            const featuredMediaId = firstMedia?.id;
            const imageAltText = firstMedia?.alt || firstMedia?.image?.altText || node.featuredImage?.altText || "";
            return {
              id: node.id,
              title: node.title,
              handle: node.handle,
              descriptionHtml: node.descriptionHtml || "",
              vendor: node.vendor || "",
              productType: node.productType || "",
              tags: node.tags || [],
              totalInventory: node.totalInventory ?? 0,
              featuredImage: node.featuredImage ? {
                url: node.featuredImage.url,
                altText: imageAltText || node.featuredImage.altText,
              } : undefined,
              featuredMediaId,
              imageAltText,
              priceRange: {
                minVariantPrice: {
                  amount: "0.00",
                  currencyCode: "USD",
                },
              },
              seo: {
                title: node.title || "",
                description: "",
              },
              rankpilotMetafields: {},
              optimizationStatus: "NOT_OPTIMIZED",
              aiScore: 40,
              hasRollback: false,
            };
          });
          console.log(`[getShopifyProducts] Safe fallback query successful: Retrieved ${products.length} products from store ${shop}`);
        }
      } catch (safeErr: any) {
        console.warn("[getShopifyProducts] Safe fallback query notice:", safeErr?.message || safeErr);
        if (safeErr?.message?.includes("403") || safeErr?.message?.includes("Forbidden")) {
          clearSessionCache(shop);
        }
      }
    }
  }

  // Fallback to initial demo catalog only when disconnected / offline / standalone demo
  if (!isLiveStore && (!adminClient || shop.includes("demo"))) {
    console.log(`[getShopifyProducts] Offline or standalone demo mode: using demo catalog for ${shop}`);
    products = [...INITIAL_DEMO_PRODUCTS];
  }

  // Merge with local SQLite optimization status
  return products.map((prod) => {
    const opt = optimizationMap.get(prod.id);
    if (opt) {
      const mergedAlt = opt.imageAltText || prod.imageAltText || prod.featuredImage?.altText || "";
      return {
        ...prod,
        title: opt.optimizedTitle || prod.title,
        seo: {
          title: opt.optimizedTitle || prod.seo?.title || prod.title,
          description: opt.optimizedMetaDesc || prod.seo?.description || "",
        },
        imageAltText: mergedAlt,
        featuredImage: prod.featuredImage ? {
          ...prod.featuredImage,
          altText: mergedAlt || prod.featuredImage.altText,
        } : undefined,
        optimizationStatus: opt.status as any,
        aiScore: opt.aiScore,
        geoScore: opt.aiScore,
        hasRollback: opt.revisions.length > 0,
        lastOptimizedAt: opt.lastOptimizedAt?.toISOString(),
        rankpilotMetafields: {
          specMatrix: opt.specMatrixHtml || prod.rankpilotMetafields?.specMatrix,
          schemaJson: opt.schemaJson || prod.rankpilotMetafields?.schemaJson,
          faqJson: opt.faqJson || prod.rankpilotMetafields?.faqJson,
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
 * Safely weaves AI-generated Spec Matrices and Buyer Intent FAQs into product descriptionHtml.
 * Preserves the merchant's original text, styles cleanly for modern Shopify themes,
 * and encapsulates injected content within semantic HTML comments for reliable rollbacks and re-optimizations.
 */
export function buildEnhancedProductDescription({
  originalDescriptionHtml = "",
  title,
  optimization,
}: {
  originalDescriptionHtml?: string;
  title: string;
  optimization: OptimizationResult;
}): string {
  let cleanBase = (originalDescriptionHtml || "").trim();
  const startMarker = "<!-- rankpilot-seo-start -->";
  const endMarker = "<!-- rankpilot-seo-end -->";
  if (cleanBase.includes(startMarker) && cleanBase.includes(endMarker)) {
    const startIndex = cleanBase.indexOf(startMarker);
    const endIndex = cleanBase.indexOf(endMarker) + endMarker.length;
    cleanBase = (cleanBase.slice(0, startIndex) + cleanBase.slice(endIndex)).trim();
  }

  // If original description was empty or just empty tags, create a rich introductory paragraph
  if (!cleanBase || cleanBase === "<p></p>" || cleanBase === "<p><br></p>" || cleanBase === "<p>&nbsp;</p>") {
    cleanBase = `<p>${optimization.summarySnippet || optimization.seoDescription || `${title} engineered for maximum performance, durability, and premium quality.`}</p>`;
  }

  // Build the Spec Matrix HTML block
  let specHtml = "";
  if (optimization.specMatrixHtml) {
    specHtml = `
<div class="rankpilot-spec-section" style="margin-top: 24px; margin-bottom: 24px;">
  <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #111827;">Product Specifications & Features</h3>
  ${optimization.specMatrixHtml}
</div>`;
  }

  // Build the Buyer FAQ Accordion HTML block
  let faqHtml = "";
  if (Array.isArray(optimization.faqList) && optimization.faqList.length > 0) {
    const faqItems = optimization.faqList
      .map(
        (faq) => `
  <div style="margin-bottom: 16px; padding: 12px 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
    <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #1f2937;">Q: ${faq.question}</h4>
    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563;">${faq.answer}</p>
  </div>`
      )
      .join("\n");

    faqHtml = `
<div class="rankpilot-faq-section" style="margin-top: 24px; margin-bottom: 24px;">
  <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #111827;">Frequently Asked Questions</h3>
  ${faqItems}
</div>`;
  }

  const rankpilotBlock = `\n${startMarker}\n<div class="rankpilot-enhanced-content" style="font-family: inherit;">\n${specHtml}\n${faqHtml}\n</div>\n${endMarker}`;

  return `${cleanBase}\n${rankpilotBlock}`.trim();
}

/**
 * Applies AI Optimization to a product:
 * 1. Takes snapshot into RevisionHistory for instant 1-click rollback.
 * 2. Updates SQLite ProductOptimization record.
 * 3. Weaves Spec Table and Buyer FAQs into descriptionHtml and updates Shopify GraphQL.
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
  const enhancedDescription = buildEnhancedProductDescription({
    originalDescriptionHtml: currentProduct.descriptionHtml,
    title: currentProduct.title,
    optimization,
  });

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
        imageAltText: optimization.imageAltText || currentProduct.imageAltText || currentProduct.featuredImage?.altText,
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
      seoTitleSnapshot: currentProduct.seo?.title || currentProduct.title,
      seoDescriptionSnapshot: currentProduct.seo?.description || "",
      metafieldsSnapshot: JSON.stringify(currentProduct.rankpilotMetafields || {}),
      altTextSnapshot: currentProduct.imageAltText || currentProduct.featuredImage?.altText || "",
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
      imageAltText: optimization.imageAltText || currentProduct.imageAltText || currentProduct.featuredImage?.altText,
      lastOptimizedAt: new Date(),
    },
  });

  // Update in-memory initial demo products cache
  const demoItem = INITIAL_DEMO_PRODUCTS.find((p) => p.id === productId);
  if (demoItem) {
    demoItem.descriptionHtml = enhancedDescription;
    if (!demoItem.seo) demoItem.seo = { title: "", description: "" };
    demoItem.seo.title = optimization.seoTitle;
    demoItem.seo.description = optimization.seoDescription;
    if (optimization.imageAltText) {
      demoItem.imageAltText = optimization.imageAltText;
      if (demoItem.featuredImage) {
        demoItem.featuredImage.altText = optimization.imageAltText;
      }
    }
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

  // 2. Modern Shopify GraphQL sync
  const formattedProductId = productId.startsWith("gid://shopify/Product/")
    ? productId
    : `gid://shopify/Product/${productId}`;

  let shopifySynced = false;
  let shopifyErrorMessage = "";

  if (adminClient && typeof adminClient.graphql === "function") {
    // 2a. Update descriptionHtml & SEO Title & Description in Shopify Product
    try {
      const updateRes = await executeGraphQLWithThrottling(adminClient, PRODUCT_UPDATE_MUTATION, {
        input: {
          id: formattedProductId,
          descriptionHtml: enhancedDescription,
          seo: {
            title: optimization.seoTitle,
            description: optimization.seoDescription,
          },
        },
      });
      const updateErrors = updateRes.data?.productUpdate?.userErrors;
      if (updateErrors && updateErrors.length > 0) {
        shopifyErrorMessage = updateErrors.map((e: any) => `${e.field || "Product"}: ${e.message}`).join("; ");
        console.warn("[Shopify GraphQL] productUpdate userErrors:", shopifyErrorMessage);
      } else if (updateRes.data?.productUpdate?.product?.id) {
        shopifySynced = true;
      }
    } catch (updErr: any) {
      console.warn("[Shopify GraphQL] productUpdate error:", updErr);
      shopifyErrorMessage = updErr.message || String(updErr);
      if (updErr.message?.includes("403") || updErr.message?.includes("Forbidden")) {
        clearSessionCache(shop);
      }
    }

    // 2b. If productUpdate failed, attempt fallback via productSet
    if (!shopifySynced) {
      try {
        const input = {
          id: formattedProductId,
          descriptionHtml: enhancedDescription,
          seo: {
            title: optimization.seoTitle,
            description: optimization.seoDescription,
          },
        };
        const setRes = await executeGraphQLWithThrottling(adminClient, PRODUCT_SET_MUTATION, { input });
        const setErrors = setRes.data?.productSet?.userErrors;
        if (!setErrors || setErrors.length === 0) {
          shopifySynced = true;
          shopifyErrorMessage = "";
        } else {
          shopifyErrorMessage = setErrors.map((e: any) => `${e.field || "Product"}: ${e.message}`).join("; ");
        }
      } catch (fallbackErr: any) {
        console.warn("[Shopify GraphQL] productSet fallback error:", fallbackErr);
      }
    }

    // 2c. Set Metafields via metafieldsSet (non-blocking for product body)
    if (shopifySynced) {
      try {
        const metafields = [
          {
            ownerId: formattedProductId,
            namespace: "rankpilot",
            key: "spec_matrix",
            type: "multi_line_text_field",
            value: optimization.specMatrixHtml,
          },
          {
            ownerId: formattedProductId,
            namespace: "rankpilot",
            key: "spec_table",
            type: "multi_line_text_field",
            value: optimization.specMatrixHtml,
          },
          {
            ownerId: formattedProductId,
            namespace: "rankpilot",
            key: "schema_json",
            type: "json",
            value: JSON.stringify(optimization.schemaJson),
          },
          {
            ownerId: formattedProductId,
            namespace: "rankpilot",
            key: "faq_json",
            type: "json",
            value: JSON.stringify(optimization.faqList),
          },
          {
            ownerId: formattedProductId,
            namespace: "rankpilot",
            key: "seo_score",
            type: "number_integer",
            value: optimization.aiScore.toString(),
          },
        ];
        await executeGraphQLWithThrottling(adminClient, METAFIELDS_SET_MUTATION, { metafields });
      } catch (metaErr) {
        console.warn("[Shopify GraphQL] metafieldsSet notice:", metaErr);
      }
    } else {
      console.warn(`[Shopify Product Push Notice] ${formattedProductId} live write skipped: ${shopifyErrorMessage || "Store API rejected update"}`);
    }

    // 2d. Update media image alt text in Shopify via updateProductMediaAltText
    const targetMediaId = currentProduct.featuredMediaId;
    if (targetMediaId && optimization.imageAltText) {
      try {
        await updateProductMediaAltText({
          adminClient,
          productId: formattedProductId,
          mediaId: targetMediaId,
          altText: optimization.imageAltText,
        });
        console.log(`[Shopify GraphQL] Successfully updated media ${targetMediaId} alt text to: "${optimization.imageAltText}"`);
      } catch (mediaErr: any) {
        console.warn("[Shopify GraphQL] updateProductMediaAltText notice:", mediaErr?.message || mediaErr);
      }
    }
  }

  return {
    success: true,
    shopifySynced,
    aiScore: optimization.aiScore,
    descriptionHtml: enhancedDescription,
    warning: undefined,
  };
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
  let optRecord = await db.productOptimization.findUnique({
    where: { shop_productId: { shop, productId } },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let snapshot = optRecord?.revisions?.[0];
  if (!snapshot) {
    snapshot = (await db.revisionHistory.findFirst({
      where: { shop, productId },
      orderBy: { createdAt: "desc" },
    })) as any;
  }

  if (!snapshot) {
    const demoItem = INITIAL_DEMO_PRODUCTS.find((p) => p.id === productId);
    if (demoItem) {
      demoItem.optimizationStatus = "NEEDS_OPTIMIZATION";
      demoItem.aiScore = 38;
      demoItem.geoScore = 38;
      demoItem.hasRollback = false;
      return { success: true, restoredTitle: demoItem.title, restoredDescription: demoItem.descriptionHtml };
    }
    throw new Error("No previous revision snapshot found to roll back to.");
  }

  // Mark revision as rolled back if present
  if (snapshot.id) {
    try {
      await db.revisionHistory.update({
        where: { id: snapshot.id },
        data: { rolledBack: true },
      });
    } catch {}
  }

  // Reset ProductOptimization state in SQLite if record exists
  if (optRecord?.id) {
    try {
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
          imageAltText: snapshot.altTextSnapshot,
        },
      });
    } catch {}
  }

  // Revert in-memory demo item
  const demoItem = INITIAL_DEMO_PRODUCTS.find((p) => p.id === productId);
  if (demoItem) {
    demoItem.title = snapshot.titleSnapshot || demoItem.title;
    demoItem.descriptionHtml = snapshot.bodyHtmlSnapshot || demoItem.descriptionHtml;
    if (!demoItem.seo) demoItem.seo = { title: "", description: "" };
    demoItem.seo.title = snapshot.seoTitleSnapshot || snapshot.titleSnapshot || undefined;
    demoItem.seo.description = snapshot.seoDescriptionSnapshot || "";
    if (snapshot.altTextSnapshot !== undefined) {
      demoItem.imageAltText = snapshot.altTextSnapshot || "";
      if (demoItem.featuredImage) {
        demoItem.featuredImage.altText = snapshot.altTextSnapshot || "";
      }
    }
    demoItem.optimizationStatus = "NEEDS_OPTIMIZATION";
    demoItem.aiScore = 38;
    demoItem.geoScore = 38;
    demoItem.hasRollback = false;
    demoItem.rankpilotMetafields = {};
  }

  // Restore via Shopify GraphQL if connected
  if (adminClient && typeof adminClient.graphql === "function") {
    // Revert SEO title, description, and original descriptionHtml
    try {
      await executeGraphQLWithThrottling(adminClient, PRODUCT_UPDATE_MUTATION, {
        input: {
          id: productId,
          descriptionHtml: snapshot.bodyHtmlSnapshot || "",
          seo: {
            title: snapshot.seoTitleSnapshot || snapshot.titleSnapshot,
            description: snapshot.seoDescriptionSnapshot || "",
          },
        },
      });
    } catch (updErr) {
      console.warn("[Shopify GraphQL Rollback] productUpdate notice:", updErr);
    }

    // Reset SEO score metafield
    try {
      await executeGraphQLWithThrottling(adminClient, METAFIELDS_SET_MUTATION, {
        metafields: [
          {
            ownerId: productId,
            namespace: "rankpilot",
            key: "seo_score",
            type: "number_integer",
            value: "38",
          },
        ],
      });
    } catch (metaErr) {
      console.warn("[Shopify GraphQL Rollback] metafieldsSet notice, fallback to productSet:", metaErr);
      try {
        const input = {
          id: productId,
          descriptionHtml: snapshot.bodyHtmlSnapshot || "",
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
        await executeGraphQLWithThrottling(adminClient, PRODUCT_SET_MUTATION, { input });
      } catch (fallbackErr) {
        console.warn("[Shopify GraphQL Rollback] productSet fallback notice:", fallbackErr);
      }
    }
  }

  return { success: true, restoredTitle: snapshot.seoTitleSnapshot, restoredDescription: snapshot.bodyHtmlSnapshot || "" };
}
