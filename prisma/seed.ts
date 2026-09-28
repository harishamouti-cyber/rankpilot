import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function seedCatalog() {
  const shop = "demo.myshopify.com";

  console.log("Seeding RankPilot database for", shop);

  // 1. Ensure App Settings
  await db.appSetting.upsert({
    where: { shop },
    update: {
      plan: "SCALE",
      autopilotEnabled: true,
      autoPingIndexNow: true,
      storeDomain: "demo.myshopify.com",
      indexNowKey: "rankpilot-demo-indexnow-key-2025",
    },
    create: {
      shop,
      plan: "SCALE",
      autopilotEnabled: true,
      autoPingIndexNow: true,
      storeDomain: "demo.myshopify.com",
      indexNowKey: "rankpilot-demo-indexnow-key-2025",
    },
  });

  // 2. Clear any prior optimization records for products 3, 4, 5 so they are pristine unoptimized
  const unoptimizedProductIds = [
    "gid://shopify/Product/8472917003",
    "gid://shopify/Product/8472917004",
    "gid://shopify/Product/8472917005",
  ];

  await db.productOptimization.deleteMany({
    where: {
      shop,
      productId: { in: unoptimizedProductIds },
    },
  });

  await db.revisionHistory.deleteMany({
    where: {
      shop,
      productId: { in: unoptimizedProductIds },
    },
  });

  // 3. Upsert products 1 and 2 as AI_READY (score 96) - 2 of 5 = 40% GEO Readiness baseline
  const aiReadyProducts = [
    {
      productId: "gid://shopify/Product/8472917001",
      title: "The Collection Snowboard: Liquid",
      handle: "the-collection-snowboard-liquid",
      status: "AI_READY",
      aiScore: 96,
      geoScore: 96,
      originalTitle: "The Collection Snowboard: Liquid",
      originalBodyHtml: "<p>Premium all-mountain directional snowboard designed for high-speed carving, powder flotation, and backcountry freestyle performance. Features carbon fiber stringers and sintered base.</p>",
      optimizedTitle: "The Collection Snowboard: Liquid (All-Mountain Carving & Powder)",
      optimizedMetaDesc: "Handcrafted all-mountain snowboard with carbon stringers and sintered race base. Maximum edge hold and backcountry flotation. Order with free express shipping.",
      specMatrixHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Specification</th><th>Details & Measurements</th></tr></thead><tbody><tr><td>Profile & Camber</td><td>Directional Camber with 10mm Tapered Powder Tail</td></tr><tr><td>Core Materials</td><td>FSC Poplar & Paulownia Wood Core with Carbon V-Bars</td></tr><tr><td>Base Technology</td><td>Sintered Ultra-High-Molecular-Weight (UHMW) Base</td></tr><tr><td>Flex Rating</td><td>7/10 (Medium-Stiff All-Mountain Response)</td></tr><tr><td>Warranty</td><td>3-Year Manufacturer Warranty + Lifetime Edge Guarantee</td></tr></tbody></table>`,
      faqJson: JSON.stringify([
        { question: "What riding style is the Collection Snowboard Liquid designed for?", answer: "It is an all-mountain directional board built for aggressive carving, tree runs, and deep powder flotation." },
        { question: "Does this snowboard include pre-waxed base?", answer: "Yes, each board arrives factory pre-tuned with biological all-temperature ski wax ready to ride." },
        { question: "What is the warranty coverage?", answer: "Backed by a comprehensive 3-year structural warranty against core delamination and edge defects." },
      ]),
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "The Collection Snowboard: Liquid",
        offers: { "@type": "Offer", price: "749.95", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      }),
      imageAltText: "The Collection Snowboard Liquid matte carbon directional freeride snowboard on powder snow",
    },
    {
      productId: "gid://shopify/Product/8472917002",
      title: "The Collection Snowboard: Oxygen",
      handle: "the-collection-snowboard-oxygen",
      status: "AI_READY",
      aiScore: 96,
      geoScore: 96,
      originalTitle: "The Collection Snowboard: Oxygen",
      originalBodyHtml: "<p>Ultralight freeride snowboard with triaxial fiberglass matrix, basalt dampening, and titanium mounting inserts. Engineered for alpine racing and steep terrain.</p>",
      optimizedTitle: "The Collection Snowboard: Oxygen (Ultralight Freeride Performance)",
      optimizedMetaDesc: "Aerospace-grade freeride snowboard with basalt dampening and titanium mounting inserts. Built for high-speed alpine stability. Shop with 30-day trial.",
      specMatrixHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Specification</th><th>Details & Measurements</th></tr></thead><tbody><tr><td>Profile</td><td>Pure Camber with Early Rise Nose for Float</td></tr><tr><td>Reinforcement</td><td>Titanium Binding Inlays & Basalt Vibration Dampeners</td></tr><tr><td>Base</td><td>Electra 9000 Graphite Race Base</td></tr><tr><td>Flex</td><td>8/10 (Stiff Freeride / High-Speed Stability)</td></tr><tr><td>Warranty</td><td>3-Year Manufacturer Warranty</td></tr></tbody></table>`,
      faqJson: JSON.stringify([
        { question: "Is the Oxygen board suitable for intermediate riders?", answer: "Due to its stiff 8/10 flex rating and high-speed camber, it is best suited for advanced and expert riders." },
        { question: "How does basalt dampening improve chatter resistance?", answer: "Woven basalt volcanic fibers absorb high-frequency ice vibrations 3x more effectively than traditional fiberglass." },
      ]),
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "The Collection Snowboard: Oxygen",
        offers: { "@type": "Offer", price: "885.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      }),
      imageAltText: "The Collection Snowboard Oxygen ultralight alpine freeride board with basalt dampening",
    },
  ];

  for (const p of aiReadyProducts) {
    const existing = await db.productOptimization.findUnique({
      where: { shop_productId: { shop, productId: p.productId } },
    });

    let optRecordId = existing?.id;
    if (existing) {
      await db.productOptimization.update({
        where: { id: existing.id },
        data: {
          status: p.status,
          aiScore: p.aiScore,
          geoScore: p.geoScore,
          optimizedTitle: p.optimizedTitle,
          optimizedMetaDesc: p.optimizedMetaDesc,
          specMatrixHtml: p.specMatrixHtml,
          specTableHtml: p.specMatrixHtml,
          faqJson: p.faqJson,
          schemaJson: p.schemaJson,
          imageAltText: p.imageAltText,
          lastOptimizedAt: new Date(),
        },
      });
    } else {
      const created = await db.productOptimization.create({
        data: {
          shop,
          productId: p.productId,
          title: p.title,
          handle: p.handle,
          productTitle: p.title,
          productHandle: p.handle,
          status: p.status,
          aiScore: p.aiScore,
          geoScore: p.geoScore,
          optimizedTitle: p.optimizedTitle,
          optimizedMetaDesc: p.optimizedMetaDesc,
          specMatrixHtml: p.specMatrixHtml,
          specTableHtml: p.specMatrixHtml,
          faqJson: p.faqJson,
          schemaJson: p.schemaJson,
          imageAltText: p.imageAltText,
          lastOptimizedAt: new Date(),
        },
      });
      optRecordId = created.id;
    }

    if (optRecordId) {
      const rev = await db.revisionHistory.findFirst({
        where: { productOptimizationId: optRecordId },
      });
      if (!rev) {
        await db.revisionHistory.create({
          data: {
            productOptimizationId: optRecordId,
            productId: p.productId,
            shop,
            titleSnapshot: p.title,
            bodyHtmlSnapshot: p.originalBodyHtml,
            seoTitleSnapshot: p.title,
            seoDescriptionSnapshot: "",
            metafieldsSnapshot: "{}",
            altTextSnapshot: p.imageAltText,
            rolledBack: false,
          },
        });
      }
    }
  }

  // 4. Upsert 3 unoptimized records in SQLite so DB is aware of full 5-product catalog
  const unoptimizedData = [
    {
      productId: "gid://shopify/Product/8472917003",
      title: "The 3p Fulfilled Snowboard",
      handle: "the-3p-fulfilled-snowboard",
    },
    {
      productId: "gid://shopify/Product/8472917004",
      title: "The Multi-managed Snowboard",
      handle: "the-multi-managed-snowboard",
    },
    {
      productId: "gid://shopify/Product/8472917005",
      title: "The Multi-location Snowboard",
      handle: "the-multi-location-snowboard",
    },
  ];

  for (const item of unoptimizedData) {
    await db.productOptimization.upsert({
      where: { shop_productId: { shop, productId: item.productId } },
      update: {
        status: "NEEDS_OPTIMIZATION",
        aiScore: 38,
        geoScore: 38,
      },
      create: {
        shop,
        productId: item.productId,
        title: item.title,
        handle: item.handle,
        productTitle: item.title,
        productHandle: item.handle,
        status: "NEEDS_OPTIMIZATION",
        aiScore: 38,
        geoScore: 38,
      },
    });
  }

  console.log("Seeding complete: 3 unoptimized, 2 AI_READY products configured (40% baseline GEO readiness).");
}

seedCatalog()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
