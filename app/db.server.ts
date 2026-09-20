import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Ensure writable database path on serverless (Vercel)
if (process.env.VERCEL) {
  const tmpDb = "/tmp/dev.sqlite";
  process.env.DATABASE_URL = `file:${tmpDb}`;

  if (!fs.existsSync(tmpDb)) {
    const candidates = [
      path.join(process.cwd(), "prisma", "dev.sqlite"),
      path.join(process.cwd(), "dev.sqlite"),
      "/var/task/prisma/dev.sqlite",
    ];
    for (const src of candidates) {
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, tmpDb);
          console.log(`[RankPilot DB] Copied database seed from ${src} to ${tmpDb}`);
          break;
        } catch (e) {
          console.error(`[RankPilot DB] Failed copying from ${src}:`, e);
        }
      }
    }
  }
}

declare global {
  var prismaGlobal: PrismaClient | undefined;
  var dbSchemaInitialized: boolean | undefined;
}

export const db: PrismaClient =
  globalThis.prismaGlobal ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}

// Self-healing schema initializer: Ensure tables exist if running on fresh serverless container
export async function ensureDatabaseSchema() {
  if (globalThis.dbSchemaInitialized) return;
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductOptimization" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "productHandle" TEXT,
        "productTitle" TEXT,
        "title" TEXT,
        "handle" TEXT,
        "status" TEXT NOT NULL DEFAULT 'NEEDS_OPTIMIZATION',
        "geoScore" INTEGER NOT NULL DEFAULT 38,
        "aiScore" INTEGER NOT NULL DEFAULT 38,
        "originalTitle" TEXT,
        "originalBodyHtml" TEXT,
        "originalDescription" TEXT,
        "optimizedTitle" TEXT,
        "optimizedMetaDesc" TEXT,
        "specTableHtml" TEXT,
        "specMatrixHtml" TEXT,
        "faqJson" TEXT,
        "schemaJson" TEXT,
        "aiOverviewPreview" TEXT,
        "lastOptimizedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoreConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
        "zeroClickAutopilot" BOOLEAN NOT NULL DEFAULT false,
        "planTier" TEXT NOT NULL DEFAULT 'STARTER',
        "subscriptionId" TEXT,
        "gscConnected" BOOLEAN NOT NULL DEFAULT false,
        "gscPropertyId" TEXT,
        "gscRefreshToken" TEXT,
        "viralBadgeEnabled" BOOLEAN NOT NULL DEFAULT false,
        "weeklyDigestEmail" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppSetting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "plan" TEXT NOT NULL DEFAULT 'SCALE',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "subscriptionId" TEXT,
        "subscriptionConfirmationUrl" TEXT,
        "trialEndsAt" DATETIME,
        "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
        "geminiApiKey" TEXT,
        "indexNowKey" TEXT,
        "autoPingIndexNow" BOOLEAN NOT NULL DEFAULT true,
        "autopilotEnabled" BOOLEAN NOT NULL DEFAULT true,
        "storeDomain" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RevisionHistory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "productOptimizationId" TEXT,
        "snapshotTitle" TEXT,
        "snapshotBodyHtml" TEXT,
        "snapshotMetaDesc" TEXT,
        "snapshotMetafields" TEXT,
        "titleSnapshot" TEXT,
        "bodyHtmlSnapshot" TEXT,
        "seoTitleSnapshot" TEXT,
        "seoDescriptionSnapshot" TEXT,
        "metafieldsSnapshot" TEXT,
        "rolledBack" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "isOnline" BOOLEAN NOT NULL DEFAULT false,
        "scope" TEXT,
        "expires" DATETIME,
        "accessToken" TEXT NOT NULL,
        "userId" BIGINT,
        "firstName" TEXT,
        "lastName" TEXT,
        "email" TEXT,
        "accountOwner" BOOLEAN NOT NULL DEFAULT false,
        "locale" TEXT,
        "collaborator" BOOLEAN DEFAULT false,
        "emailVerified" BOOLEAN DEFAULT false
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StrikingDistanceQuery" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "query" TEXT NOT NULL,
        "impressions" INTEGER NOT NULL,
        "clicks" INTEGER NOT NULL,
        "position" REAL NOT NULL,
        "ctr" REAL NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StockoutRedirect" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "productHandle" TEXT NOT NULL,
        "targetPath" TEXT NOT NULL,
        "shopifyRedirectId" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CompetitorTracker" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "competitorUrl" TEXT NOT NULL,
        "lastPrice" REAL,
        "lastEntities" TEXT,
        "reviewWeaknesses" TEXT,
        "lastScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PerformanceDigest" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "weekStartDate" DATETIME NOT NULL,
        "pingsDispatched" INTEGER NOT NULL DEFAULT 0,
        "schemaImpressions" INTEGER NOT NULL DEFAULT 0,
        "redirectsProtected" INTEGER NOT NULL DEFAULT 0,
        "croBaselineConv" REAL NOT NULL DEFAULT 0.0,
        "croPostOptConv" REAL NOT NULL DEFAULT 0.0
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "IndexNowLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "keyUsed" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "statusCode" INTEGER,
        "response" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AutopilotLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "actionType" TEXT NOT NULL,
        "details" TEXT NOT NULL,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CitationMetric" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "query" TEXT NOT NULL,
        "engine" TEXT NOT NULL,
        "rankPosition" INTEGER NOT NULL,
        "isCited" BOOLEAN NOT NULL DEFAULT true,
        "competitorCited" TEXT,
        "snippet" TEXT,
        "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    globalThis.dbSchemaInitialized = true;
  } catch (err) {
    console.warn("[RankPilot DB] Schema ensure notice:", err);
  }
}

// Ensure schema on module load
ensureDatabaseSchema().catch(() => {});

export default db;
