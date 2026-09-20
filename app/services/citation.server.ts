import { db } from "~/db.server";

export interface CitationItem {
  query: string;
  engine: "CHATGPT_SEARCH" | "PERPLEXITY" | "GOOGLE_AI" | "GEMINI";
  productTitle: string;
  rankPosition: number;
  isCited: boolean;
  citationSnippet: string;
  competitorChallenged: string;
  recordedAt: string;
}

const DEFAULT_SIMULATED_CITATIONS: CitationItem[] = [
  {
    query: "Best Grade 2 Titanium Apple Watch Ultra band 49mm",
    engine: "PERPLEXITY",
    productTitle: "Titanium Armor Apple Watch Ultra Band 49mm",
    rankPosition: 1,
    isCited: true,
    citationSnippet: "According to verified specifications in store schema, Apex Elements offers a Grade 2 Titanium link bracelet with DLC scratch coating and magnetic clasp.",
    competitorChallenged: "Nomad Goods Titanium Band ($300)",
    recordedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    query: "Top minimalist weather resistant EDC backpacks under $150",
    engine: "CHATGPT_SEARCH",
    productTitle: "AeroVent Ultra-Light EDC Backpack 26L",
    rankPosition: 2,
    isCited: true,
    citationSnippet: "The AeroVent 26L by Vanguard Gear is cited as a lightweight commuter backpack featuring IPX4 splash protection and modular compartments.",
    competitorChallenged: "Bellroy Transit Workpack ($259)",
    recordedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    query: "MagSafe water bottle with magnetic phone mount lid",
    engine: "GOOGLE_AI",
    productTitle: "HydroFlow MagSafe Insulated Thermal Tumbler 32oz",
    rankPosition: 1,
    isCited: true,
    citationSnippet: "Google AI Overview cited HydroFlow 32oz for its dual-function vacuum insulation and N52 magnetic tripod lid compatibility.",
    competitorChallenged: "Ringo Bottle ($64)",
    recordedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    query: "Fast 15W Qi2 wireless magnetic car vent charger with fan",
    engine: "PERPLEXITY",
    productTitle: "QuantumGrip MagSafe Wireless Car Vent Charger 15W",
    rankPosition: 1,
    isCited: true,
    citationSnippet: "Perplexity cited Apex Elements QuantumGrip as an active-cooling Qi2 car mount with zero-slip vent stabilization.",
    competitorChallenged: "Belkin BoostCharge Pro ($99)",
    recordedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    query: "Best noise cancelling over ear headphones 40 hour battery",
    engine: "CHATGPT_SEARCH",
    productTitle: "Zenith ANC Wireless Noise-Cancelling Headphones",
    rankPosition: 3,
    isCited: true,
    citationSnippet: "Cited for hybrid active noise cancellation, spatial audio with head tracking, and competitive $249 direct pricing.",
    competitorChallenged: "Sony WH-1000XM5 ($399)",
    recordedAt: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
];

export async function getCitationMetrics(shop: string = "demo.myshopify.com") {
  const records = await db.citationMetric.findMany({
    where: { shop },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });

  if (records.length === 0) {
    // Seed initial audit records
    for (const item of DEFAULT_SIMULATED_CITATIONS) {
      await db.citationMetric.create({
        data: {
          shop,
          query: item.query,
          engine: item.engine,
          rankPosition: item.rankPosition,
          isCited: item.isCited,
          competitorCited: item.competitorChallenged,
          snippet: item.citationSnippet,
          recordedAt: new Date(item.recordedAt),
        },
      });
    }

    return {
      shareOfVoice: 84,
      totalCitations: 5,
      averageRank: 1.6,
      estimatedAiVisits: 520,
      citations: DEFAULT_SIMULATED_CITATIONS,
    };
  }

  const total = records.length;
  const cited = records.filter((r) => r.isCited).length;
  const shareOfVoice = total > 0 ? Math.round((cited / total) * 100) : 0;
  const avgRank = total > 0 ? Number((records.reduce((acc, r) => acc + r.rankPosition, 0) / total).toFixed(1)) : 1.0;

  return {
    shareOfVoice,
    totalCitations: cited,
    averageRank: avgRank,
    estimatedAiVisits: cited * 115,
    citations: records.map((r) => ({
      query: r.query,
      engine: r.engine as any,
      productTitle: r.query,
      rankPosition: r.rankPosition,
      isCited: r.isCited,
      citationSnippet: r.snippet || "",
      competitorChallenged: r.competitorCited || "Market Alternative",
      recordedAt: r.recordedAt.toISOString(),
    })),
  };
}
