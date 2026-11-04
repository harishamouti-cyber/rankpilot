-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreConfig" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptimization" (
    "id" TEXT NOT NULL,
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
    "imageAltText" TEXT,
    "lastOptimizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionHistory" (
    "id" TEXT NOT NULL,
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
    "altTextSnapshot" TEXT,
    "rolledBack" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrikingDistanceQuery" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrikingDistanceQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockoutRedirect" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL,
    "targetPath" TEXT NOT NULL,
    "shopifyRedirectId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockoutRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorTracker" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "competitorUrl" TEXT NOT NULL,
    "lastPrice" DOUBLE PRECISION,
    "lastEntities" TEXT,
    "reviewWeaknesses" TEXT,
    "lastScannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceDigest" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "pingsDispatched" INTEGER NOT NULL DEFAULT 0,
    "schemaImpressions" INTEGER NOT NULL DEFAULT 0,
    "redirectsProtected" INTEGER NOT NULL DEFAULT 0,
    "croBaselineConv" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "croPostOptConv" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "PerformanceDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'SCALE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "subscriptionId" TEXT,
    "subscriptionConfirmationUrl" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "geminiApiKey" TEXT,
    "indexNowKey" TEXT,
    "autoPingIndexNow" BOOLEAN NOT NULL DEFAULT true,
    "autopilotEnabled" BOOLEAN NOT NULL DEFAULT true,
    "storeDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexNowLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "keyUsed" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexNowLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopilotLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutopilotLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitationMetric" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "query" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "rankPosition" INTEGER NOT NULL,
    "isCited" BOOLEAN NOT NULL DEFAULT true,
    "competitorCited" TEXT,
    "snippet" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "latencyMs" INTEGER,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreConfig_shop_key" ON "StoreConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptimization_productId_key" ON "ProductOptimization"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptimization_shop_productId_key" ON "ProductOptimization"("shop", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_shop_key" ON "AppSetting"("shop");

-- AddForeignKey
ALTER TABLE "RevisionHistory" ADD CONSTRAINT "RevisionHistory_productOptimizationId_fkey" FOREIGN KEY ("productOptimizationId") REFERENCES "ProductOptimization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

