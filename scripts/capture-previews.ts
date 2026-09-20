import { chromium } from "playwright-core";
import * as path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/mac/.gemini/antigravity/brain/d38cadbb-54c6-4cca-ba04-6063f4e8bd68";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log("Launching Chromium for live preview snapshots...");
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1600,1000"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Dashboard Preview
  console.log("1. Capturing Dashboard...");
  await page.goto("http://localhost:3000/app?shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);

  // If WelcomeModal is open, close it to view the dashboard
  const cancelBtn = await page.$("button:has-text('Explore Dashboard')");
  if (cancelBtn) {
    await cancelBtn.click();
    await sleep(1000);
  }
  const modalCancel = await page.$("button:has-text('Cancel')");
  if (modalCancel) {
    await modalCancel.click();
    await sleep(1000);
  }

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_dashboard.png"),
    fullPage: false,
  });

  // 2. Diff Modal Preview
  console.log("2. Capturing Diff Modal...");
  const viewDiffBtn = page.locator("button:has-text('View Diff')").first();
  if (await viewDiffBtn.isVisible()) {
    await viewDiffBtn.click();
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "preview_diff_modal.png"),
      fullPage: false,
    });
    // Close modal
    const closeBtn = page.locator("button:has-text('Cancel')").first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await sleep(800);
  }

  // 3. System Health & Diagnostics Terminal Preview
  console.log("3. Capturing Health Terminal...");
  await page.goto("http://localhost:3000/app/health?shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_health_terminal.png"),
    fullPage: false,
  });

  // 4. Settings & Anti-Churn Preview
  console.log("4. Capturing Settings & Retention...");
  await page.goto("http://localhost:3000/app/settings?shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_settings.png"),
    fullPage: false,
  });

  // Open retention modal
  const cancelPlanBtn = page.locator("button:has-text('Deactivate or Cancel Plan')").first();
  if (await cancelPlanBtn.isVisible()) {
    await cancelPlanBtn.click();
    await sleep(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "preview_retention_modal.png"),
      fullPage: false,
    });
  }

  // 5. llms.txt Preview
  console.log("5. Capturing /llms.txt Crawler Manifest...");
  await page.goto("http://localhost:3000/llms.txt", { waitUntil: "networkidle" });
  await sleep(1000);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_llms_txt.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("All live previews captured successfully!");
}

capture().catch((e) => {
  console.error("Capture failed:", e);
  process.exit(1);
});
