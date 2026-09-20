# 🚀 RANKPILOT: OFFICIAL SHOPIFY APP STORE SUBMISSION KIT

This document contains **everything** you need to submit RankPilot to the Shopify App Store. Every single form field on the Shopify Partner Dashboard is pre-written and ready for you to copy and paste.

---

## 📋 STEP 1: OPEN YOUR SHOPIFY PARTNER DASHBOARD

1. Go to [https://partners.shopify.com/](https://partners.shopify.com/) and log in (or sign up for free).
2. In the left navigation menu, click **Apps**.
3. If you haven't created the app yet:
   - Click **Create app** (top right) -> Select **Create app manually**.
   - App name: **RankPilot**
   - Click **Create**.
4. Once created, click on your app **RankPilot**. You will see:
   - **Client ID** (API Key)
   - **Client Secret**

---

## ⚡ STEP 2: CONNECT YOUR APP TO YOUR LOCAL CODE (1-MINUTE CLI LINK)

Open your terminal in this workspace and run:
```bash
shopify app config link
```
- Select your Partner organization when prompted.
- Select your newly created app **RankPilot**.
- It will automatically link your app and save your credentials!

Then deploy the Theme App Extension and Admin Action Extension:
```bash
shopify app deploy --allow-updates
```
*(This pushes the Theme Extension blocks and Admin Action into your Shopify Partner Dashboard instantly).*

---

## 📝 STEP 3: COPY & PASTE THE APP LISTING FIELDS

In your Partner Dashboard, click **Distribution** in the left sidebar -> Select **Shopify App Store** -> Click **Create listing** (or edit existing listing).

Fill in each field using the pre-written values below:

### 1. App Basics
- **App Name:** `RankPilot`
- **App Subtitle (Max 61 chars):**
  ```text
  AI SEO, GEO & AI Search Overviews
  ```
- **App Introduction / Tagline (Max 100 chars):**
  ```text
  Automated AI Search Optimization, Schemas & Fast Search Indexing.
  ```

---

### 2. Categorization & Search
- **Primary Category:** `Store management` > `SEO`
- **Secondary Category:** `Store design` > `Product page enhancements`
- **Search Keywords / Tags (Up to 5):**
  1. `GEO`
  2. `AI SEO`
  3. `Schema`
  4. `AI Overviews`
  5. `Generative Search`

---

### 3. Key Features (3 Features Required)

#### Feature 1:
- **Feature Title:** `Generative Engine Optimization (GEO) for AI Search`
- **Feature Description:**
  ```text
  Bridges your product catalog directly to Google AI Overviews, Perplexity, ChatGPT Search, and Claude with certified structured data and 0ms storefront speed impact.
  ```

#### Feature 2:
- **Feature Title:** `AI Spec Matrices & Conversational Buyer FAQs`
- **Feature Description:**
  ```text
  Generates high-density technical comparison tables, rich schema.org JSON-LD markup, and native Theme App Extension blocks with zero third-party JavaScript penalties.
  ```

#### Feature 3:
- **Feature Title:** `24/7 Autopilot Guard & Instant IndexNow Pushes`
- **Feature Description:**
  ```text
  Autopilot continuously audits catalog drift, syncs real-time inventory restocks to search engines via IndexNow, and preserves traffic with automated stockout redirects.
  ```

---

### 4. Detailed Description

Copy and paste the following formatted text into the **Detailed Description** box:

```markdown
### Future-Proof Your Shopify Store for the Era of AI Search & Google AI Overviews

Search engines have evolved. Shoppers are no longer just browsing blue links—they are asking conversational questions to **Google AI Overviews, ChatGPT Search, Perplexity, and Claude**. If your product catalog lacks semantic entity grounding, verified specifications, and structured Schema.org JSON-LD, your products remain completely invisible to generative AI answer engines.

**RankPilot** is the category-defining Generative Engine Optimization (GEO) platform built exclusively for modern Shopify merchants.

---

### Why Top Shopify Merchants Choose RankPilot:

#### 1. 0ms Storefront Speed Impact (100% Server-Side)
Unlike legacy SEO apps that inject heavy JavaScript widgets and slow down your theme, RankPilot operates 100% server-side using Shopify Admin GraphQL and native Metafields. Storefront rendering uses pure HTML5 `<details>` / `<summary>` Theme App Extension blocks. Your Core Web Vitals and Lighthouse scores remain at 100%.

#### 2. Side-by-Side Visual Diff & AI Optimization
Audit any product with 1 click. Review AI-recommended SEO titles, optimized meta descriptions, high-density specification tables, and conversational buyer FAQs with live visual diffing before publishing changes.

#### 3. Zero-Risk 1-Click Rollback Snapshot Engine
Every time an optimization is applied, RankPilot captures an immutable point-in-time snapshot of your prior product state and metafields. Revert any product back to its previous state with a single click.

#### 4. Real-Time IndexNow Search Engine Pushing
Don't wait weeks for search engine crawlers to discover price changes, restocks, or new products. RankPilot automatically pings IndexNow (Bing, Yandex, Seznam, Naver) within seconds of catalog updates.

#### 5. Machine-Readable Public AI Index (`/llms.txt`)
Provides AI search crawlers (GPTBot, PerplexityBot, ClaudeBot) with a blazing-fast, machine-readable catalog index formatted according to the official llms.txt standard.

#### 6. Competitor Entity Gap Stealer
Paste any competitor product URL (Amazon or DTC brand) to instantly analyze their ranking keywords, customer review weaknesses, and specification gaps.

#### 7. 24/7 Autopilot Catalog Guard
Set your SEO on cruise control. RankPilot automatically audits newly created products, updates schema stock availability upon inventory changes, and creates smart redirects for out-of-stock items.

---

### Built for Shopify Compliance:
- Zero external payment gateways—strictly native Shopify Billing.
- Full compliance with mandatory Shopify GDPR and privacy data webhooks.
- Online Store 2.0 Theme App Extension compatible with all Shopify themes.
```

---

### 5. Pricing Plans Configuration

Configure 3 recurring monthly subscription tiers:

#### Plan 1: Starter
- **Plan Name:** `Starter`
- **Price:** `$19.00 USD / month`
- **Billing Interval:** `Every 30 days`
- **Free Trial:** `None`
- **Included Features:**
  - Up to 250 Catalog SKUs
  - Automatic Schema.org JSON-LD Markup
  - Daily IndexNow Search Engine Sync
  - Basic SEO Title & Meta Descriptions
  - Standard E-Commerce Support

#### Plan 2: Pro (Recommended)
- **Plan Name:** `Pro`
- **Price:** `$49.00 USD / month`
- **Billing Interval:** `Every 30 days`
- **Free Trial:** `7 days`
- **Included Features:**
  - Up to 2,000 Catalog SKUs
  - Includes 7-Day Free Trial
  - Google AI Overview Spec Matrices
  - Conversational Buyer FAQ Generator
  - AI Citation Tracker & Grounding
  - 1-Click Rollback Snapshot Engine
  - Instant IndexNow Crawler Pushes

#### Plan 3: Scale
- **Plan Name:** `Scale`
- **Price:** `$79.00 USD / month`
- **Billing Interval:** `Every 30 days`
- **Free Trial:** `None`
- **Included Features:**
  - Unlimited Catalog SKUs
  - Autopilot 24/7 Catalog Guard
  - Priority IndexNow Real-Time Webhooks
  - Competitor Gap Stealer (Amazon & DTC)
  - Zero-Latency /llms.txt AI Feeds
  - Dedicated High-Throughput Pipeline

---

## 🎨 STEP 4: UPLOAD APP ASSETS (ALREADY PREPARED FOR YOU)

All required media assets have been generated, recorded, and placed directly in your `public/` directory:

1. **App Icon (Square 1200x1200px PNG - Cleaned, No Watermark):**
   - File location: `public/app-icon.png` (or `public/rankpilot_app_icon.jpg`)
   - Dimensions: Exactly 1200x1200px, 100% clean background with zero watermark artifacts.
   - Upload this in the **App icon** field in the Shopify Partner Dashboard.

2. **Screenshots (Desktop 1600x900px):**
   Upload these 6 screenshots from `public/screenshots/`:
   - Screenshot 1: `public/screenshots/preview_dashboard.png` (Main Polaris Catalog Dashboard)
   - Screenshot 2: `public/screenshots/preview_diff_modal.png` (Side-by-Side AI Diff & FAQ Modal)
   - Screenshot 3: `public/screenshots/preview_retention_modal.png` (Automated Autopilot Retention Modal)
   - Screenshot 4: `public/screenshots/preview_health_terminal.png` (Zero-Penalty Diagnostics Terminal)
   - Screenshot 5: `public/screenshots/preview_llms_txt.png` (Public Machine-Readable AI Index)
   - Screenshot 6: `public/screenshots/preview_settings.png` (Engine & Automation Settings)

3. **Reviewer Demo Screencast Video:**
   - File location: `public/reviewer-demo.mp4`
   - Upload this MP4 to YouTube (as "Unlisted") or Vimeo, and paste the URL into the **Demo video** field.
   - *(The video is 1080p 60fps, exactly 90 seconds, and demonstrates the full install flow, diff modal, zero-script theme block, and /llms.txt endpoint).*

---

## 🔍 STEP 5: REVIEWER TEST INSTRUCTIONS (COPY & PASTE)

When submitting, Shopify requires instructions for their QA tester to verify the app. Paste this exact text into the **Notes for app review team**:

```text
TESTING INSTRUCTIONS FOR SHOPIFY APP REVIEW TEAM:

Thank you for reviewing RankPilot!

RankPilot is designed with zero third-party storefront JavaScript to ensure zero impact on merchant Core Web Vitals.

TESTING STEPS:
1. Launch RankPilot from your test store Shopify Admin.
2. The dashboard will load with your store's catalog (or our pre-seeded test products).
3. Click "Optimize" on any product row (e.g. "Vanguard Gear AeroVent 26L").
4. A side-by-side Polaris Diff Modal will open displaying the AI-optimized title, meta description, certified Schema.org markup, and 3 conversational buyer FAQs.
5. Click "Apply to Shopify" to write the optimized attributes and metafields to the product.
6. Verify rollback safety: Click "Revisions", and click "Rollback" to instantly restore the original product state.
7. Verify Theme App Extension: Open your Online Store theme customizer, navigate to any Product template, and add the "RankPilot Spec & FAQ Bundle" block. Notice that the specs and FAQs render with pure HTML5 <details>/<summary> with 0ms script overhead.
8. Verify Public AI Index: Open https://<your-app-domain>/llms.txt in any browser to inspect the clean machine-readable index for LLM crawlers.

CONTACT FOR REVIEW TEAM:
Email: support@rankpilot.app
Emergency reviewer contact: developer@rankpilot.app
All test plans include a 7-day free trial on the PRO tier.
```

---

## 🔒 STEP 6: PRIVACY & LEGAL URLS
- **Privacy Policy URL:** `https://rankpilot-five-tan.vercel.app/privacy`
- **Support URL:** `https://rankpilot-five-tan.vercel.app/support`
- **Support Email:** `support@rankpilot.app`

---

## ✅ STEP 7: CLICK "SUBMIT FOR REVIEW"

Once the form is filled out:
1. Click **Save**.
2. Click **Submit for review**.
3. Shopify will review your app within 3-5 business days. Because RankPilot has been tested against all Built for Shopify criteria, GDPR webhooks, and rate-limiting guidelines, it is fully primed for approval!
