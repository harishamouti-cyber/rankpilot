"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/capture-previews.ts
var import_playwright_core = require("playwright-core");
var path = __toESM(require("path"), 1);
var CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
var ARTIFACT_DIR = "/Users/mac/.gemini/antigravity/brain/d38cadbb-54c6-4cca-ba04-6063f4e8bd68";
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function capture() {
  console.log("Launching Chromium for live preview snapshots...");
  const browser = await import_playwright_core.chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1600,1000"]
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log("1. Capturing Dashboard...");
  await page.goto("http://localhost:3000/app?shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);
  const cancelBtn = await page.$("button:has-text('Explore Dashboard')");
  if (cancelBtn) {
    await cancelBtn.click();
    await sleep(1e3);
  }
  const modalCancel = await page.$("button:has-text('Cancel')");
  if (modalCancel) {
    await modalCancel.click();
    await sleep(1e3);
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_dashboard.png"),
    fullPage: false
  });
  console.log("2. Capturing Diff Modal...");
  const viewDiffBtn = page.locator("button:has-text('View Diff')").first();
  if (await viewDiffBtn.isVisible()) {
    await viewDiffBtn.click();
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "preview_diff_modal.png"),
      fullPage: false
    });
    const closeBtn = page.locator("button:has-text('Cancel')").first();
    if (await closeBtn.isVisible())
      await closeBtn.click();
    await sleep(800);
  }
  console.log("3. Capturing Health Terminal...");
  await page.goto("http://localhost:3000/app/health?shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_health_terminal.png"),
    fullPage: false
  });
  console.log("4. Capturing Settings & Retention...");
  await page.goto("http://localhost:3000/app/settings?shop=demo.myshopify.com", { waitUntil: "networkidle" });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_settings.png"),
    fullPage: false
  });
  const cancelPlanBtn = page.locator("button:has-text('Deactivate or Cancel Plan')").first();
  if (await cancelPlanBtn.isVisible()) {
    await cancelPlanBtn.click();
    await sleep(1e3);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "preview_retention_modal.png"),
      fullPage: false
    });
  }
  console.log("5. Capturing /llms.txt Crawler Manifest...");
  await page.goto("http://localhost:3000/llms.txt", { waitUntil: "networkidle" });
  await sleep(1e3);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview_llms_txt.png"),
    fullPage: false
  });
  await browser.close();
  console.log("All live previews captured successfully!");
}
capture().catch((e) => {
  console.error("Capture failed:", e);
  process.exit(1);
});
