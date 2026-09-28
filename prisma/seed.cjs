const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function seedCatalog() {
  const shop = "demo.myshopify.com";

  console.log("Seeding RankPilot database for", shop);

  // 1. Ensure StoreConfig & AppSetting
  await db.storeConfig.upsert({
    where: { shop },
    update: {
      planTier: "SCALE",
      isOnboarded: false,
      zeroClickAutopilot: true,
      gscConnected: true,
      gscPropertyId: "sc-domain:demo.myshopify.com",
      viralBadgeEnabled: true,
      weeklyDigestEmail: "merchant@demo.myshopify.com",
    },
    create: {
      shop,
      planTier: "SCALE",
      isOnboarded: false,
      zeroClickAutopilot: true,
      gscConnected: true,
      gscPropertyId: "sc-domain:demo.myshopify.com",
      viralBadgeEnabled: true,
      weeklyDigestEmail: "merchant@demo.myshopify.com",
    },
  });

  await db.appSetting.upsert({
    where: { shop },
    update: {
      plan: "SCALE",
      autopilotEnabled: true,
      autoPingIndexNow: true,
      storeDomain: "demo.myshopify.com",
      indexNowKey: "rankpilot-demo-indexnow-key-2025",
      isOnboarded: false,
    },
    create: {
      shop,
      plan: "SCALE",
      autopilotEnabled: true,
      autoPingIndexNow: true,
      storeDomain: "demo.myshopify.com",
      indexNowKey: "rankpilot-demo-indexnow-key-2025",
      isOnboarded: false,
    },
  });

  // 2. Clear previous records for clean baseline
  await db.revisionHistory.deleteMany({ where: { shop } });
  await db.productOptimization.deleteMany({ where: { shop } });
  await db.strikingDistanceQuery.deleteMany({ where: { shop } });
  await db.stockoutRedirect.deleteMany({ where: { shop } });
  await db.competitorTracker.deleteMany({ where: { shop } });
  await db.performanceDigest.deleteMany({ where: { shop } });
  await db.indexNowLog.deleteMany({ where: { shop } });

  // 3. Upsert 3 products as NEEDS_OPTIMIZATION (Score 38)
  const unoptimizedProducts = [
    {
      productId: "gid://shopify/Product/8472917003",
      productHandle: "the-3p-fulfilled-snowboard",
      productTitle: "The 3p Fulfilled Snowboard",
      status: "NEEDS_OPTIMIZATION",
      geoScore: 38,
      aiScore: 38,
      originalTitle: "The 3p Fulfilled Snowboard",
      originalBodyHtml: "<p>Handcrafted limited-edition freestyle snowboard with custom camber profile, seamless polyurethane sidewalls, and competition sintered race base.</p>",
      optimizedTitle: null,
      optimizedMetaDesc: null,
      specTableHtml: null,
      faqJson: null,
      schemaJson: null,
    },
    {
      productId: "gid://shopify/Product/8472917004",
      productHandle: "the-multi-managed-snowboard",
      productTitle: "The Multi-managed Snowboard",
      status: "NEEDS_OPTIMIZATION",
      geoScore: 38,
      aiScore: 38,
      originalTitle: "The Multi-managed Snowboard",
      originalBodyHtml: "<p>Versatile twin-tip park snowboard with medium flex, extruded durable base, and reinforced steel edges for rails, jumps, and terrain park laps.</p>",
      optimizedTitle: null,
      optimizedMetaDesc: null,
      specTableHtml: null,
      faqJson: null,
      schemaJson: null,
    },
    {
      productId: "gid://shopify/Product/8472917005",
      productHandle: "the-multi-location-snowboard",
      productTitle: "The Multi-location Snowboard",
      status: "NEEDS_OPTIMIZATION",
      geoScore: 38,
      aiScore: 38,
      originalTitle: "The Multi-location Snowboard",
      originalBodyHtml: "<p>All-terrain hybrid rocker/camber board engineered for quick edge-to-edge transitions, tree runs, and groomed resort cruising.</p>",
      optimizedTitle: null,
      optimizedMetaDesc: null,
      specTableHtml: null,
      faqJson: null,
      schemaJson: null,
    },
  ];

  for (const p of unoptimizedProducts) {
    await db.productOptimization.create({
      data: {
        shop,
        productId: p.productId,
        productHandle: p.productHandle,
        productTitle: p.productTitle,
        title: p.productTitle,
        handle: p.productHandle,
        status: p.status,
        geoScore: p.geoScore,
        aiScore: p.aiScore,
        originalTitle: p.originalTitle,
        originalBodyHtml: p.originalBodyHtml,
        originalDescription: p.originalBodyHtml,
      },
    });
  }

  // 4. Upsert 2 products as AI_READY (Score 96) - 2 of 5 = 40% GEO Readiness baseline
  const aiReadyProducts = [
    {
      productId: "gid://shopify/Product/8472917001",
      productHandle: "the-collection-snowboard-liquid",
      productTitle: "The Collection Snowboard: Liquid",
      status: "AI_READY",
      geoScore: 96,
      aiScore: 96,
      originalTitle: "The Collection Snowboard: Liquid",
      originalBodyHtml: "<p>Premium all-mountain directional snowboard designed for high-speed carving, powder flotation, and backcountry freestyle performance. Features carbon fiber stringers and sintered base.</p>",
      optimizedTitle: "The Collection Snowboard: Liquid (All-Mountain Carving & Powder)",
      optimizedMetaDesc: "Handcrafted all-mountain snowboard with carbon stringers and sintered race base. Maximum edge hold and backcountry flotation. Order with free express shipping.",
      specTableHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Specification</th><th>Details & Measurements</th></tr></thead><tbody><tr><td>Profile & Camber</td><td>Directional Camber with 10mm Tapered Powder Tail</td></tr><tr><td>Core Materials</td><td>FSC Poplar & Paulownia Wood Core with Carbon V-Bars</td></tr><tr><td>Base Technology</td><td>Sintered Ultra-High-Molecular-Weight (UHMW) Base</td></tr><tr><td>Flex Rating</td><td>7/10 (Medium-Stiff All-Mountain Response)</td></tr><tr><td>Warranty</td><td>3-Year Manufacturer Warranty + Lifetime Edge Guarantee</td></tr></tbody></table>`,
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
      aiOverviewPreview: "The Collection Snowboard Liquid combines directional camber profile with sintered UHMW base and carbon stringers for maximum all-mountain carving and powder float.",
      imageAltText: "The Collection Snowboard Liquid matte carbon directional freeride snowboard on powder snow",
    },
    {
      productId: "gid://shopify/Product/8472917002",
      productHandle: "the-collection-snowboard-oxygen",
      productTitle: "The Collection Snowboard: Oxygen",
      status: "AI_READY",
      geoScore: 96,
      aiScore: 96,
      originalTitle: "The Collection Snowboard: Oxygen",
      originalBodyHtml: "<p>Ultralight freeride snowboard with triaxial fiberglass matrix, basalt dampening, and titanium mounting inserts. Engineered for alpine racing and steep terrain.</p>",
      optimizedTitle: "The Collection Snowboard: Oxygen (Ultralight Freeride Performance)",
      optimizedMetaDesc: "Aerospace-grade freeride snowboard with basalt dampening and titanium mounting inserts. Built for high-speed alpine stability. Shop with 30-day trial.",
      specTableHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Specification</th><th>Details & Measurements</th></tr></thead><tbody><tr><td>Profile</td><td>Pure Camber with Early Rise Nose for Float</td></tr><tr><td>Reinforcement</td><td>Titanium Binding Inlays & Basalt Vibration Dampeners</td></tr><tr><td>Base</td><td>Electra 9000 Graphite Race Base</td></tr><tr><td>Flex</td><td>8/10 (Stiff Freeride / High-Speed Stability)</td></tr><tr><td>Warranty</td><td>3-Year Manufacturer Warranty</td></tr></tbody></table>`,
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
      aiOverviewPreview: "The Collection Snowboard Oxygen delivers aerospace basalt dampening and titanium binding inlays for zero-chatter alpine high-speed carving.",
      imageAltText: "The Collection Snowboard Oxygen ultralight alpine freeride board with basalt dampening",
    },
  ];

  for (const p of aiReadyProducts) {
    const createdOpt = await db.productOptimization.create({
      data: {
        shop,
        productId: p.productId,
        productHandle: p.productHandle,
        productTitle: p.productTitle,
        title: p.productTitle,
        handle: p.productHandle,
        status: p.status,
        geoScore: p.geoScore,
        aiScore: p.aiScore,
        originalTitle: p.originalTitle,
        originalBodyHtml: p.originalBodyHtml,
        originalDescription: p.originalBodyHtml,
        optimizedTitle: p.optimizedTitle,
        optimizedMetaDesc: p.optimizedMetaDesc,
        specTableHtml: p.specTableHtml,
        specMatrixHtml: p.specTableHtml,
        faqJson: p.faqJson,
        schemaJson: p.schemaJson,
        aiOverviewPreview: p.aiOverviewPreview,
        imageAltText: p.imageAltText,
        lastOptimizedAt: new Date(),
      },
    });

    // Create 1 baseline snapshot per AI_READY item
    await db.revisionHistory.create({
      data: {
        shop,
        productId: p.productId,
        productOptimizationId: createdOpt.id,
        snapshotTitle: p.originalTitle,
        snapshotBodyHtml: p.originalBodyHtml,
        snapshotMetaDesc: p.originalTitle,
        snapshotMetafields: "{}",
        titleSnapshot: p.originalTitle,
        bodyHtmlSnapshot: p.originalBodyHtml,
        seoTitleSnapshot: p.originalTitle,
        seoDescriptionSnapshot: "",
        metafieldsSnapshot: "{}",
        altTextSnapshot: p.imageAltText,
      },
    });
  }

  // 5. Seed Striking Distance Queries mapped to actual catalog items
  const sampleQueries = [
    {
      productId: "gid://shopify/Product/8472917001",
      query: "all-mountain freeride snowboard powder",
      impressions: 1420,
      clicks: 28,
      position: 7.2,
      ctr: 0.0197,
      status: "PENDING",
    },
    {
      productId: "gid://shopify/Product/8472917002",
      query: "lightweight camber snowboard basalt",
      impressions: 890,
      clicks: 19,
      position: 5.8,
      ctr: 0.0213,
      status: "PENDING",
    },
    {
      productId: "gid://shopify/Product/8472917004",
      query: "twin-tip freestyle park snowboard rails",
      impressions: 2150,
      clicks: 34,
      position: 11.4,
      ctr: 0.0158,
      status: "PENDING",
    },
  ];

  for (const q of sampleQueries) {
    await db.strikingDistanceQuery.create({
      data: {
        shop,
        productId: q.productId,
        query: q.query,
        impressions: q.impressions,
        clicks: q.clicks,
        position: q.position,
        ctr: q.ctr,
        status: q.status,
      },
    });
  }

  // 6. Seed Competitor Trackers
  await db.competitorTracker.create({
    data: {
      shop,
      productId: "gid://shopify/Product/8472917001",
      competitorUrl: "https://burton.com/products/custom-camber-snowboard",
      lastPrice: 649.95,
      lastEntities: JSON.stringify(["Directional Camber", "Sintered WFO Base", "Super Fly II 700G Core", "Carbon Highlights"]),
      reviewWeaknesses: JSON.stringify([
        "Factory wax dries out rapidly after single powder session on icy hardpack",
        "Topsheet chips along sidewall when bumping lift lines",
        "Base chatter at high carving speeds on uneven terrain"
      ]),
    },
  });

  // 7. Seed Performance Digest
  await db.performanceDigest.create({
    data: {
      shop,
      weekStartDate: new Date(Date.now() - 7 * 86400000),
      pingsDispatched: 14,
      schemaImpressions: 4890,
      redirectsProtected: 2,
      croBaselineConv: 1.84,
      croPostOptConv: 2.67,
    },
  });

  // 8. Seed IndexNow logs
  const sampleUrls = [
    "https://demo.myshopify.com/products/the-collection-snowboard-liquid",
    "https://demo.myshopify.com/products/the-collection-snowboard-oxygen",
    "https://demo.myshopify.com/products/the-3p-fulfilled-snowboard",
    "https://demo.myshopify.com/products/the-multi-managed-snowboard",
    "https://demo.myshopify.com/products/the-multi-location-snowboard",
    "https://demo.myshopify.com/llms.txt",
  ];

  for (let i = 0; i < sampleUrls.length; i++) {
    await db.indexNowLog.create({
      data: {
        shop,
        url: sampleUrls[i],
        keyUsed: "rankpilot-demo-indexnow-key-2025",
        status: "SUCCESS",
        statusCode: 202,
        response: "IndexNow API accepted submission queue. Dispatched to Bing, Copilot & Perplexity.",
      },
    });
  }

  const prodCount = await db.productOptimization.count({ where: { shop } });
  const revCount = await db.revisionHistory.count({ where: { shop } });
  const queryCount = await db.strikingDistanceQuery.count({ where: { shop } });
  console.log(`Seeding complete: ${prodCount} products (${revCount} revisions, ${queryCount} striking queries).`);
}

seedCatalog()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
