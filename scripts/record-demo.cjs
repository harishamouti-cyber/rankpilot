"use strict";
const { chromium } = require("/Users/mac/sub rank pilot/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG_PATH = "/Users/mac/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac";
const OUTPUT_DIR = path.resolve(process.cwd(), "public");
const RECORDINGS_DIR = path.resolve(process.cwd(), "videos_temp");
const PORT = 61242;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordDemo() {
  console.log("================================================================================");
  console.log("  RankPilot Professional App Review Screencast Recording");
  console.log("  (Zero /llms.txt code screen - 100% in-app Polaris UI & GEO Workflows)");
  console.log("================================================================================");

  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Clear previous temp recordings
  const existingFiles = fs.readdirSync(RECORDINGS_DIR);
  for (const file of existingFiles) {
    if (file.endsWith(".webm") || file.endsWith(".mp4")) {
      try {
        fs.unlinkSync(path.join(RECORDINGS_DIR, file));
      } catch (e) {}
    }
  }

  console.log(`[1/6] Launching Chromium from: ${CHROME_PATH}`);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // SCENE 1: App Launch, Quick-Start Setup & AI Visibility Audit
    // -------------------------------------------------------------------------
    console.log("[Scene 1] Navigating to RankPilot inside Shopify Admin...");
    await page.goto(`${BASE_URL}/app?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2500);

    // If welcome modal is open, trigger the automated scan
    const scanBtn = page.locator("button:has-text('Run Automated AI Visibility Scan')").first();
    if (await scanBtn.isVisible()) {
      console.log("[Scene 1] Welcome modal open: Starting 3-second automated AI visibility scan...");
      await sleep(1500);
      await scanBtn.click();
      console.log("[Scene 1] Scanning product catalog across Google AI, Perplexity, and ChatGPT...");
      await sleep(3500);
      console.log("[Scene 1] Audit complete. Exploring dashboard...");
      const exploreBtn = page.locator("button:has-text('Explore Dashboard')").first();
      if (await exploreBtn.isVisible()) {
        await exploreBtn.click();
        await sleep(1500);
      }
    }

    // Wait for any modal backdrop to clear
    await page.waitForSelector(".Polaris-Modal-Dialog__Container", { state: "detached", timeout: 4000 }).catch(() => {});
    await sleep(2000);

    // -------------------------------------------------------------------------
    // SCENE 2: Catalog Dashboard, Setup Cards & Product Filtering
    // -------------------------------------------------------------------------
    console.log("[Scene 2] Demonstrating Quick-Start Setup, Autopilot Status & Catalog...");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(2500);

    // Demonstrate search filtering
    console.log("[Scene 2] Filtering catalog by search query 'backpack'...");
    const searchInput = page.locator("input[placeholder*='Search products']").first();
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.type("backpack", { delay: 100 });
      await sleep(2000);
      await searchInput.fill("");
      await sleep(1500);
    }

    // Switch tabs
    console.log("[Scene 2] Switching tabs: Needs Optimization...");
    const needsOptTab = page.locator("#needs-optimization, button:has-text('Needs Optimization')").first();
    if (await needsOptTab.isVisible()) {
      await needsOptTab.click();
      await sleep(1800);
    }

    console.log("[Scene 2] Switching tabs: AI & Google Ready...");
    const readyTab = page.locator("#ai-ready, button:has-text('AI & Google Ready')").first();
    if (await readyTab.isVisible()) {
      await readyTab.click();
      await sleep(1800);
    }

    console.log("[Scene 2] Switching back to All products...");
    const allTab = page.locator("#all, button:has-text('All')").first();
    if (await allTab.isVisible()) {
      await allTab.click();
      await sleep(1800);
    }

    // -------------------------------------------------------------------------
    // SCENE 3: Deep Dive AI Proof & Diff Modal (Side-by-Side Comparison)
    // -------------------------------------------------------------------------
    console.log("[Scene 3] Opening Side-by-Side AI Diff Modal...");
    const viewDiffBtn = page.locator("button:has-text('View Diff')").first();
    await viewDiffBtn.click();
    await sleep(2500);

    await page.waitForSelector(".Polaris-Modal-Dialog__Container", { state: "visible", timeout: 6000 }).catch(() => {});
    await sleep(2000);

    console.log("[Scene 3] Inspecting Projected GEO Score Lift & Spec Matrix...");
    // Smooth scroll inside modal to show specs and FAQs
    await page.evaluate(() => {
      const modalBody = document.querySelector(".Polaris-Modal__Body");
      if (modalBody) modalBody.scrollBy({ top: 220, behavior: "smooth" });
    });
    await sleep(2500);

    // Switch Simulation Engine tabs
    console.log("[Scene 3] Demonstrating Live AI Engine Simulation (ChatGPT Search)...");
    const chatgptTab = page.locator("button:has-text('ChatGPT Search')").first();
    if (await chatgptTab.isVisible()) {
      await chatgptTab.click();
      await sleep(2000);
    }

    console.log("[Scene 3] Demonstrating Live AI Engine Simulation (Perplexity)...");
    const perplexityTab = page.locator("button:has-text('Perplexity Pro')").first();
    if (await perplexityTab.isVisible()) {
      await perplexityTab.click();
      await sleep(2000);
    }

    // Switch back to side-by-side comparison
    const sideBySideBtn = page.locator("button:has-text('Side-by-Side Comparison')").first();
    if (await sideBySideBtn.isVisible()) {
      await sideBySideBtn.click();
      await sleep(1500);
    }

    // Scroll down to show action buttons
    await page.evaluate(() => {
      const modalBody = document.querySelector(".Polaris-Modal__Body");
      if (modalBody) modalBody.scrollTo({ top: modalBody.scrollHeight, behavior: "smooth" });
    });
    await sleep(2000);

    // Click Apply & Push to Store
    console.log("[Scene 3] Applying optimization and pushing to storefront via GraphQL metafields...");
    const applyBtn = page.locator("button:has-text('Apply & Push to Store')").first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await sleep(3000);
    }

    // -------------------------------------------------------------------------
    // SCENE 4 (REPLACES /llms.txt!): GEO Score Insights & Reverse Citation Tracker
    // -------------------------------------------------------------------------
    console.log("[Scene 4] Navigating to GEO Score Insights & Citation Tracker (/app/citations)...");
    await page.goto(`${BASE_URL}/app/citations?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(3000);

    console.log("[Scene 4] Highlighting circular GEO Score 96 gauge, AI Citation Readiness & SOV chart...");
    await sleep(2500);

    console.log("[Scene 4] Scrolling through live generative search queries & citations breakdown...");
    await page.evaluate(() => window.scrollBy({ top: 380, behavior: "smooth" }));
    await sleep(3000);

    // Trigger Live AI Engine Audit
    const auditBtn = page.locator("button:has-text('Run Live AI Engine Audit')").first();
    if (await auditBtn.isVisible()) {
      console.log("[Scene 4] Triggering Live AI Engine Audit...");
      await auditBtn.click();
      await sleep(3500);
    }

    // -------------------------------------------------------------------------
    // SCENE 5: System Health, Metafields & Webhook Sentinel (/app/health)
    // -------------------------------------------------------------------------
    console.log("[Scene 5] Navigating to System Health & Diagnostics (/app/health)...");
    await page.goto(`${BASE_URL}/app/health?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(3000);

    console.log("[Scene 5] Verifying 4/4 Pinned Metafields & 6/6 Active Webhook Delivery Heartbeats...");
    await page.evaluate(() => window.scrollBy({ top: 250, behavior: "smooth" }));
    await sleep(2500);

    const selfHealBtn = page.locator("button:has-text('Re-sync Metafield Definitions & Self-Heal')").first();
    if (await selfHealBtn.isVisible()) {
      console.log("[Scene 5] Executing self-heal synchronization...");
      await selfHealBtn.click();
      await sleep(3000);
    }

    // -------------------------------------------------------------------------
    // SCENE 6: Autopilot Settings & Instant IndexNow Pushes (/app/settings)
    // -------------------------------------------------------------------------
    console.log("[Scene 6] Navigating to Autopilot & IndexNow Settings (/app/settings)...");
    await page.goto(`${BASE_URL}/app/settings?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2500);

    console.log("[Scene 6] Showing 24/7 Autopilot Catalog Scanner & Drift Sentinel toggles...");
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
    await sleep(2500);

    // Return to main dashboard for clean finish
    console.log("[Scene 6] Returning to main catalog dashboard for clean finale...");
    await page.goto(`${BASE_URL}/app?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2500);

    console.log("================================================================================");
    console.log("  Screencast recording completed successfully!");
    console.log("================================================================================");
  } catch (err) {
    console.error("Error during screencast recording:", err);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  // Find generated video
  const videoFiles = fs.readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith(".webm") || f.endsWith(".mp4"));
  if (videoFiles.length === 0) {
    throw new Error("No video file was produced by Playwright.");
  }

  videoFiles.sort((a, b) => {
    return (
      fs.statSync(path.join(RECORDINGS_DIR, b)).mtime.getTime() -
      fs.statSync(path.join(RECORDINGS_DIR, a)).mtime.getTime()
    );
  });

  const latestVideo = videoFiles[0];
  const sourceVideoPath = path.join(RECORDINGS_DIR, latestVideo);
  const targetMp4Path = path.join(OUTPUT_DIR, "reviewer-demo.mp4");
  const targetWebmPath = path.join(OUTPUT_DIR, "reviewer-demo.webm");

  fs.copyFileSync(sourceVideoPath, targetWebmPath);
  console.log(`[Video Output] Saved raw WebM video to: ${targetWebmPath}`);

  if (fs.existsSync(FFMPEG_PATH)) {
    console.log(`[FFmpeg] Converting ${sourceVideoPath} to 1080p MP4: ${targetMp4Path}...`);
    try {
      execSync(
        `"${FFMPEG_PATH}" -y -i "${sourceVideoPath}" -c:v libx264 -pix_fmt yuv420p -r 30 "${targetMp4Path}"`,
        { stdio: "inherit" }
      );
      console.log(`[Video Output] Successfully generated 1080p MP4: ${targetMp4Path}`);
    } catch (ffmpegErr) {
      console.warn("[FFmpeg] Conversion failed, copying source as MP4 container:", ffmpegErr);
      fs.copyFileSync(sourceVideoPath, targetMp4Path);
    }
  } else {
    fs.copyFileSync(sourceVideoPath, targetMp4Path);
  }

  const stats = fs.statSync(targetMp4Path);
  console.log(`================================================================================`);
  console.log(`  Demo screencast ready: ${targetMp4Path} (${Math.round(stats.size / 1024)} KB)`);
  console.log(`================================================================================`);
}

recordDemo().catch((e) => {
  console.error("Fatal recording error:", e);
  process.exit(1);
});
