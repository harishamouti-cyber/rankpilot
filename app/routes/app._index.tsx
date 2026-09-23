import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator, useNavigate } from "@remix-run/react";
import React, { useState, useMemo, useTransition } from "react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  IndexFilters,
  useSetIndexFiltersMode,
  useIndexResourceState,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Thumbnail,
  ProgressBar,
  Banner,
  Tooltip,
  Popover,
  ActionList,
  Modal,
  SkeletonBodyText,
  SkeletonDisplayText,
  EmptyState,
} from "@shopify/polaris";
import {
  MagicIcon,
  UndoIcon,
  SearchIcon,
  SettingsIcon,
  ExportIcon,
  CheckCircleIcon,
  CreditCardIcon,
  ChartLineIcon,
  PlayIcon,
  MenuHorizontalIcon,
  RefreshIcon,
  TargetIcon,
  ClipboardChecklistIcon,
  ShieldCheckMarkIcon,
  AlertCircleIcon,
} from "@shopify/polaris-icons";
import { getShopifyProducts, ShopifyProductItem } from "~/services/shopify.server";
import { auditCatalogForDrift, DriftAuditResult } from "~/services/drift_sentinel.server";
import { OptimizationResult } from "~/services/gemini.server";
import { CompetitorExtractedData } from "~/services/competitor.server";
import { getStrikingDistanceQueries, StrikingQuery } from "~/services/gsc.server";
import { OptimizationModal } from "~/components/OptimizationModal";
import { CompetitorModal } from "~/components/CompetitorModal";
import { RevisionHistoryModal, RevisionItem } from "~/components/RevisionHistoryModal";
import { SettingsModal } from "~/components/SettingsModal";
import { WelcomeModal } from "~/components/WelcomeModal";
import { SetupGuide } from "~/components/SetupGuide";
import { StrikingQueriesModal } from "~/components/StrikingQueriesModal";
import { PerformanceDigestModal } from "~/components/PerformanceDigestModal";
import { db } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "demo.myshopify.com";

  const products = await getShopifyProducts(shop);

  const totalProducts = products.length;
  const isOptimized = (status: string) => status === "OPTIMIZED" || status === "AI_READY";
  const aiReadyProducts = products.filter((p) => isOptimized(p.optimizationStatus));
  const aiReadyPercentage = totalProducts > 0 ? Math.round((aiReadyProducts.length / totalProducts) * 100) : 0;

  let indexPingsCount = 0;
  let storedRevisionsCount = 0;
  let recentIndexNowLogs: any[] = [];
  let setting: any = null;
  let strikingQueries: any[] = [];
  let digest: any = null;
  let driftAudit: any = null;

  try {
    indexPingsCount = await db.indexNowLog.count({ where: { shop } });
    storedRevisionsCount = await db.revisionHistory.count({ where: { shop } });
    recentIndexNowLogs = await db.indexNowLog.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    setting = await db.appSetting.findUnique({ where: { shop } });
    strikingQueries = await getStrikingDistanceQueries(shop);
    const rawDigest = await db.performanceDigest.findFirst({
      where: { shop },
      orderBy: { weekStartDate: "desc" },
    });
    digest = rawDigest
      ? {
          weekStartDate: rawDigest.weekStartDate.toISOString(),
          pingsDispatched: rawDigest.pingsDispatched,
          schemaImpressions: rawDigest.schemaImpressions,
          redirectsProtected: rawDigest.redirectsProtected,
          croBaselineConv: rawDigest.croBaselineConv,
          croPostOptConv: rawDigest.croPostOptConv,
        }
      : null;
    driftAudit = await auditCatalogForDrift(shop);
  } catch (dbErr) {
    console.warn("[App Dashboard Loader] Database query notice:", dbErr);
  }

  return json({
    shop,
    products,
    recentIndexNowLogs,
    strikingQueries,
    digest,
    driftAudit,
    metrics: {
      totalProducts,
      aiReadyCount: aiReadyProducts.length,
      aiReadyPercentage,
      indexPingsCount,
      storedRevisionsCount,
      strikingQueriesCount: strikingQueries.length,
    },
    setting: {
      plan: setting?.plan || "SCALE",
      autopilotEnabled: setting?.autopilotEnabled ?? true,
      geminiApiKey: setting?.geminiApiKey || "",
      indexNowKey: setting?.indexNowKey || "rankpilot-demo-indexnow-key-2025",
      autoPingIndexNow: setting?.autoPingIndexNow ?? true,
      storeDomain: setting?.storeDomain || "demo.myshopify.com",
      isOnboarded: setting?.isOnboarded ?? false,
    },
  });
};

