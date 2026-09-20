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

  // 2. Clear any prior optimization records for products 1 and 3 so they are pristine unoptimized
  await db.productOptimization.deleteMany({
    where: {
      shop,
      productId: {
        in: [
          "gid://shopify/Product/9182371901",
          "gid://shopify/Product/9182371903",
        ],
      },
    },
  });

  // Also remove revisions for these 2 products
  await db.revisionHistory.deleteMany({
    where: {
      shop,
      productId: {
        in: [
          "gid://shopify/Product/9182371901",
          "gid://shopify/Product/9182371903",
        ],
      },
    },
  });

  // 3. Upsert products 2, 4, 5 as AI_READY (score 96)
  const aiReadyProducts = [
    {
      productId: "gid://shopify/Product/9182371902",
      title: "Titanium Armor Apple Watch Ultra Band 49mm",
      handle: "titanium-armor-apple-watch-ultra-band-49mm",
      status: "AI_READY",
      aiScore: 96,
      optimizedTitle: "Titanium Apple Watch Ultra Band (Grade 2 Titanium) | Apex",
      optimizedMetaDesc: "Custom Grade 2 Titanium link bracelet for Apple Watch Ultra. DLC coated, ultralight, magnetic deployment clasp. Order with free express delivery.",
      specMatrixHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Material</td><td>Grade 2 Aerospace Titanium + DLC Scratch-Resistant Coating</td></tr><tr><td>Compatibility</td><td>Apple Watch Ultra 1/2 (49mm) & Series 10/9/8 (45mm/44mm)</td></tr><tr><td>Clasp Type</td><td>Dual Magnetic Deployment Clasp (Ultra-Secure)</td></tr><tr><td>Weight & Dimensions</td><td>68 grams | Adjustable 140mm - 225mm wrist circumference</td></tr><tr><td>Water Resistance</td><td>100m Ocean / Saltwater & Sweat Proof</td></tr><tr><td>Warranty</td><td>Lifetime Structural Warranty + Free Sizing Tool</td></tr></tbody></table>`,
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
    },
    {
      productId: "gid://shopify/Product/9182371904",
      title: "QuantumGrip MagSafe Wireless Car Vent Charger 15W",
      handle: "quantumgrip-magsafe-wireless-car-vent-charger-15w",
      status: "AI_READY",
      aiScore: 96,
      optimizedTitle: "15W Qi2 MagSafe Car Charger Mount with Active Cooling | Apex",
      optimizedMetaDesc: "Fast 15W Qi2 wireless car charger with active cooling and N52 magnets. Guaranteed zero-slip grip on any vent. Ships free today with 2-year warranty.",
      specMatrixHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Charging Standard</td><td>Official Qi2 Certified 15W Fast Wireless Charging</td></tr><tr><td>Magnet Array</td><td>16x N52 Neodymium Magnets (Holds up to 1.8kg)</td></tr><tr><td>Thermal System</td><td>Silent Active Cooling Turbine Fan (Prevents Phone Throttling)</td></tr><tr><td>Mounting Mechanism</td><td>Steel-Core Hook Lock Clip for Standard & Round AC Vents</td></tr><tr><td>Input Power</td><td>USB-C PD 3.0 (Includes 36W Dual USB-C 12V Car Adapter)</td></tr><tr><td>Warranty</td><td>2-Year Replacement Warranty + 30-Day Money-Back Guarantee</td></tr></tbody></table>`,
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
    },
    {
      productId: "gid://shopify/Product/9182371905",
      title: "Zenith ANC Wireless Noise-Cancelling Headphones",
      handle: "zenith-anc-wireless-headphones",
      status: "AI_READY",
      aiScore: 96,
      optimizedTitle: "Zenith ANC Wireless Headphones (Spatial Audio & 40H Battery) | Aura",
      optimizedMetaDesc: "Studio-grade hybrid active noise cancelling headphones. 40-hour battery, lossless LDAC codec, and personalized spatial audio. Shop with 30-day trial.",
      specMatrixHtml: `<table class="rankpilot-spec-matrix"><thead><tr><th>Feature / Specification</th><th>Details</th></tr></thead><tbody><tr><td>Noise Cancellation</td><td>Hybrid 4-Mic Active Noise Cancellation (-42dB attenuation)</td></tr><tr><td>Driver Architecture</td><td>40mm Custom Bio-Cellulose Dynamic Drivers</td></tr><tr><td>Battery Life</td><td>40 Hours (ANC ON) / 60 Hours (ANC OFF) | Fast Charge 10m = 5h</td></tr><tr><td>Bluetooth & Codecs</td><td>Bluetooth 5.4, LDAC, aptX Adaptive, AAC, SBC</td></tr><tr><td>Microphone Array</td><td>6-Beamforming Mics with AI Wind Noise Suppression</td></tr><tr><td>Warranty</td><td>2-Year Global Manufacturer Warranty & 30-Day Audition Trial</td></tr></tbody></table>`,
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
          optimizedTitle: p.optimizedTitle,
          optimizedMetaDesc: p.optimizedMetaDesc,
          specMatrixHtml: p.specMatrixHtml,
          faqJson: p.faqJson,
          schemaJson: p.schemaJson,
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
          status: p.status,
          aiScore: p.aiScore,
          optimizedTitle: p.optimizedTitle,
          optimizedMetaDesc: p.optimizedMetaDesc,
          specMatrixHtml: p.specMatrixHtml,
          faqJson: p.faqJson,
          schemaJson: p.schemaJson,
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
            bodyHtmlSnapshot: "<p>Original unoptimized storefront description.</p>",
            seoTitleSnapshot: p.title,
            seoDescriptionSnapshot: "",
            metafieldsSnapshot: "{}",
            rolledBack: false,
          },
        });
      }
    }
  }

  console.log("Seeding complete: 2 unoptimized, 3 AI_READY products configured.");
}

seedCatalog()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
