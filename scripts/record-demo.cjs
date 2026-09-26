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

async function smoothMoveTo(page, x, y, steps = 18) {
  try {
    await page.mouse.move(x, y, { steps });
  } catch (e) {}
  await sleep(80);
}

async function safeScrollBy(page, top) {
  try {
    await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), top);
  } catch (e) {}
}

async function safeScrollModal(page, top) {
  try {
    await page.evaluate((y) => {
      const modalBody = document.querySelector(".Polaris-Modal__Body");
      if (modalBody) modalBody.scrollBy({ top: y, behavior: "smooth" });
    }, top);
  } catch (e) {}
}

async function safeScrollModalTo(page, top) {
  try {
    await page.evaluate((y) => {
      const modalBody = document.querySelector(".Polaris-Modal__Body");
      if (modalBody) modalBody.scrollTo({ top: y, behavior: "smooth" });
    }, top);
  } catch (e) {}
}

async function safeClick(locator) {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 });
    await locator.hover({ timeout: 3000 });
    await sleep(200);
    await locator.click({ timeout: 3000 });
    await sleep(300);
  } catch (e) {
    try {
      await locator.click({ force: true, timeout: 2000 });
    } catch (err) {}
  }
}

async function recordDemo() {
  console.log("================================================================================");
  console.log("  RankPilot Professional App Review Screencast Recording");
  console.log("  (Fluid pacing, visible cursor, zero looping, 100% Polaris UI)");
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

  console.log(`[1/5] Launching Chromium from: ${CHROME_PATH}`);
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

  // Inject pre-seeded onboarding state and smooth cursor tracker
  await page.addInitScript(() => {
    localStorage.setItem("rankpilot_onboarded", "true");
    localStorage.setItem("rankpilot_onboarded_demo.myshopify.com", "true");
    localStorage.setItem("rankpilot_setup_dismissed", "false");
    localStorage.setItem("rankpilot_setup_dismissed_demo.myshopify.com", "false");

    window.addEventListener("DOMContentLoaded", () => {
      const cursor = document.createElement("div");
      cursor.id = "playwright-cursor";
      cursor.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(0, 128, 96, 0.75);
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-50%, -50%);
        transition: width 0.12s ease, height 0.12s ease, background-color 0.12s ease;
      `;
      document.body.appendChild(cursor);

      window.addEventListener("mousemove", (e) => {
        cursor.style.left = e.clientX + "px";
        cursor.style.top = e.clientY + "px";
      });

      window.addEventListener("mousedown", () => {
        cursor.style.width = "12px";
        cursor.style.height = "12px";
        cursor.style.backgroundColor = "rgba(0, 90, 65, 0.95)";
      });

      window.addEventListener("mouseup", () => {
        cursor.style.width = "18px";
        cursor.style.height = "18px";
        cursor.style.backgroundColor = "rgba(0, 128, 96, 0.75)";
      });
    });
  });

  try {
    // -------------------------------------------------------------------------
    // SCENE 1: App Launch & Main Catalog Dashboard (0:00 - 0:14)
    // -------------------------------------------------------------------------
    console.log("[Scene 1] Navigating to RankPilot inside Shopify Admin...");
    await page.goto(`${BASE_URL}/app?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2000);

    // Initial smooth cursor movement over top bar
    console.log("[Scene 1] Demonstrating header status & 0ms storefront speed badge...");
    await smoothMoveTo(page, 320, 36, 15);
    await sleep(600);
    await smoothMoveTo(page, 410, 36, 12);
    await sleep(800);

    // Hover over Quick-Start Setup cards
    console.log("[Scene 1] Highlighting 3 Quick-Start Setup cards...");
    await smoothMoveTo(page, 350, 230, 18);
    await sleep(900);
    await smoothMoveTo(page, 620, 230, 15);
    await sleep(900);
    await smoothMoveTo(page, 900, 230, 15);
    await sleep(900);

    // Hover over KPI metrics
    console.log("[Scene 1] Highlighting AI Catalog Readiness (100%) and IndexNow Pings...");
    await smoothMoveTo(page, 430, 460, 15);
    await sleep(700);
    await smoothMoveTo(page, 560, 460, 12);
    await sleep(700);

    // Smoothly scroll down so the product catalog table is centered
    console.log("[Scene 1] Scrolling down to product catalog table...");
    await safeScrollBy(page, 320);
    await sleep(1500);

    // -------------------------------------------------------------------------
    // SCENE 2: Core Feature — 1-Click AI Proof & Diff Modal (0:14 - 0:42)
    // -------------------------------------------------------------------------
    console.log("[Scene 2] Opening Side-by-Side AI Diff Modal for first product...");
    const viewDiffBtn = page.locator("button:has-text('View Diff')").first();
    await safeClick(viewDiffBtn);
    await sleep(1000);

    // Wait for the modal dialog to be visible
    await page.waitForSelector("[role='dialog']", { state: "visible", timeout: 8000 });
    console.log("[Scene 2] Modal opened successfully!");
    await sleep(1500);

    // Hover over Projected GEO Score Lift badge
    await smoothMoveTo(page, 440, 115, 15);
    await sleep(1200);

    // Smoothly inspect Side-by-Side comparison cards
    console.log("[Scene 2] Inspecting Current Storefront Gaps vs RankPilot AI Supercharged...");
    await smoothMoveTo(page, 370, 360, 15);
    await sleep(1000);
    await smoothMoveTo(page, 620, 360, 15);
    await sleep(1000);

    // Smooth scroll inside modal to reveal Spec Matrix and Buyer FAQs
    console.log("[Scene 2] Scrolling inside modal: Showing Formatted Spec Matrix & Buyer FAQs...");
    await safeScrollModal(page, 320);
    await sleep(1800);

    // Move cursor over Spec Matrix table
    await smoothMoveTo(page, 620, 420, 14);
    await sleep(1200);

    // Demonstrate Live AI Engine Simulation tab
    console.log("[Scene 2] Switching to Live AI Engine Simulation tab...");
    const liveSimTab = page.locator("button:has-text('Live AI Engine Simulation')").first();
    if (await liveSimTab.isVisible()) {
      await safeClick(liveSimTab);
      await sleep(1800);

      // Hover over Perplexity & ChatGPT simulation cards
      await smoothMoveTo(page, 500, 350, 14);
      await sleep(1200);

      // Switch back to Side-by-Side Comparison
      const sideBySideTab = page.locator("button:has-text('Side-by-Side Comparison')").first();
      await safeClick(sideBySideTab);
      await sleep(1200);
    }

    // Scroll to the bottom of the modal to show action buttons
    console.log("[Scene 2] Scrolling to Apply action...");
    await safeScrollModalTo(page, 9999);
    await sleep(1200);

    // Click Apply & Push to Store
    console.log("[Scene 2] Applying optimization and pushing to storefront via GraphQL metafields...");
    const applyBtn = page.locator("button:has-text('Apply & Push to Store')").first();
    if (await applyBtn.isVisible()) {
      await safeClick(applyBtn);
      await sleep(2200);
    } else {
      // Close modal cleanly if already applied
      const closeBtn = page.locator("button[aria-label='Close']").first();
      if (await closeBtn.isVisible()) {
        await safeClick(closeBtn);
        await sleep(1200);
      }
    }

    await page.waitForSelector("[role='dialog']", { state: "detached", timeout: 5000 }).catch(() => {});
    await sleep(1000);

    // -------------------------------------------------------------------------
    // SCENE 3: GEO Score Insights & Reverse Citation Tracker (0:42 - 0:58)
    // -------------------------------------------------------------------------
    console.log("[Scene 3] Navigating to GEO Score Insights & Citation Tracker (/app/citations)...");
    await page.goto(`${BASE_URL}/app/citations?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2000);

    // Hover over circular GEO Score 96 gauge & AI Citation Readiness
    console.log("[Scene 3] Highlighting circular GEO Score 96 gauge & AI Citation Readiness...");
    await smoothMoveTo(page, 335, 240, 16);
    await sleep(1200);
    await smoothMoveTo(page, 510, 240, 14);
    await sleep(1200);

    // Click Run Live AI Engine Audit button
    const auditBtn = page.locator("button:has-text('Run Live AI Engine Audit')").first();
    if (await auditBtn.isVisible()) {
      console.log("[Scene 3] Running Live AI Engine Audit...");
      await safeClick(auditBtn);
      await sleep(2200);
    }

    // Scroll down to Citations Breakdown table
    console.log("[Scene 3] Scrolling through live generative search queries & citations breakdown...");
    await safeScrollBy(page, 380);
    await sleep(1500);

    // Hover over citation rows (ChatGPT Search & Perplexity)
    await smoothMoveTo(page, 450, 480, 15);
    await sleep(1000);
    await smoothMoveTo(page, 450, 560, 12);
    await sleep(1200);

    // -------------------------------------------------------------------------
    // SCENE 4: System Health, Metafields & Webhooks (/app/health) (0:58 - 1:12)
    // -------------------------------------------------------------------------
    console.log("[Scene 4] Navigating to System Health & Diagnostics (/app/health)...");
    await page.goto(`${BASE_URL}/app/health?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2000);

    // Verify 4/4 Pinned Metafields & 6/6 Active Webhooks
    console.log("[Scene 4] Inspecting 4/4 Pinned Metafields & Webhook Deliveries...");
    await smoothMoveTo(page, 420, 260, 15);
    await sleep(1000);

    // Smooth scroll down to self-heal button
    await safeScrollBy(page, 260);
    await sleep(1200);

    const selfHealBtn = page.locator("button:has-text('Re-sync Metafield Definitions & Self-Heal')").first();
    if (await selfHealBtn.isVisible()) {
      console.log("[Scene 4] Triggering self-heal sync...");
      await safeClick(selfHealBtn);
      await sleep(2500);
    }

    // -------------------------------------------------------------------------
    // SCENE 5: Settings & 24/7 Autopilot Guard (/app/settings) (1:12 - 1:24)
    // -------------------------------------------------------------------------
    console.log("[Scene 5] Navigating to Autopilot Settings (/app/settings)...");
    await page.goto(`${BASE_URL}/app/settings?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2000);

    // Show Autopilot Scanner & IndexNow options
    console.log("[Scene 5] Demonstrating Autopilot Scanner & IndexNow Discovery...");
    await smoothMoveTo(page, 450, 300, 15);
    await sleep(1000);
    await safeScrollBy(page, 280);
    await sleep(1500);

    // Return to main dashboard for a clean finale
    console.log("[Scene 5] Returning to Main Dashboard for clean finale...");
    await page.goto(`${BASE_URL}/app?shop=demo.myshopify.com`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(3000);

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
    console.log(`[FFmpeg] Converting ${sourceVideoPath} to 1080p MP4 with faststart: ${targetMp4Path}...`);
    try {
      execSync(
        `"${FFMPEG_PATH}" -y -ss 00:00:01.0 -i "${sourceVideoPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -movflags +faststart "${targetMp4Path}"`,
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