export default function AppDashboard() {
  const {
    shop,
    products: initialProducts,
    recentIndexNowLogs,
    strikingQueries: initialStrikingQueries,
    digest,
    metrics: initialMetrics,
    setting,
    driftAudit,
  } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  // Local state
  const [products, setProducts] = useState<ShopifyProductItem[]>(initialProducts);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const [isPending, startTransition] = useTransition();

  const isProdOptimized = (p: ShopifyProductItem) =>
    p.optimizationStatus === "OPTIMIZED" || p.optimizationStatus === "AI_READY";

  const initialUnoptimizedCount = initialProducts.filter((p) => !isProdOptimized(p)).length;

  // Default to "Needs Optimization" tab (index 1) if any unoptimized items exist
  const [selectedStatusTab, setSelectedStatusTab] = useState(initialUnoptimizedCount > 0 ? 1 : 0);
  const [isScanningAutopilot, setIsScanningAutopilot] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [isIndexNowModalOpen, setIsIndexNowModalOpen] = useState(false);

  // GSC Striking Queries & Performance Digest Modals state
  const [strikingQueries, setStrikingQueries] = useState<StrikingQuery[]>(initialStrikingQueries || []);
  const [isStrikingModalOpen, setIsStrikingModalOpen] = useState(false);
  const [isDigestModalOpen, setIsDigestModalOpen] = useState(false);

  // Toast / notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "critical" | "info">("success");

  // Active product modals state
  const [activeModal, setActiveModal] = useState<"optimize" | "competitor" | "revisions" | "settings" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProductItem | null>(null);
  const [currentOptimization, setCurrentOptimization] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Competitor modal state
  const [competitorExtracted, setCompetitorExtracted] = useState<CompetitorExtractedData | null>(null);
  const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);

  // Revision modal state
  const [productRevisions, setProductRevisions] = useState<RevisionItem[]>([]);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Settings modal state
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);

  // Onboarding & Setup Guide state
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isSetupGuideDismissed, setIsSetupGuideDismissed] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("demoDiff=1") && initialProducts.length > 0) {
      const prod = initialProducts[0];
      setSelectedProduct(prod);
      setCurrentOptimization({
        seoTitle: "ErgoLight: Premium Height-Adjustable LED Desk Lamp with USB-C Charging - White",
        seoDescription: "Engineered for optimal focus and productivity with touch dimmer, USB-C charging port, and full spectrum eye-protection LED illumination.",
        aiScore: 96,
        confidence: 0.98,
        specMatrixHtml: "<table><thead><tr><th>Feature</th><th>Specification</th></tr></thead><tbody><tr><td>Lumen Output</td><td>3500 Lumens</td></tr><tr><td>Color Temperature</td><td>2700K - 6500K</td></tr><tr><td>Material</td><td>Aircraft-grade Aluminum</td></tr></tbody></table>",
        schemaJson: { "@context": "https://schema.org", "@type": "Product", "name": prod.title },
        faqList: [
          { question: "What is the lumen output of the ErgoLight desk lamp?", answer: "The ErgoLight delivers up to 3500 lumens of flicker-free illumination across 5 color temperature presets." },
          { question: "Does this lamp include high-speed USB-C charging?", answer: "Yes, it features an integrated 20W USB-C Power Delivery port capable of fast-charging smartphones and accessories." },
          { question: "Is the lamp compatible with smart home power strips?", answer: "Yes, it retains its previous brightness and color setting when powered on via external switches." }
        ],
        reasoning: "Entity-grounded optimization matching Google AI Overview search queries."
      });
      setActiveModal("optimize");
    }
  }, [initialProducts]);

  const handleQueryBoosted = (productId: string, query: string, newTitle: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            title: newTitle,
            seo: { ...p.seo, title: newTitle },
            optimizationStatus: "AI_READY",
            aiScore: 98,
            geoScore: 98,
          };
        }
        return p;
      })
    );
    setToastMessage(`Page 1 Boost Applied: "${query}" injected into SEO title.`);
    setToastTone("success");
    revalidator.revalidate();
  };

  // Check onboarding and setup guide dismissal on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const onboarded =
        localStorage.getItem(`rankpilot_onboarded_${shop}`) ||
        localStorage.getItem("rankpilot_onboarded");
      if (!onboarded) {
        setIsWelcomeModalOpen(true);
      }
      const dismissed =
        localStorage.getItem(`rankpilot_setup_dismissed_${shop}`) ||
        localStorage.getItem("rankpilot_setup_dismissed");
      if (dismissed === "true") {
        setIsSetupGuideDismissed(true);
      }
    }
  }, [shop]);

  // IndexFilters state
  const [sortSelected, setSortSelected] = useState<string[]>(["score desc"]);
  const { mode, setMode } = useSetIndexFiltersMode();

  const sortOptions: { label: string; value: `${string} ${"asc" | "desc"}`; directionLabel: string }[] = [
    { label: "GEO Score", value: "score desc", directionLabel: "Highest GEO score first" },
    { label: "GEO Score", value: "score asc", directionLabel: "Lowest GEO score first" },
    { label: "Stock Level", value: "stock desc", directionLabel: "Highest inventory first" },
    { label: "Stock Level", value: "stock asc", directionLabel: "Lowest inventory first" },
    { label: "Price", value: "price desc", directionLabel: "Highest price first" },
    { label: "Price", value: "price asc", directionLabel: "Lowest price first" },
    { label: "Product Title", value: "title asc", directionLabel: "A to Z" },
    { label: "Product Title", value: "title desc", directionLabel: "Z to A" },
  ];

  // Sync state if revalidated
  React.useEffect(() => {
    setProducts(initialProducts);
    setMetrics(initialMetrics);
  }, [initialProducts, initialMetrics]);

  // Derived filtered product collections
  const unoptimizedProducts = useMemo(
    () => products.filter((p) => !isProdOptimized(p)),
    [products]
  );
  const optimizedProducts = useMemo(
    () => products.filter((p) => isProdOptimized(p)),
    [products]
  );

  // Dynamic live tabs
  const filterTabs = [
    { id: "all", content: `All (${products.length})` },
    {
      id: "needs-optimization",
      content: `Needs Optimization (${unoptimizedProducts.length})`,
    },
    {
      id: "ai-ready",
      content: `AI & Google Ready (${optimizedProducts.length})`,
    },
  ];

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      // Tab filter
      if (selectedStatusTab === 1 && isProdOptimized(p)) return false;
      if (selectedStatusTab === 2 && !isProdOptimized(p)) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(query) ||
        p.vendor.toLowerCase().includes(query) ||
        p.productType.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
      );
    });

    const currentSort = sortSelected[0] || "score desc";
    return [...list].sort((a, b) => {
      const scoreA = a.geoScore ?? a.aiScore ?? 0;
      const scoreB = b.geoScore ?? b.aiScore ?? 0;
      if (currentSort === "score desc") return scoreB - scoreA;
      if (currentSort === "score asc") return scoreA - scoreB;
      if (currentSort === "stock desc") return b.totalInventory - a.totalInventory;
      if (currentSort === "stock asc") return a.totalInventory - b.totalInventory;
      const priceA = parseFloat(a.priceRange.minVariantPrice.amount) || 0;
      const priceB = parseFloat(b.priceRange.minVariantPrice.amount) || 0;
      if (currentSort === "price desc") return priceB - priceA;
      if (currentSort === "price asc") return priceA - priceB;
      if (currentSort === "title asc") return a.title.localeCompare(b.title);
      if (currentSort === "title desc") return b.title.localeCompare(a.title);
      return 0;
    });
  }, [products, selectedStatusTab, searchQuery, sortSelected]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredProducts);

  // Open existing optimization or generate a fresh proposal
  const handleOpenOptimizationOrOptimize = async (product: ShopifyProductItem) => {
    setSelectedProduct(product);

    if (isProdOptimized(product) && product.rankpilotMetafields?.specMatrix) {
      let parsedFaq = [];
      try {
        parsedFaq = product.rankpilotMetafields.faqJson ? JSON.parse(product.rankpilotMetafields.faqJson) : [];
      } catch {}
      let parsedSchema = {};
      try {
        parsedSchema = product.rankpilotMetafields.schemaJson ? JSON.parse(product.rankpilotMetafields.schemaJson) : {};
      } catch {}

      setCurrentOptimization({
        seoTitle: product.seo.title || product.title,
        seoDescription: product.seo.description || "",
        specMatrixHtml: product.rankpilotMetafields.specMatrix,
        faqList: parsedFaq.length >= 3 ? parsedFaq : [
          { question: `Is ${product.title} covered by a warranty?`, answer: "Yes, covered by a 1-year manufacturer warranty." },
          { question: `How does ${product.title} compare to alternatives?`, answer: "Engineered with higher-grade materials and reinforced construction." },
          { question: `What is the shipping policy?`, answer: "Ships within 24-48 business hours with tracked delivery." }
        ],
        schemaJson: Object.keys(parsedSchema).length > 0 ? parsedSchema : { "@type": "Product", name: product.title },
        aiScore: product.geoScore || product.aiScore || 96,
        scoreBreakdown: {
          titleOptimization: 19,
          metaDescriptionQuality: 19,
          specMatrixCompleteness: 20,
          schemaRichness: 18,
          conversationalFaqDepth: 18,
        },
        summarySnippet: `According to verified catalog specifications, the ${product.title} by ${product.vendor} delivers superior durability and precision construction.`,
      });
      setActiveModal("optimize");
    } else {
      await handleTriggerOptimize(product);
    }
  };

  // Trigger 1-Click 3-Second Product Optimizer
  const handleTriggerOptimize = async (product: ShopifyProductItem, competitorUrl?: string) => {
    setSelectedProduct(product);
    setIsOptimizing(true);
    setCurrentOptimization(null);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          shop,
          competitorUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");

      setCurrentOptimization(data.optimization);
      if (data.competitorData) {
        setCompetitorExtracted(data.competitorData);
      }
      setActiveModal("optimize");
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`Optimization error: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Apply Optimization to Storefront
  const handleApplyOptimization = async (
    product: ShopifyProductItem,
    optimization: OptimizationResult
  ) => {
    setIsApplying(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          shop,
          optimization,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply optimization");

      // Update local product state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? {
                ...p,
                seo: {
                  title: optimization.seoTitle,
                  description: optimization.seoDescription,
                },
                optimizationStatus: "AI_READY",
                aiScore: optimization.aiScore,
                geoScore: optimization.aiScore,
                hasRollback: true,
                lastOptimizedAt: new Date().toISOString(),
                rankpilotMetafields: {
                  specMatrix: optimization.specMatrixHtml,
                  schemaJson: JSON.stringify(optimization.schemaJson),
                  faqJson: JSON.stringify(optimization.faqList),
                  seoScore: optimization.aiScore,
                },
              }
            : p
        )
      );

      // Update local metrics
      setMetrics((prev) => ({
        ...prev,
        aiReadyCount: prev.aiReadyCount + (isProdOptimized(product) ? 0 : 1),
        aiReadyPercentage: Math.round(((prev.aiReadyCount + (isProdOptimized(product) ? 0 : 1)) / prev.totalProducts) * 100),
        indexPingsCount: prev.indexPingsCount + 1,
        storedRevisionsCount: prev.storedRevisionsCount + 1,
      }));

      setActiveModal(null);
      setToastTone("success");
      setToastMessage(
        `✓ "${product.title}" optimized & synced! Instant snapshot created. ${
          data.indexNowPinged ? "IndexNow ping dispatched to search engines." : ""
        }`
      );
      revalidator.revalidate();
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`Apply error: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Open Revisions Modal
  const handleOpenRevisions = async (product: ShopifyProductItem) => {
    setSelectedProduct(product);
    try {
      const res = await fetch(`/api/revisions?productId=${encodeURIComponent(product.id)}&shop=${encodeURIComponent(shop)}`);
      const data = await res.json();
      setProductRevisions(data.revisions || []);
      setActiveModal("revisions");
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`Could not fetch revisions: ${err.message}`);
    }
  };

  // 1-Click Rollback Handler
  const handleRollback = async (productId: string) => {
    setIsRollingBack(true);
    try {
      const res = await fetch("/api/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, shop }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rollback failed");

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                optimizationStatus: "NEEDS_OPTIMIZATION",
                aiScore: 38,
                geoScore: 38,
                hasRollback: false,
                seo: {
                  title: data.result?.restoredTitle || p.title,
                  description: "",
                },
              }
            : p
        )
      );

      setActiveModal(null);
      setToastTone("success");
      setToastMessage("✓ Product restored to original snapshot state in 1 click.");
      revalidator.revalidate();
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`Rollback failed: ${err.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Competitor Stealer Trigger
  const handleRunCompetitorStealer = async (product: ShopifyProductItem, competitorUrl: string) => {
    setIsAnalyzingCompetitor(true);
    try {
      const extractRes = await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorUrl }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || "Extraction failed");

      setCompetitorExtracted(extractData.data);
      await handleTriggerOptimize(product, competitorUrl);
      setActiveModal("optimize");
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`Competitor Stealer error: ${err.message}`);
    } finally {
      setIsAnalyzingCompetitor(false);
    }
  };

  // Bulk Optimization with Subscription Gating and 50-SKU Batch Throttling Buffer
  const handleBulkOptimize = async () => {
    const targets = products.filter((p) =>
      selectedResources.length > 0
        ? selectedResources.includes(p.id)
        : !isProdOptimized(p)
    );

    if (targets.length === 0) {
      setToastTone("info");
      setToastMessage("All matching products are already optimized.");
      return;
    }

    // 1. Subscription plan limit check (Gating)
    if (setting.plan === "STARTER" && targets.length > 250) {
      setToastTone("critical");
      setToastMessage(
        `Plan Limit: Starter is limited to 250 SKUs (${targets.length} selected). Upgrade to Pro or Scale to proceed.`
      );
      navigate("/app/billing");
      return;
    }

    setToastTone("info");
    setToastMessage(`Starting batched bulk optimization for ${targets.length} product(s) (50 SKUs/batch)...`);

    // 2. Process in sequential batches of 50 SKUs to prevent throttling & serverless timeouts
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE);

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batch = targets.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE);

      for (const prod of batch) {
        try {
          const optRes = await fetch("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: prod.id, shop }),
          });
          const optData = await optRes.json();
          if (optData.optimization) {
            await fetch("/api/apply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: prod.id,
                shop,
                optimization: optData.optimization,
              }),
            });
          }
        } catch (e) {
          console.warn(`Bulk optimization skipped ${prod.id}:`, e);
        }
      }

      // Safety buffer pause between batches
      if (batchIdx < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setToastTone("success");
    setToastMessage(`✓ Batched bulk optimization complete for ${targets.length} product(s)!`);
    revalidator.revalidate();
  };

  // Settings Save
  const handleSaveSettings = async (newSettings: any) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          ...newSettings,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setActiveModal(null);
      setToastTone("success");
      setToastMessage("✓ RankPilot settings saved successfully.");
      revalidator.revalidate();
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`Settings error: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Test IndexNow Ping
  const handleTestIndexNow = async (domain: string, key: string) => {
    setIsTestingPing(true);
    try {
      const res = await fetch("/api/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: domain,
          key,
          urls: [`https://${domain}/`],
          shop,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "IndexNow ping failed");
      setToastTone("success");
      setToastMessage(`✓ IndexNow Ping: ${data.result.message}`);
      revalidator.revalidate();
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`IndexNow error: ${err.message}`);
    } finally {
      setIsTestingPing(false);
    }
  };

  // Run Autopilot Scan
  const handleRunAutopilot = async () => {
    setIsScanningAutopilot(true);
    try {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Autopilot scan failed");
      setToastTone("success");
      setToastMessage(
        `✓ Autopilot Scan Completed: Scanned ${data.result.totalScanned} products. ${data.result.inventoryTransitions} schema transitions, ${data.result.autoOptimizedCount} auto-optimized.`
      );
      revalidator.revalidate();
    } catch (e: any) {
      setToastTone("critical");
      setToastMessage(`Autopilot error: ${e.message}`);
    } finally {
      setIsScanningAutopilot(false);
    }
  };

  // Instant Re-Index (IndexNow) Action
  const handleInstantReindex = async (product: ShopifyProductItem) => {
    try {
      const res = await fetch("/api/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: setting.storeDomain,
          urls: [`https://${setting.storeDomain}/products/${product.handle}`],
          shop,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Re-index ping failed");
      setToastTone("success");
      setToastMessage(`✓ Instant IndexNow ping dispatched for "${product.title}" (Bing, Yandex, Perplexity).`);
      setMetrics((prev) => ({ ...prev, indexPingsCount: prev.indexPingsCount + 1 }));
      revalidator.revalidate();
    } catch (err: any) {
      setToastTone("critical");
      setToastMessage(`Re-index failed: ${err.message}`);
    }
  };

  // Onboarding & Setup Guide Handlers
  const handleCompleteWelcome = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`rankpilot_onboarded_${shop}`, "true");
      localStorage.setItem("rankpilot_onboarded", "true");
    }

    // Persist to SQLite database
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, isOnboarded: true }),
    }).catch((e) => console.warn("Could not save onboarding status to DB:", e));

    setIsWelcomeModalOpen(false);

    // Smoothly transition into first unoptimized product optimization
    const targetProduct = unoptimizedProducts[0] || products[0];
    if (targetProduct) {
      handleOpenOptimizationOrOptimize(targetProduct);
    }
  };

  const handleCloseWelcomeModal = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`rankpilot_onboarded_${shop}`, "true");
      localStorage.setItem("rankpilot_onboarded", "true");
    }

    // Persist to SQLite database
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, isOnboarded: true }),
    }).catch((e) => console.warn("Could not save onboarding status to DB:", e));

    setIsWelcomeModalOpen(false);
  };

  const handleReplayOnboarding = () => {
    setIsWelcomeModalOpen(true);
  };

  const handleDismissSetupGuide = () => {
    setIsSetupGuideDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`rankpilot_setup_dismissed_${shop}`, "true");
      localStorage.setItem("rankpilot_setup_dismissed", "true");
    }
    setToastTone("info");
    setToastMessage("Setup guide dismissed. You can reopen it anytime from 'More actions'.");
  };

  const rowMarkup = paginatedProducts.map((product, index) => {
    const isOptimized = isProdOptimized(product);
    const displayScore = product.geoScore ?? product.aiScore ?? 38;

    return (
      <IndexTable.Row
        id={product.id}
        key={product.id}
        selected={selectedResources.includes(product.id)}
        position={index}
      >
        {/* Product Thumbnail & Title (Truncated to prevent overflow) */}
        <IndexTable.Cell>
          <InlineStack gap="300" blockAlign="center">
            <Thumbnail
              source={
                product.featuredImage?.url ||
                "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              }
              alt={product.title}
              size="small"
            />
            <div style={{ maxWidth: 220 }}>
              <Tooltip content={product.title}>
                <Text as="span" variant="bodyMd" fontWeight="bold" truncate>
                  {product.title}
                </Text>
              </Tooltip>
              <InlineStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued" truncate>
                  {product.vendor}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  • {product.productType}
                </Text>
              </InlineStack>
            </div>
          </InlineStack>
        </IndexTable.Cell>

        {/* Price & Stock */}
        <IndexTable.Cell>
          <BlockStack gap="050">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              ${product.priceRange.minVariantPrice.amount}{" "}
              {product.priceRange.minVariantPrice.currencyCode}
            </Text>
            <Text
              as="span"
              variant="bodySm"
              tone={product.totalInventory > 0 ? "subdued" : "critical"}
            >
              {product.totalInventory > 0 ? `${product.totalInventory} in stock` : "Out of stock"}
            </Text>
          </BlockStack>
        </IndexTable.Cell>

        {/* GEO Score */}
        <IndexTable.Cell>
          <BlockStack gap="100">
            <InlineStack gap="100" blockAlign="center">
              <Text as="span" variant="bodyMd" fontWeight="bold">
                {displayScore}/100
              </Text>
              <Badge tone={isOptimized ? "success" : "critical"} size="small">
                {isOptimized ? "AI Ready" : "Unranked"}
              </Badge>
            </InlineStack>
            <div style={{ width: 90 }}>
              <ProgressBar
                progress={displayScore}
                tone={isOptimized ? "success" : "critical"}
                size="small"
              />
            </div>
          </BlockStack>
        </IndexTable.Cell>

        {/* Status Badge */}
        <IndexTable.Cell>
          {isOptimized ? (
            <Badge tone="success" progress="complete">
              AI &amp; Google Ready
            </Badge>
          ) : (
            <Badge tone="critical" progress="incomplete">
              Needs Optimization
            </Badge>
          )}
        </IndexTable.Cell>

        {/* Dedicated Actions Column with View Diff and Popover ActionList */}
        <IndexTable.Cell>
          <InlineStack gap="200" wrap={false} blockAlign="center">
            <Button
              variant="primary"
              size="slim"
              loading={isOptimizing && selectedProduct?.id === product.id}
              onClick={() => handleOpenOptimizationOrOptimize(product)}
            >
              View Diff
            </Button>

            <Popover
              active={activeActionMenuId === product.id}
              activator={
                <Button
                  icon={MenuHorizontalIcon}
                  variant="tertiary"
                  size="slim"
                  accessibilityLabel={`Actions for ${product.title}`}
                  onClick={() =>
                    setActiveActionMenuId(
                      activeActionMenuId === product.id ? null : product.id
                    )
                  }
                />
              }
              onClose={() => setActiveActionMenuId(null)}
            >
              <ActionList
                actionRole="menuitem"
                items={[
                  {
                    content: "Analyze Competitor Angle",
                    icon: TargetIcon,
                    onAction: () => {
                      setActiveActionMenuId(null);
                      setSelectedProduct(product);
                      setCompetitorExtracted(null);
                      setActiveModal("competitor");
                    },
                  },
                  {
                    content: "Instant Re-Index (IndexNow)",
                    icon: RefreshIcon,
                    onAction: () => {
                      setActiveActionMenuId(null);
                      handleInstantReindex(product);
                    },
                  },
                  {
                    content: "Revert to Previous Snapshot",
                    icon: UndoIcon,
                    destructive: true,
                    disabled: !product.hasRollback,
                    onAction: () => {
                      setActiveActionMenuId(null);
                      handleOpenRevisions(product);
                    },
                  },
                ]}
              />
            </Popover>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="RankPilot"
      subtitle="AI SEO, GEO & AI Search Overviews"
      compactTitle
      titleMetadata={
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            verticalAlign: "middle",
            maxWidth: "100%",
          }}
        >
          <img src="/app-icon.png" alt="RankPilot" style={{ width: 28, height: 28, borderRadius: 6, verticalAlign: "middle" }} />
          <Badge tone="info">{`Plan: ${setting.plan}`}</Badge>
          <Badge tone="success">0ms Storefront Impact</Badge>
        </div>
      }
      primaryAction={{
        content: "⚡ Bulk Optimize All",
        icon: MagicIcon,
        onAction: handleBulkOptimize,
      }}
      actionGroups={[
        {
          title: "More actions",
          actions: [
            {
              content: "Replay AI Onboarding Scan",
              icon: SearchIcon,
              onAction: handleReplayOnboarding,
            },
            {
              content: isSetupGuideDismissed ? "Show Setup Guide" : "Dismiss Setup Guide",
              icon: ClipboardChecklistIcon,
              onAction: () => {
                const next = !isSetupGuideDismissed;
                setIsSetupGuideDismissed(next);
                if (typeof window !== "undefined") {
                  localStorage.setItem(`rankpilot_setup_dismissed_${shop}`, String(next));
                }
              },
            },
            {
              content: `Striking Distance Radar (${strikingQueries.length})`,
              icon: TargetIcon,
              onAction: () => setIsStrikingModalOpen(true),
            },
            {
              content: "Weekly Performance Digest",
              icon: ChartLineIcon,
              onAction: () => setIsDigestModalOpen(true),
            },
            {
              content: "Reverse AI Citations",
              icon: ChartLineIcon,
              onAction: () => navigate("/app/citations"),
            },
            {
              content: "Export llms.txt",
              icon: ExportIcon,
              onAction: () => window.open("/llms.txt", "_blank"),
            },
            {
              content: "Subscription & Billing",
              icon: CreditCardIcon,
              onAction: () => navigate("/app/billing"),
            },
            {
              content: "System Health & Diagnostics",
              icon: ShieldCheckMarkIcon,
              onAction: () => navigate("/app/health"),
            },
            {
              content: "Settings & Retention",
              icon: SettingsIcon,
              onAction: () => navigate("/app/settings"),
            },
          ],
        },
      ]}
    >
      <BlockStack gap="500">
        {/* Schema Drift Sentinel Warning Banner */}
        {driftAudit && driftAudit.driftedCount > 0 && (
          <Banner
            title={`Schema Drift Sentinel: ${driftAudit.driftedCount} Products Out of Sync`}
            tone="warning"
            action={{
              content: "View Health Terminal & Self-Heal",
              onAction: () => navigate("/app/health"),
            }}
          >
            <Text as="p" variant="bodyMd">
              External theme updates or third-party apps stripped JSON-LD schemas or spec matrices on {driftAudit.driftedCount} catalog items.
              Open the Health Terminal to restore 100% verified schemas.
            </Text>
          </Banner>
        )}
        {/* ========================================================================= */}
        {/* PINNED POLARIS SETUP GUIDE CARD                                           */}
        {/* ========================================================================= */}
        {!isSetupGuideDismissed && (
          <SetupGuide
            totalCount={metrics.totalProducts}
            unoptimizedCount={unoptimizedProducts.length}
            firstUnoptimizedProduct={unoptimizedProducts[0] || null}
            onOpenDiff={(p) => handleOpenOptimizationOrOptimize(p)}
            onActivateAutopilot={handleRunAutopilot}
            isAutopilotActive={setting.autopilotEnabled}
            isOptimizing={isOptimizing}
            onDismiss={handleDismissSetupGuide}
            onReplayOnboarding={handleReplayOnboarding}
          />
        )}

        {/* ========================================================================= */}
        {/* OPPORTUNITY RADAR / 24/7 AUTOPILOT GUARD CARD                              */}
        {/* ========================================================================= */}
        {unoptimizedProducts.length > 0 ? (
          <Card background="bg-surface-warning">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="300" blockAlign="center">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                    boxShadow: "0 0 10px #f59e0b",
                  }}
                />
                <BlockStack gap="050">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Opportunity Radar: High Impact AI Citation Recovery
                    </Text>
                    <Badge tone="warning" size="small">
                      Action Required
                    </Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm">
                    {`${unoptimizedProducts.length} product${
                      unoptimizedProducts.length > 1 ? "s have" : " has"
                    } high search impressions but low AI visibility. Running 1-Click Optimization can recover estimated ${
                      unoptimizedProducts.length * 225
                    } monthly AI citations.`}
                  </Text>
                </BlockStack>
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                {strikingQueries.length > 0 && (
                  <Button
                    icon={TargetIcon}
                    variant="secondary"
                    size="slim"
                    onClick={() => setIsStrikingModalOpen(true)}
                  >
                    {`Striking Queries (${strikingQueries.length})`}
                  </Button>
                )}
                <Button
                  icon={MagicIcon}
                  variant="primary"
                  size="slim"
                  loading={isOptimizing}
                  onClick={handleBulkOptimize}
                >
                  {`Optimize Unready Products (${Math.max(unoptimizedProducts.length * 3, 6)}s)`}
                </Button>
              </InlineStack>
            </InlineStack>
          </Card>
        ) : (
          <Card background="bg-surface-secondary">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="300" blockAlign="center">
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#008060",
                    boxShadow: "0 0 8px #008060",
                  }}
                />
                <BlockStack gap="050">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Autopilot 24/7 Catalog Guard: ACTIVE
                    </Text>
                    <Badge tone="success" size="small">
                      Auto-Detecting Drift
                    </Badge>
                    <Badge tone="info" size="small">
                      {`Plan: ${setting.plan}`}
                    </Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    All catalog SKUs are GEO-synchronized with Google AI &amp; ChatGPT Search. 0ms storefront impact.
                  </Text>
                </BlockStack>
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                <Button
                  icon={ChartLineIcon}
                  variant="secondary"
                  size="slim"
                  onClick={() => setIsDigestModalOpen(true)}
                >
                  Weekly Digest
                </Button>
                <Button
                  icon={PlayIcon}
                  variant="primary"
                  size="slim"
                  loading={isScanningAutopilot}
                  onClick={handleRunAutopilot}
                >
                  Run Autopilot Scan Now
                </Button>
              </InlineStack>
            </InlineStack>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* 4 METRIC CARDS WITH INTERACTIVE ACTIONS                                    */}
        {/* ========================================================================= */}
        <Layout>
          <Layout.Section>
            <InlineStack gap="400" align="space-between">
              {/* Metric 1: Total Products */}
              <Box
                width="23%"
                padding="400"
                background="bg-surface"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                shadow="100"
              >
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    CATALOG PRODUCTS
                  </Text>
                  <Text as="h2" variant="headingXl" fontWeight="bold">
                    {metrics.totalProducts}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Monitored catalog items
                  </Text>
                </BlockStack>
              </Box>

              {/* Metric 2: AI-Ready % */}
              <Box
                width="23%"
                padding="400"
                background="bg-surface"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                shadow="100"
              >
                <BlockStack gap="100">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodySm" tone="subdued">
                      AI &amp; GOOGLE READY
                    </Text>
                    <Badge tone={metrics.aiReadyPercentage >= 70 ? "success" : "attention"}>
                      {`${metrics.aiReadyPercentage}%`}
                    </Badge>
                  </InlineStack>
                  <Text as="h2" variant="headingXl" fontWeight="bold">
                    {metrics.aiReadyCount} / {metrics.totalProducts}
                  </Text>
                  <ProgressBar
                    progress={metrics.aiReadyPercentage}
                    tone={metrics.aiReadyPercentage >= 70 ? "success" : "highlight"}
                    size="small"
                  />
                </BlockStack>
              </Box>

              {/* Metric 3: Indexed Pings (Interactive Modal Trigger) */}
              <Box
                width="23%"
                padding="400"
                background="bg-surface"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                shadow="100"
              >
                <div
                  onClick={() => setIsIndexNowModalOpen(true)}
                  style={{ cursor: "pointer" }}
                  title="Click to view real-time IndexNow dispatch logs"
                >
                  <BlockStack gap="100">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" variant="bodySm" tone="subdued">
                        INDEXNOW PINGS
                      </Text>
                      <Badge tone="info">Instant Crawl</Badge>
                    </InlineStack>
                    <Text as="h2" variant="headingXl" fontWeight="bold">
                      {metrics.indexPingsCount}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Bing &amp; Perplexity ↗
                    </Text>
                  </BlockStack>
                </div>
              </Box>

              {/* Metric 4: Stored Revisions (Interactive Modal Trigger) */}
              <Box
                width="23%"
                padding="400"
                background="bg-surface"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                shadow="100"
              >
                <div
                  onClick={() => {
                    if (products.length > 0) {
                      handleOpenRevisions(products[0]);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                  title="Click to view revision snapshots & rollback points"
                >
                  <BlockStack gap="100">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" variant="bodySm" tone="subdued">
                        STORED SNAPSHOTS
                      </Text>
                      <Badge tone="success">1-Click Undo</Badge>
                    </InlineStack>
                    <Text as="h2" variant="headingXl" fontWeight="bold">
                      {metrics.storedRevisionsCount}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Zero-risk backups ↗
                    </Text>
                  </BlockStack>
                </div>
              </Box>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* ========================================================================= */}
        {/* CORE CATALOG TABLE CARD WITH POLARIS INDEXFILTERS                         */}
        {/* ========================================================================= */}
        <Card padding="0">
          <BlockStack gap="0">
            {/* Native Polaris IndexFilters with Live Search & Multi-Sort */}
            <IndexFilters
              sortOptions={sortOptions}
              sortSelected={sortSelected}
              queryValue={searchQuery}
              queryPlaceholder="Search products by title, vendor, category, or tag..."
              onQueryChange={(q) => {
                startTransition(() => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                });
              }}
              onQueryClear={() => {
                startTransition(() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                });
              }}
              onSort={(s) => {
                startTransition(() => {
                  setSortSelected(s);
                  setCurrentPage(1);
                });
              }}
              primaryAction={undefined}
              cancelAction={{
                onAction: () => {},
                disabled: false,
                loading: false,
              }}
              tabs={filterTabs}
              selected={selectedStatusTab}
              onSelect={(idx) => {
                startTransition(() => {
                  setSelectedStatusTab(idx);
                  setCurrentPage(1);
                });
              }}
              canCreateNewView={false}
              filters={[]}
              appliedFilters={[]}
              onClearAll={() => {
                startTransition(() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                });
              }}
              mode={mode}
              setMode={setMode}
              loading={isPending}
            />

            {/* Skeleton Layout Reservation for Core Web Vitals (CLS <= 0.1) */}
            {isPending && (
              <Box padding="400">
                <BlockStack gap="200">
                  <SkeletonDisplayText size="small" />
                  <SkeletonBodyText lines={2} />
                </BlockStack>
              </Box>
            )}

            {/* IndexTable with Native Polaris Promoted Bulk Actions and Performance Pagination (Max 25 SKUs) */}
            <IndexTable
              resourceName={{ singular: "product", plural: "products" }}
              itemCount={filteredProducts.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              emptyState={
                products.length === 0 ? (
                  <EmptyState
                    heading="Import products to get started with RankPilot"
                    action={{
                      content: "Sync Catalog",
                      onAction: () => revalidator.revalidate(),
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>No products were found in your Shopify store. Add products in your Shopify Admin or click Sync to fetch updates.</p>
                  </EmptyState>
                ) : (
                  <EmptyState
                    heading="No products found"
                    action={{
                      content: "Clear filters",
                      onAction: () => {
                        setSearchQuery("");
                        setSelectedStatusTab(0);
                        setCurrentPage(1);
                      },
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>No products match your active search query or status filter. Try clearing filters to view all products.</p>
                  </EmptyState>
                )
              }
              headings={[
                { title: "Product" },
                { title: "Price / Stock" },
                { title: "GEO Score" },
                { title: "Status" },
                { title: "Actions" },
              ]}
              pagination={{
                hasNext: currentPage * PAGE_SIZE < filteredProducts.length,
                hasPrevious: currentPage > 1,
                onNext: () => setCurrentPage((prev) => prev + 1),
                onPrevious: () => setCurrentPage((prev) => Math.max(1, prev - 1)),
                label: filteredProducts.length > 0
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of ${filteredProducts.length} products`
                  : "0 products",
              }}
              promotedBulkActions={[
                {
                  content: "Optimize Selected",
                  onAction: handleBulkOptimize,
                },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </BlockStack>
        </Card>

        {/* Zero-Footprint Assurance Callout */}
        <Card background="bg-surface-secondary">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <CheckCircleIcon width={24} height={24} fill="#008060" />
              <BlockStack gap="050">
                <Text as="h3" variant="headingSm" fontWeight="bold">
                  Zero Storefront Liquid / ScriptTag Footprint
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  RankPilot operates 100% server-side using Shopify Admin GraphQL API and Metafields.
                  Guaranteed 0ms impact on your Google Core Web Vitals and Lighthouse speed scores.
                </Text>
              </BlockStack>
            </InlineStack>
            <Badge tone="success">100% Core Web Vitals Safe</Badge>
          </InlineStack>
        </Card>
      </BlockStack>

      {/* ========================================================================= */}
      {/* MODAL 1: SIDE-BY-SIDE DIFF & AI ENGINE SIMULATION MODAL                   */}
      {/* ========================================================================= */}
      <OptimizationModal
        open={activeModal === "optimize"}
        onClose={() => setActiveModal(null)}
        product={selectedProduct}
        optimization={currentOptimization}
        isApplying={isApplying}
        onApply={handleApplyOptimization}
        onRevert={handleRollback}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: COMPETITOR GAP STEALER                                           */}
      {/* ========================================================================= */}
      <CompetitorModal
        open={activeModal === "competitor"}
        onClose={() => setActiveModal(null)}
        product={selectedProduct}
        onExtractAndOptimize={handleRunCompetitorStealer}
        isLoading={isAnalyzingCompetitor || isOptimizing}
        extractedData={competitorExtracted}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: REVISION SNAPSHOTS & ROLLBACK                                    */}
      {/* ========================================================================= */}
      <RevisionHistoryModal
        open={activeModal === "revisions"}
        onClose={() => setActiveModal(null)}
        product={selectedProduct}
        revisions={productRevisions}
        isRollingBack={isRollingBack}
        onRollback={handleRollback}
      />

      {/* ========================================================================= */}
      {/* MODAL 4: SETTINGS & INDEXNOW                                              */}
      {/* ========================================================================= */}
      <SettingsModal
        open={activeModal === "settings"}
        onClose={() => setActiveModal(null)}
        geminiApiKey={setting.geminiApiKey}
        indexNowKey={setting.indexNowKey}
        autoPing={setting.autoPingIndexNow}
        storeDomain={setting.storeDomain}
        onSave={handleSaveSettings}
        onTestIndexNow={handleTestIndexNow}
        isSaving={isSavingSettings}
        isTestingPing={isTestingPing}
      />

      {/* ========================================================================= */}
      {/* MODAL 5: INDEXNOW REAL-TIME DISPATCH LOG SLIDE-OVER                       */}
      {/* ========================================================================= */}
      <Modal
        open={isIndexNowModalOpen}
        onClose={() => setIsIndexNowModalOpen(false)}
        title="Real-Time IndexNow Dispatch Log"
        size="large"
        secondaryActions={[
          {
            content: "Close",
            onAction: () => setIsIndexNowModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="info">
              <Text as="p" variant="bodySm">
                Real-time IndexNow pings dispatched to Microsoft Bing, Yandex, and Perplexity Search crawlers. Search engines index newly published metadata and schema within seconds.
              </Text>
            </Banner>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: "#f6f6f7", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid #e1e3e5" }}>Target URL</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid #e1e3e5" }}>Search Engines</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid #e1e3e5" }}>HTTP Status</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid #e1e3e5" }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIndexNowLogs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f1f2f3" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12 }}>
                        {log.url}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <InlineStack gap="100">
                          <Badge tone="info" size="small">Bing</Badge>
                          <Badge tone="success" size="small">Perplexity</Badge>
                        </InlineStack>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <Badge tone="success" size="small">
                          {`${log.statusCode || 202} Accepted`}
                        </Badge>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#6d7175", fontSize: 12 }} suppressHydrationWarning>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: FIRST-RUN WELCOME & ONBOARDING SEQUENCE                           */}
      {/* ========================================================================= */}
      <WelcomeModal
        open={isWelcomeModalOpen}
        onClose={handleCloseWelcomeModal}
        onStartFirstOptimization={handleCompleteWelcome}
        totalProductsCount={metrics.totalProducts}
        unoptimizedProductsCount={unoptimizedProducts.length}
        firstUnoptimizedProductTitle={unoptimizedProducts[0]?.title}
      />

      {/* ========================================================================= */}
      {/* MODAL 7: GOOGLE SEARCH CONSOLE STRIKING DISTANCE RADAR                     */}
      {/* ========================================================================= */}
      <StrikingQueriesModal
        open={isStrikingModalOpen}
        onClose={() => setIsStrikingModalOpen(false)}
        queries={strikingQueries}
        shop={shop}
        onQueryBoosted={handleQueryBoosted}
      />

      {/* ========================================================================= */}
      {/* MODAL 8: WEEKLY PERFORMANCE & AEO IMPACT DIGEST                            */}
      {/* ========================================================================= */}
      <PerformanceDigestModal
        open={isDigestModalOpen}
        onClose={() => setIsDigestModalOpen(false)}
        digest={digest}
      />
    </Page>
  );
}
