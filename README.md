# RankPilot — AI SEO, GEO & AI Search Overviews

> **Automated AI Search Optimization, Schemas & Fast Search Indexing.**
> *Keywords: GEO, AI SEO, Schema, AI Overviews, Generative Search*

**RankPilot** is an enterprise-grade Shopify application that bridges merchant product catalogs to Google Search, Google AI Overviews, and Generative Engine Optimization (GEO) platforms (**ChatGPT Search**, **Perplexity**, **Gemini**, and **Claude**) with 0ms storefront speed penalties.

---

## 🚀 Key Architectural Highlights

- **Zero-Liquid Storefront Footprint (0ms Core Web Vitals Impact):**
  Operates 100% server-side via the modern Shopify Admin GraphQL API (`productSet` mutation) and native Metafields. No theme code edits, no Liquid snippets, and no frontend ScriptTags.
- **Framework & UI:**
  Built with Remix (Vite) + TypeScript and `@shopify/polaris` (v13) for a 100% native Shopify Admin experience.
- **AI Engine (Google GenAI):**
  Integrated with Gemini Flash via `@google/genai` and `@google/generative-ai` with structured JSON schema outputs, generating high-CTR titles (<60 chars), meta descriptions (<155 chars), HTML specification matrices, rich JSON-LD snippets, and conversational FAQs in under 3 seconds.
- **Generative Engine Optimization (GEO):**
  - **Machine-Readable `/llms.txt` Feed:** Dedicated dynamic endpoint (`/llms.txt` and `/apps/rankpilot/llms.txt`) formatted specifically for GPTBot, PerplexityBot, and ClaudeBot web crawlers.
  - **Search Engine Instant Ping (IndexNow):** Automatic and manual dispatch to `api.indexnow.org` for real-time indexing on Bing, Yandex, and AI search engines.
  - **Live Search Mockups:** Interactive previews simulating how products will appear inside **Google AI Overviews** and **ChatGPT Search**.
- **Competitor Gap Stealer:**
  Safe URL scraper and Cheerio entity parser extracting competitor keywords, features, and specs from Amazon or DTC competitor URLs, then rewriting merchant product copy to close the semantic gap.
- **1-Click Rollback & Safety Engine:**
  Takes an immutable snapshot of original product title, description, and SEO metafields in SQLite and Shopify Metaobjects (`rankpilot_revisions`) prior to applying AI changes, allowing 1-click restoration at any time.

---

## 📁 Project Structure

```
.
├── app/
│   ├── components/
│   │   ├── OptimizationModal.tsx      # Before vs After diff, spec matrix, FAQs, JSON-LD, & GEO mockups
│   │   ├── CompetitorStealerModal.tsx # URL scraper & semantic gap analysis
│   │   ├── RevisionHistoryModal.tsx   # 1-click rollback snapshots & restore
│   │   └── SettingsModal.tsx          # Gemini & IndexNow API keys configuration
│   ├── routes/
│   │   ├── _index.tsx                 # Root redirect to /app
│   │   ├── app.tsx                    # Shopify embedded layout & App Bridge context
│   │   ├── app._index.tsx             # Flagship dashboard (Metrics, IndexTable, 1-Click actions)
│   │   ├── api.optimize.tsx           # 3-Second Gemini AI optimization endpoint
│   │   ├── api.apply.tsx              # Apply optimization, write GraphQL productSet, ping IndexNow
│   │   ├── api.rollback.tsx           # 1-Click atomic rollback restoration
│   │   ├── api.revisions.tsx          # Revision history loader
│   │   ├── api.competitor.tsx         # Competitor page extraction endpoint
│   │   ├── api.indexnow.tsx           # IndexNow ping dispatcher and log loader
│   │   ├── api.settings.tsx           # App settings loader and updater
│   │   └── llms[.]txt.tsx             # Dynamic /llms.txt feed for AI crawlers
│   ├── services/
│   │   ├── gemini.server.ts           # Google GenAI SDK integration & structured schemas
│   │   ├── shopify.server.ts          # Shopify Admin GraphQL client (productSet, metafields)
│   │   ├── competitor.server.ts       # Cheerio HTML parser & entity keyword extractor
│   │   └── indexnow.server.ts         # IndexNow API ping dispatcher with retry handling
│   ├── db.server.ts                   # Prisma client singleton
│   ├── root.tsx                       # Polaris AppProvider with styles & localization
│   ├── shopify.server.ts              # Shopify App Remix configuration
│   └── vite-env.d.ts                  # Vite & Remix TypeScript declarations
├── prisma/
│   └── schema.prisma                  # SQLite schema (Session, ProductOptimization, RevisionHistory, AppSetting, IndexNowLog)
├── .env.example                       # Environment configuration template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🛠️ Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Sync
```bash
npm run setup
```
This generates the Prisma client and pushes the schema to `dev.db`.

### 3. Build & Run
```bash
# Production build
npm run build

# Start server
npm run start
```
The server starts on `http://localhost:3000`.

### 4. Endpoints & Features
- **Dashboard:** `http://localhost:3000/app`
- **Dynamic AI Feed:** `http://localhost:3000/llms.txt`
- **Settings & API Keys:** Configure via the in-app modal or `.env` (`GEMINI_API_KEY`, `INDEXNOW_KEY`).
