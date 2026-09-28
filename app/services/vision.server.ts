import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "./gemini.server";
import { executeGraphQLWithThrottling } from "./shopify.server";

export interface VisionAltTextResult {
  altText: string;
  source: "gemini_vision" | "smart_fallback";
  characterCount: number;
}

/**
 * GraphQL mutation to update product media / image alt text in Shopify
 */
export const PRODUCT_UPDATE_MEDIA_MUTATION = `#graphql
mutation productUpdateMedia($media: [UpdateMediaInput!]!, $productId: ID!) {
  productUpdateMedia(media: $media, productId: $productId) {
    media {
      id
      alt
    }
    userErrors {
      field
      message
    }
  }
}
`;

/**
 * GraphQL mutation for updating files directly in Shopify
 */
export const FILE_UPDATE_MUTATION = `#graphql
mutation fileUpdate($files: [FileUpdateInput!]!) {
  fileUpdate(files: $files) {
    files {
      id
      alt
    }
    userErrors {
      field
      message
    }
  }
}
`;

/**
 * Generates descriptive, SEO & accessibility-optimized alt text for a product image using Gemini Vision.
 * Follows strict constraints:
 * - Strictly under 125 characters
 * - Never starts with "image of", "photo of", or "picture of"
 * - Describes product form, key materials, primary color, and context
 */
export async function generateProductAltTextWithVision({
  imageUrl,
  productTitle,
  productVendor,
  shop = "demo.myshopify.com",
}: {
  imageUrl: string;
  productTitle: string;
  productVendor?: string;
  shop?: string;
}): Promise<VisionAltTextResult> {
  const apiKey = await getGeminiApiKey(shop);

  if (apiKey && imageUrl) {
    try {
      // Attempt to download image for multimodal Gemini API call
      const imageBuffer = await fetchImageBuffer(imageUrl);
      if (imageBuffer) {
        const altText = await callGeminiVision(apiKey, imageBuffer, productTitle, productVendor);
        if (altText) {
          return {
            altText,
            source: "gemini_vision",
            characterCount: altText.length,
          };
        }
      }
    } catch (err) {
      console.warn("[Vision Engine] Gemini Vision API call failed, using intelligent fallback:", err);
    }
  }

  // Smart heuristic fallback
  const fallback = generateSmartFallbackAltText(productTitle, productVendor);
  return {
    altText: fallback,
    source: "smart_fallback",
    characterCount: fallback.length,
  };
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  } catch {
    return null;
  }
}

async function callGeminiVision(
  apiKey: string,
  image: { buffer: Buffer; mimeType: string },
  title: string,
  vendor?: string
): Promise<string | null> {
  const prompt = `You are an elite ecommerce accessibility and SEO image auditor for Google Images.
Analyze this product image for the product: "${title}" ${vendor ? `by ${vendor}` : ""}.

STRICT INSTRUCTIONS:
1. Generate an accurate, descriptive alt text under 125 characters.
2. NEVER use phrases like "image of", "photo of", "picture of", "closeup of", or "a shot of".
3. Describe the item, primary color, notable material/texture, and orientation.
4. Output ONLY the raw alt text string with no quotes, formatting, or commentary.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: image.buffer.toString("base64"),
                mimeType: image.mimeType,
              },
            },
          ],
        },
      ],
    });

    let text = (response.text || "").trim().replace(/^["']|["']$/g, "");
    if (text.length > 125) {
      text = text.slice(0, 122) + "...";
    }
    return text || null;
  } catch {
    // Fallback to GoogleGenerativeAI SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image.buffer.toString("base64"),
          mimeType: image.mimeType,
        },
      },
    ]);
    let text = (result.response.text() || "").trim().replace(/^["']|["']$/g, "");
    if (text.length > 125) {
      text = text.slice(0, 122) + "...";
    }
    return text || null;
  }
}

export function smartTrimAltText(text: string, maxLen = 124): string {
  if (!text) return "";
  const cleaned = text
    .replace(/^(image|photo|picture)\s+of\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLen) return cleaned;

  // Find last period before maxLen
  const lastPeriod = cleaned.lastIndexOf(". ", maxLen);
  if (lastPeriod > 35) {
    return cleaned.slice(0, lastPeriod + 1).trim();
  }

  // Find last comma before maxLen
  const lastComma = cleaned.lastIndexOf(", ", maxLen);
  if (lastComma > 35) {
    return cleaned.slice(0, lastComma).trim();
  }

  // Find last space before maxLen
  const lastSpace = cleaned.lastIndexOf(" ", maxLen);
  if (lastSpace > 35) {
    return cleaned.slice(0, lastSpace).trim();
  }

  return cleaned.slice(0, maxLen).trim();
}

export function generateSmartFallbackAltText(
  productTitle: string,
  vendor?: string,
  currentAltText?: string
): string {
  const brand = vendor ? `${vendor.trim()} ` : "";
  const cleanTitle = productTitle
    .replace(/\b(raw|unoptimized|sample|test|placeholder|demo)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || productTitle.trim();

  // If product already has detailed alt text, preserve and smartly trim it without mid-word cuts
  if (currentAltText && currentAltText.length >= 10 && !/raw|unoptimized|placeholder/i.test(currentAltText)) {
    const trimmed = smartTrimAltText(currentAltText, 124);
    if (trimmed.length >= 15) return trimmed;
  }

  if (/\bsnowboard\b/i.test(cleanTitle)) {
    return `${brand}${cleanTitle} top and bottom graphic view with reinforced edges`.slice(0, 124);
  }
  if (/\bbackpack\b/i.test(cleanTitle)) {
    return `${brand}${cleanTitle} in weather-resistant exterior with ergonomic straps`.slice(0, 124);
  }
  if (/\b(bottle|tumbler)\b/i.test(cleanTitle)) {
    return `${brand}${cleanTitle} vacuum insulated tumbler with leakproof lid`.slice(0, 124);
  }
  if (/\bwatch\b/i.test(cleanTitle)) {
    return `${brand}${cleanTitle} precision engineered watch with scratch-resistant finish`.slice(0, 124);
  }
  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots)\b/i.test(cleanTitle)) {
    return `${brand}${cleanTitle} premium footwear profile with durable traction sole`.slice(0, 124);
  }
  if (/\b(shirt|hoodie|jacket|apparel)\b/i.test(cleanTitle)) {
    return `${brand}${cleanTitle} premium fabric construction in retail presentation`.slice(0, 124);
  }

  return `${brand}${cleanTitle} authentic catalog view with verified materials`.slice(0, 124);
}

/**
 * Updates a product media's alt text using Shopify Admin GraphQL with rate-limiting protection.
 */
export async function updateProductMediaAltText({
  adminClient,
  productId,
  mediaId,
  altText,
}: {
  adminClient: any;
  productId: string;
  mediaId: string;
  altText: string;
}) {
  if (!adminClient || typeof adminClient.graphql !== "function") {
    console.log(`[Vision Service Simulated] Media ${mediaId} alt text set to: "${altText}"`);
    return { success: true, altText, simulated: true };
  }

  const variables = {
    productId,
    media: [
      {
        id: mediaId,
        alt: altText,
      },
    ],
  };

  const response = await executeGraphQLWithThrottling<any>(
    adminClient,
    PRODUCT_UPDATE_MEDIA_MUTATION,
    variables
  );

  const userErrors = response.data?.productUpdateMedia?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(`Shopify media update failed: ${userErrors[0].message}`);
  }

  return {
    success: true,
    altText,
    media: response.data?.productUpdateMedia?.media,
  };
}
