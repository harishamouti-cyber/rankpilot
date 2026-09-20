import { chromium } from "playwright-core";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG_PATH = "/Users/mac/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac";
const OUTPUT_DIR = path.resolve(process.cwd(), "public");
const RECORDINGS_DIR = path.resolve(process.cwd(), "videos_temp");

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordDemo() {
  console.log("================================================================================");
  console.log("  RankPilot Automated Reviewer Demo Screencast Recording");
  console.log("================================================================================");

  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
    // SCENE 1: Install & Onboarding AI Visibility Audit
    // -------------------------------------------------------------------------
    console.log("[Scene 1] Navigating to RankPilot App & Initiating Onboarding Scan...");
    await page.goto("http://localhost:3000/app?shop=demo.myshopify.com", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2500);

    // Open Welcome Onboarding modal via More Actions if not already visible
    const isScanVisible = await page.isVisible("text=Run Automated AI Visibility Scan");
    if (!isScanVisible) {
      console.log("[Scene 1] Triggering Replay AI Onboarding Scan from More actions...");
      await page.locator("button:has-text('More actions')").first().click();
      await sleep(800);
      await page.locator("text=Replay AI Onboarding Scan").first().click();
      await sleep(1500);
    }

    // Step 1 Welcome Modal
    console.log("[Scene 1] Welcome modal displayed. Starting 3-second automated audit...");
    await sleep(2000);
    await page.locator("button:has-text('Run Automated AI Visibility Scan')").first().click();

    // Step 2 Live audit animation
    console.log("[Scene 1] Simulating AI crawl agents across Google AI, Perplexity, and ChatGPT...");
    await sleep(4000);

    // Step 3 Audit Complete - Close Welcome Modal cleanly
    console.log("[Scene 1] Audit complete. Showing audit results and transitioning to dashboard...");
    await sleep(2000);
    await page.locator("button:has-text('Explore Dashboard')").first().click();

    // Wait for modal backdrop to completely exit DOM
    await page.waitForSelector(".Polaris-Modal-Dialog__Container", { state: "detached", timeout: 5000 }).catch(() => {});
    await sleep(1500);

    // -------------------------------------------------------------------------
    // SCENE 2: Catalog Dashboard & GEO Scoring Overview
    // -------------------------------------------------------------------------
    console.log("[Scene 2] Demonstrating Catalog Dashboard, Metric Cards & IndexFilters...");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(2500);

    // Filter by typing into search
    console.log("[Scene 2] Filtering products by search keyword 'backpack'...");
    const searchInput = page.locator("input[placeholder*='Search products']").first();
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.type("backpack", { delay: 100 });
      await sleep(2000);
      await searchInput.fill("");
      await sleep(1500);
    }

    // Click Needs Optimization tab
    console.log("[Scene 2] Switching tabs: Needs Optimization...");
    const needsOptTab = page.locator("#needs-optimization, button:has-text('Needs Optimization')").first();
    if (await needsOptTab.isVisible()) {
      await needsOptTab.click();
      await sleep(2000);
    }

    // Click AI Ready tab
    console.log("[Scene 2] Switching tabs: AI & Google Ready...");
    const readyTab = page.locator("#ai-ready, button:has-text('AI & Google Ready')").first();
    if (await readyTab.isVisible()) {
      await readyTab.click();
      await sleep(2000);
    }

    // Click back to All
    console.log("[Scene 2] Switching back to All products...");
    const allTab = page.locator("#all, button:has-text('All')").first();
    if (await allTab.isVisible()) {
      await allTab.click();
      await sleep(2000);
    }

    // -------------------------------------------------------------------------
    // SCENE 3: Side-by-Side Diff Modal & 1-Click Sync
    // -------------------------------------------------------------------------
    console.log("[Scene 3] Opening Side-by-Side Diff Modal for unoptimized product...");
    const viewDiffBtn = page.locator("button:has-text('View Diff')").first();
    await viewDiffBtn.click();
    await sleep(2500);

    console.log("[Scene 3] Inspecting side-by-side comparison, spec matrix, and JSON-LD schema...");
    // Wait for Diff modal to appear
    await page.waitForSelector(".Polaris-Modal-Dialog__Container", { state: "visible", timeout: 6000 }).catch(() => {});
    await sleep(1500);

    // Smooth scroll inside modal
    await page.evaluate(() => {
      const modalBody = document.querySelector(".Polaris-Modal__Body");
      if (modalBody) modalBody.scrollBy({ top: 220, behavior: "smooth" });
    });
    await sleep(2000);

    // Switch Simulation Engine tabs
    const chatgptTab = page.locator("button:has-text('ChatGPT Search')").first();
    if (await chatgptTab.isVisible()) {
      await chatgptTab.click();
      await sleep(1500);
    }
    const perplexityTab = page.locator("button:has-text('Perplexity Pro')").first();
    if (await perplexityTab.isVisible()) {
      await perplexityTab.click();
      await sleep(1500);
    }

    // Click Apply & Push to Store
    console.log("[Scene 3] Applying optimization and pushing to storefront via GraphQL metafields...");
    const applyBtn = page.locator("button:has-text('Apply & Push to Store')").first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await sleep(3500);
    }

    // -------------------------------------------------------------------------
    // SCENE 4: Direct /llms.txt Endpoint Presentation
    // -------------------------------------------------------------------------
    console.log("[Scene 4] Navigating to /llms.txt crawler endpoint...");
    await page.goto("http://localhost:3000/llms.txt", { waitUntil: "networkidle" });
    await sleep(2500);

    console.log("[Scene 4] Smooth scrolling through /llms.txt structured product manifest...");
    await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
    await sleep(1800);
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
    await sleep(1800);
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
    await sleep(2500);

    // -------------------------------------------------------------------------
    // SCENE 5: System Health, Metafields & Zero Storefront Footprint
    // -------------------------------------------------------------------------
    console.log("[Scene 5] Navigating to System Health & Diagnostics Terminal...");
    await page.goto("http://localhost:3000/app/health?shop=demo.myshopify.com", {
      waitUntil: "networkidle",
    });
    await sleep(2500);

    console.log("[Scene 5] Demonstrating self-healing terminal & webhook heartbeats...");
    const selfHealBtn = page.locator("button:has-text('Re-sync Metafield Definitions & Self-Heal')").first();
    if (await selfHealBtn.isVisible()) {
      await selfHealBtn.click();
      await sleep(3000);
    }

    await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
    await sleep(2500);

    console.log("[Scene 5] Screencast recording completed successfully!");
  } catch (err) {
    console.error("Error during screencast recording:", err);
  } finally {
    // Close context to finalize video writing
    await page.close();
    await context.close();
    await browser.close();
  }

  // Identify generated video file
  const videoFiles = fs.readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith(".webm") || f.endsWith(".mp4"));
  if (videoFiles.length === 0) {
    throw new Error("No video file was produced by Playwright.");
  }

  // Sort by modification time to get latest
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

  // Copy webm
  fs.copyFileSync(sourceVideoPath, targetWebmPath);
  console.log(`[Video Output] Saved WebM video to: ${targetWebmPath}`);

  // Convert to 1080p MP4 using Darwin ARM64 ffmpeg
  if (fs.existsSync(FFMPEG_PATH)) {
    console.log(`[FFmpeg] Converting ${sourceVideoPath} to ${targetMp4Path}...`);
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
