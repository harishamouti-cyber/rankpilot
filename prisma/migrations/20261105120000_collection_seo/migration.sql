-- CreateTable
CREATE TABLE "CollectionSeoPreview" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectionTitle" TEXT NOT NULL,
    "sourceUpdatedAt" TEXT NOT NULL DEFAULT '',
    "currentSeoTitle" TEXT NOT NULL DEFAULT '',
    "currentSeoDescription" TEXT NOT NULL DEFAULT '',
    "currentDescriptionHtml" TEXT NOT NULL DEFAULT '',
    "suggestedSeoTitle" TEXT NOT NULL,
    "suggestedSeoDescription" TEXT NOT NULL,
    "suggestedDescriptionHtml" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'rules',
    "productsUsed" INTEGER NOT NULL DEFAULT 0,
    "productsTruncated" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionSeoPreview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSeoRevision" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "originalSeoTitle" TEXT NOT NULL DEFAULT '',
    "originalSeoDescription" TEXT NOT NULL DEFAULT '',
    "originalDescriptionHtml" TEXT NOT NULL DEFAULT '',
    "appliedSeoTitle" TEXT NOT NULL,
    "appliedSeoDescription" TEXT NOT NULL,
    "appliedDescriptionHtml" TEXT NOT NULL,
    "undone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionSeoRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSeoLock" (
    "shop" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionSeoLock_pkey" PRIMARY KEY ("shop","collectionId")
);

-- CreateIndex
CREATE INDEX "CollectionSeoPreview_shop_collectionId_idx" ON "CollectionSeoPreview"("shop", "collectionId");

-- CreateIndex
CREATE INDEX "CollectionSeoRevision_shop_collectionId_undone_idx" ON "CollectionSeoRevision"("shop", "collectionId", "undone");
