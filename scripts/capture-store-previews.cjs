const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/mac/.gemini/antigravity/brain/d38cadbb-54c6-4cca-ba04-6063f4e8bd68";
const PUBLIC_DIR = path.join(__dirname, "../public/screenshots");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  console.log("Launching Chromium for high-res Shopify App Store screenshots...");
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1600,900"],
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1, // Exact 1600px by 900px output for Shopify App Store
  });
  const page = await context.newPage();

  // Suppress first-time onboarding modal and toast popups automatically
  await page.addInitScript(() => {
    try {
      localStorage.setItem("rankpilot_onboarded", "true");
      localStorage.setItem("rankpilot_onboarded_demo.myshopify.com", "true");
      localStorage.setItem("rankpilot_setup_dismissed", "true");
      localStorage.setItem("rankpilot_setup_dismissed_demo.myshopify.com", "true");
      window.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = ".Polaris-Frame-ToastManager, [data-polaris-toast], .Polaris-Frame-Toast, #rankpilot-toast, .rankpilot-custom-toast { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }";
        document.head.appendChild(style);
      });
    } catch (e) {}
  });

  // Helper to save to both artifact directory and public directory
  async function saveScreenshot(filename) {
    try {
      await page.addStyleTag({
        content: `
          #rankpilot-toast, .rankpilot-custom-toast, [data-polaris-toast], .Polaris-Frame-Toast, .Polaris-Frame-ToastManager {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
        `,
      });
      await sleep(200);
    } catch (e) {}

    const artifactPath = path.join(ARTIFACT_DIR, filename);
    const publicPath = path.join(PUBLIC_DIR, filename);
    await page.screenshot({ path: artifactPath, fullPage: false });
    fs.copyFileSync(artifactPath, publicPath);
    const stats = fs.statSync(artifactPath);
    console.log(`Saved: ${filename} (${stats.size} bytes)`);
  }

  // =========================================================================
  // 1. MAIN HERO SCREENSHOT (Replaces App Store Video / Hero Banner)
  // =========================================================================
  console.log("Capturing 1: Main Dashboard Hero...");
  await page.goto("http://localhost:3000/app?preview=true&shop=demo.myshopify.com&tab=all", { waitUntil: "networkidle" });
  await sleep(1500);

  // Close any stray modal if present
  const cancelBtn = await page.$("button:has-text('Explore Dashboard')");
  if (cancelBtn) {
    await cancelBtn.click();
    await sleep(800);
  }

  await saveScreenshot("main_hero_listing_preview.png");
  await saveScreenshot("feature_image_1600x900.png");

  // =========================================================================
  // 2. SCREENSHOT 1: GEO CITATIONS TRACKER (/app/citations)
  // =========================================================================
  console.log("Capturing 2: GEO Citations Tracker...");
  await page.goto("http://localhost:3000/app/citations?preview=true&shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);

  await saveScreenshot("screenshot_1_geo_citations.png");

  // =========================================================================
  // 3. SCREENSHOT 2: SIDE-BY-SIDE DIFF & AI PROOF MODAL
  // =========================================================================
  console.log("Capturing 3: Side-by-Side Diff & Schema Modal...");
  await page.goto("http://localhost:3000/app?preview=true&shop=demo.myshopify.com&demoDiff=1", { waitUntil: "networkidle" });
  await sleep(1500);

  await saveScreenshot("screenshot_2_side_by_side_diff.png");

  // Also switch to JSON-LD & Structured Schema segment tab
  const schemaTabBtn = page.locator("button:has-text('JSON-LD & Structured Schema')").first();
  if (await schemaTabBtn.isVisible()) {
    await schemaTabBtn.click();
    await sleep(1000);
    await saveScreenshot("screenshot_2_schema_jsonld_preview.png");
  }

  // =========================================================================
  // 4. SCREENSHOT 3: SYSTEM HEALTH & METAFIELD DIAGNOSTICS (/app/health)
  // =========================================================================
  console.log("Capturing 4: System Health & Metafield Diagnostics...");
  await page.goto("http://localhost:3000/app/health?preview=true&shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);

  await saveScreenshot("screenshot_3_health_diagnostics.png");

  await browser.close();
  console.log("All 4 high-resolution screenshots generated successfully!");
}

capture().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
