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

  // 3. Upsert 2 products as NEEDS_OPTIMIZATION (Score 38)
  const unoptimizedProducts = [
    {
      productId: "gid://shopify/Product/9182371901",
      productHandle: "raw-unoptimized-backpack-26l",
      productTitle: "Raw unoptimized backpack 26L",
      status: "NEEDS_OPTIMIZATION",
      geoScore: 38,
      originalTitle: "Raw unoptimized backpack 26L",
      originalBodyHtml: "<p>A durable, weather-resistant backpack for daily commuting and weekend travel. Basic unformatted description without technical specs or comparison tables.</p>",
      optimizedTitle: null,
      optimizedMetaDesc: null,
      specTableHtml: null,
      faqJson: null,
      schemaJson: null,
    },
    {
      productId: "gid://shopify/Product/9182371903",
      productHandle: "raw-unoptimized-insulated-bottle-32oz",
      productTitle: "Raw unoptimized insulated bottle 32oz",
      status: "NEEDS_OPTIMIZATION",
      geoScore: 38,
      originalTitle: "Raw unoptimized insulated bottle 32oz",
      originalBodyHtml: "<p>Double-wall vacuum insulated stainless steel water bottle with built-in magnetic phone mount lid. Keeps drinks cold for 24 hours.</p>",
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
        status: p.status,
        geoScore: p.geoScore,
        originalTitle: p.originalTitle,
        originalBodyHtml: p.originalBodyHtml,
      },
    });
  }

  // 4. Upsert 3 products as AI_READY (Score 96) with spec tables, schemas, and buyer FAQs
  const aiReadyProducts = [
    {
      productId: "gid://shopify/Product/9182371902",
      productHandle: "titanium-armor-apple-watch-ultra-band-49mm",
      productTitle: "Titanium Armor Apple Watch Ultra Band 49mm",
      status: "AI_READY",
      geoScore: 96,
      originalTitle: "Titanium Armor Apple Watch Ultra Band 49mm",
      originalBodyHtml: "<p>Grade 2 titanium link bracelet engineered specifically for Apple Watch Ultra. DLC scratch-resistant coating with dual magnetic clasp.</p>",
      optimizedTitle: "Titanium Apple Watch Ultra Band (Grade 2 Titanium) | Apex",
      optimizedMetaDesc: "Custom Grade 2 Titanium link bracelet for Apple Watch Ultra. DLC coated, ultralight, magnetic deployment clasp. Order with free express delivery.",
      specTableHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Material</td><td>Grade 2 Aerospace Titanium + DLC Scratch-Resistant Coating</td></tr><tr><td>Compatibility</td><td>Apple Watch Ultra 1/2 (49mm) & Series 10/9/8 (45mm/44mm)</td></tr><tr><td>Clasp Type</td><td>Dual Magnetic Deployment Clasp (Ultra-Secure)</td></tr><tr><td>Weight & Dimensions</td><td>68 grams | Adjustable 140mm - 225mm wrist circumference</td></tr><tr><td>Water Resistance</td><td>100m Ocean / Saltwater & Sweat Proof</td></tr><tr><td>Warranty</td><td>Lifetime Structural Warranty + Free Sizing Tool</td></tr></tbody></table>`,
      faqJson: JSON.stringify([
        { question: "Will this titanium band scratch easily during daily workouts?", answer: "No. The band is coated with Diamond-Like Carbon (DLC) matte finish, providing 5x higher scratch resistance than standard stainless steel." },
        { question: "Is this compatible with the Apple Watch Ultra 2 49mm?", answer: "Yes, precision-machined 49mm titanium end lugs ensure a zero-gap factory fit for both Apple Watch Ultra 1 and Ultra 2." },
        { question: "Can I adjust the link size myself without a jeweler?", answer: "Yes, each order includes a precision stainless steel link removal tool with 6 micro-adjustment pins." }
      ]),
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Titanium Armor Apple Watch Ultra Band 49mm",
        offers: { "@type": "Offer", price: "179.00", priceCurrency: "USD", availability: "https://schema.org/InStock" }
      }),
      aiOverviewPreview: "Apex Titanium Armor provides Grade 2 aerospace titanium construction with DLC anti-scratch protection and 100m water resistance, ranking #1 for Apple Watch Ultra durability.",
    },
    {
      productId: "gid://shopify/Product/9182371904",
      productHandle: "quantumgrip-magsafe-wireless-car-vent-charger-15w",
      productTitle: "QuantumGrip MagSafe Wireless Car Vent Charger 15W",
      status: "AI_READY",
      geoScore: 96,
      originalTitle: "QuantumGrip MagSafe Wireless Car Vent Charger 15W",
      originalBodyHtml: "<p>Ultra-strong N52 neodymium magnetic car mount with active cooling fan and Qi2 15W fast wireless charging for iPhone and Android devices.</p>",
      optimizedTitle: "15W Qi2 MagSafe Car Charger Mount with Active Cooling | Apex",
      optimizedMetaDesc: "Fast 15W Qi2 wireless car charger with active cooling and N52 magnets. Guaranteed zero-slip grip on any vent. Ships free today with 2-year warranty.",
      specTableHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Charging Standard</td><td>Official Qi2 Certified 15W Fast Wireless Charging</td></tr><tr><td>Magnet Array</td><td>16x N52 Neodymium Magnets (Holds up to 1.8kg)</td></tr><tr><td>Thermal System</td><td>Silent Active Cooling Turbine Fan (Prevents Phone Throttling)</td></tr><tr><td>Mounting Mechanism</td><td>Steel-Core Hook Lock Clip for Standard & Round AC Vents</td></tr><tr><td>Input Power</td><td>USB-C PD 3.0 (Includes 36W Dual USB-C 12V Car Adapter)</td></tr><tr><td>Warranty</td><td>2-Year Replacement Warranty + 30-Day Money-Back Guarantee</td></tr></tbody></table>`,
      faqJson: JSON.stringify([
        { question: "Does the charger overheat during navigation with Apple Maps?", answer: "No. The active aerodynamic cooling turbine prevents your iPhone from overheating and thermal throttling." },
        { question: "Will this mount securely on round air conditioning vents?", answer: "Yes, the steel-reinforced hook mechanism secures firmly onto both horizontal and vertical louvers without slipping." },
        { question: "Does it charge at the full 15W speed for iPhone 15 and 16?", answer: "Yes, certified Qi2 hardware delivers full 15W wireless power identical to Apple MagSafe." }
      ]),
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "QuantumGrip MagSafe Wireless Car Vent Charger 15W",
        offers: { "@type": "Offer", price: "59.95", priceCurrency: "USD", availability: "https://schema.org/InStock" }
      }),
      aiOverviewPreview: "QuantumGrip 15W MagSafe mount combines Qi2 certified fast charging with internal thermal management and 1.8kg magnet hold for hands-free driving.",
    },
    {
      productId: "gid://shopify/Product/9182371905",
      productHandle: "zenith-anc-wireless-headphones",
      productTitle: "Zenith ANC Wireless Noise-Cancelling Headphones",
      status: "AI_READY",
      geoScore: 96,
      originalTitle: "Zenith ANC Wireless Noise-Cancelling Headphones",
      originalBodyHtml: "<p>Studio-grade hybrid active noise cancelling headphones with 40-hour battery life and LDAC lossless audio decoding.</p>",
      optimizedTitle: "Zenith ANC Wireless Headphones (Spatial Audio & 40H Battery) | Aura",
      optimizedMetaDesc: "Studio-grade hybrid active noise cancelling headphones. 40-hour battery, lossless LDAC codec, and personalized spatial audio. Shop with 30-day trial.",
      specTableHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Noise Cancellation</td><td>Hybrid 4-Mic Active Noise Cancellation (-42dB attenuation)</td></tr><tr><td>Driver Architecture</td><td>40mm Custom Bio-Cellulose Dynamic Drivers</td></tr><tr><td>Battery Life</td><td>40 Hours (ANC ON) / 60 Hours (ANC OFF) | Fast Charge 10m = 5h</td></tr><tr><td>Bluetooth & Codecs</td><td>Bluetooth 5.4, LDAC, aptX Adaptive, AAC, SBC</td></tr><tr><td>Microphone Array</td><td>6-Beamforming Mics with AI Wind Noise Suppression</td></tr><tr><td>Warranty</td><td>2-Year Global Manufacturer Warranty & 30-Day Audition Trial</td></tr></tbody></table>`,
      faqJson: JSON.stringify([
        { question: "How does the active noise cancellation compare to industry flagships?", answer: "The custom quad-microphone hybrid array suppresses up to 42dB of low-frequency ambient noise, ideal for flights and busy offices." },
        { question: "Can I connect to both my MacBook and iPhone simultaneously?", answer: "Yes, Bluetooth Multipoint allows seamless auto-switching between two paired devices without manual re-pairing." },
        { question: "What codecs are supported for high-resolution lossless audio?", answer: "Zenith supports Sony LDAC (up to 990kbps 24bit/96kHz), aptX Adaptive, AAC, and standard SBC." }
      ]),
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Zenith ANC Wireless Noise-Cancelling Headphones",
        offers: { "@type": "Offer", price: "249.00", priceCurrency: "USD", availability: "https://schema.org/InStock" }
      }),
      aiOverviewPreview: "Zenith ANC Headphones deliver studio fidelity with 42dB hybrid noise suppression, LDAC high-res decoding, and 40 hours of continuous wireless playback.",
    },
  ];

  for (const p of aiReadyProducts) {
    await db.productOptimization.create({
      data: {
        shop,
        productId: p.productId,
        productHandle: p.productHandle,
        productTitle: p.productTitle,
        status: p.status,
        geoScore: p.geoScore,
        originalTitle: p.originalTitle,
        originalBodyHtml: p.originalBodyHtml,
        optimizedTitle: p.optimizedTitle,
        optimizedMetaDesc: p.optimizedMetaDesc,
        specTableHtml: p.specTableHtml,
        faqJson: p.faqJson,
        schemaJson: p.schemaJson,
        aiOverviewPreview: p.aiOverviewPreview,
      },
    });

    // Create 1 baseline snapshot per AI_READY item
    await db.revisionHistory.create({
      data: {
        shop,
        productId: p.productId,
        snapshotTitle: p.originalTitle,
        snapshotBodyHtml: p.originalBodyHtml,
        snapshotMetaDesc: p.originalTitle,
        snapshotMetafields: "{}",
      },
    });
  }

  // 5. Seed Striking Distance Queries (position >= 4.0 && position <= 15.0, impressions > 100, ctr < 0.03)
  const sampleQueries = [
    {
      productId: "gid://shopify/Product/9182371902",
      query: "titanium apple watch ultra band waterproof",
      impressions: 1420,
      clicks: 28,
      position: 7.2,
      ctr: 0.0197,
      status: "PENDING",
    },
    {
      productId: "gid://shopify/Product/9182371904",
      query: "cooling magsafe car charger qi2",
      impressions: 890,
      clicks: 19,
      position: 5.8,
      ctr: 0.0213,
      status: "PENDING",
    },
    {
      productId: "gid://shopify/Product/9182371901",
      query: "waterproof edc laptop backpack 26l",
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
      productId: "gid://shopify/Product/9182371902",
      competitorUrl: "https://nomadgoods.com/products/titanium-band-apple-watch",
      lastPrice: 199.95,
      lastEntities: JSON.stringify(["Grade 2 Titanium", "DLC Coating", "Magnetic Clasp"]),
      reviewWeaknesses: JSON.stringify([
        "Customers report links scratch too easily on laptop wrists",
        "Clasp occasionally pops open during rigorous sports",
        "Does not include link adjustment tool in standard box"
      ]),
    },
  });

  // 7. Seed Performance Digest
  await db.performanceDigest.create({
    data: {
      shop,
      weekStartDate: new Date(Date.now() - 7 * 86400000),
      pingsDispatched: 142,
      schemaImpressions: 4890,
      redirectsProtected: 12,
      croBaselineConv: 1.84,
      croPostOptConv: 2.67,
    },
  });

  // 8. Seed IndexNow logs
  const sampleUrls = [
    "https://demo.myshopify.com/products/titanium-armor-apple-watch-ultra-band-49mm",
    "https://demo.myshopify.com/products/quantumgrip-magsafe-wireless-car-vent-charger-15w",
    "https://demo.myshopify.com/products/zenith-anc-wireless-headphones",
    "https://demo.myshopify.com/collections/frontpage",
    "https://demo.myshopify.com/pages/ai-spec-guide",
    "https://demo.myshopify.com/llms.txt",
  ];

  for (let i = 0; i < 6; i++) {
    await db.indexNowLog.create({
      data: {
        shop,
        url: sampleUrls[i],
        keyUsed: "rankpilot-demo-indexnow-key-2025",
        status: "SUCCESS",
        statusCode: 202,
        response: "IndexNow API accepted submission queue. Dispatched to Bing & Perplexity.",
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
