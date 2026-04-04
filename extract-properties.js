// Targeted extraction for Properties page with Market Filters
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const URL = "https://stage.crexagent.com/login";
const EMAIL = "zaid.m@simformsolutions.com";
const PASSWORD = "Test@123";

async function run() {
  console.log("🚀 Launching browser...");
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    // Login
    console.log("📍 Step 1: Login...");
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Extract login page elements
    const loginElements = await extractAll(page);
    console.log(`   Login page: ${loginElements.length} elements`);

    await page.locator('input[placeholder*="john.doe" i]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState("domcontentloaded");
    console.log(`   Logged in. Now at: ${page.url()}`);

    // Navigate to Properties
    console.log("📍 Step 2: Navigate to Properties...");
    await page.getByText('Properties', { exact: true }).first().click();
    await page.waitForTimeout(5000);
    console.log(`   Now at: ${page.url()}`);

    // Extract Properties page (may have Market Filters modal)
    const propertiesElements = await extractAll(page);
    console.log(`   Properties page: ${propertiesElements.length} elements`);
    await saveScreenshot(page, "properties-with-filter");

    // Also try to capture the filter dialog specifically
    const filterDialog = await page.evaluate(() => {
      // Look for dialog/overlay/modal content
      const dialogs = document.querySelectorAll('.v-overlay--active, .v-dialog, [role="dialog"], .v-card');
      const results = [];
      for (const dialog of dialogs) {
        const els = dialog.querySelectorAll('input, button, select, textarea, label, [role="tab"], [role="combobox"], .v-select, .v-autocomplete, .v-text-field');
        for (const el of els) {
          const tag = el.tagName.toLowerCase();
          const info = { tag, visible: el.offsetWidth > 0 && el.offsetHeight > 0 };
          const attrs = ["id", "name", "type", "placeholder", "aria-label", "aria-labelledby",
            "data-testid", "data-test", "role", "class", "for", "value", "title",
            "aria-expanded", "aria-selected", "tabindex", "href"];
          for (const attr of attrs) {
            const val = el.getAttribute(attr);
            if (val != null && val !== "") info[attr] = val;
          }
          const text = el.textContent?.trim().substring(0, 120);
          if (text) info.text = text;
          const parent = el.parentElement;
          if (parent) {
            info.parentTag = parent.tagName.toLowerCase();
            if (parent.id) info.parentId = parent.id;
            info.parentClass = parent.getAttribute("class")?.substring(0, 80) || "";
          }
          // Label for inputs
          if (el.id) {
            const lbl = document.querySelector(`label[for="${el.id}"]`);
            if (lbl) info.associatedLabel = lbl.textContent?.trim().substring(0, 80);
          }
          results.push(info);
        }
      }
      return results;
    });
    console.log(`   Filter dialog: ${filterDialog.length} elements`);

    // Also extract sidebar nav
    const sidebarNav = await page.evaluate(() => {
      const nav = document.querySelector('nav, .v-navigation-drawer');
      if (!nav) return [];
      const items = nav.querySelectorAll('a, [role="listitem"], .v-list-item');
      return Array.from(items).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 60),
        href: el.getAttribute("href"),
        class: el.getAttribute("class")?.substring(0, 80),
        id: el.id || null,
        ariaLabel: el.getAttribute("aria-label"),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      }));
    });
    console.log(`   Sidebar nav: ${sidebarNav.length} items`);

    // Check if there are tabs in the filter
    const filterTabs = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"], .v-tab');
      return Array.from(tabs).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        class: el.getAttribute("class")?.substring(0, 80),
        ariaSelected: el.getAttribute("aria-selected"),
        id: el.id || null,
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      }));
    });
    console.log(`   Filter tabs: ${filterTabs.length}`);

    // Save results
    if (!existsSync("output")) mkdirSync("output", { recursive: true });
    writeFileSync("output/properties-data.json", JSON.stringify({
      loginElements,
      propertiesElements,
      filterDialog,
      sidebarNav,
      filterTabs,
    }, null, 2));
    console.log("\n💾 Saved to output/properties-data.json");

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    await saveScreenshot(page, "error");
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
    console.log("🌐 Done.");
  }
}

async function extractAll(page) {
  return await page.evaluate(() => {
    const selectors = [
      "input", "button", "select", "textarea", "a[href]",
      "[role='button']", "[role='link']", "[role='tab']", "[role='checkbox']",
      "[role='radio']", "[role='menuitem']", "[role='textbox']", "[role='combobox']",
      "[data-testid]", "[data-test]", "[data-cy]",
      "label", "h1", "h2", "h3", "h4", "nav", "form", "table",
    ];
    const elements = [];
    const seen = new Set();
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const tag = el.tagName.toLowerCase();
        const rect = el.getBoundingClientRect();
        const info = { tag, visible: rect.width > 0 && rect.height > 0 };
        const attrs = ["id", "name", "type", "placeholder", "aria-label",
          "data-testid", "data-test", "role", "href", "class", "for", "value",
          "autocomplete", "title", "alt", "aria-expanded", "aria-selected"];
        for (const attr of attrs) {
          const val = el.getAttribute(attr);
          if (val != null && val !== "") info[attr] = val;
        }
        const text = el.textContent?.trim().substring(0, 100);
        if (text && !["script","style"].includes(tag)) info.text = text;
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) info.associatedLabel = lbl.textContent?.trim();
        }
        const parent = el.parentElement;
        if (parent) { info.parentTag = parent.tagName.toLowerCase(); if (parent.id) info.parentId = parent.id; }
        elements.push(info);
      }
    }
    return elements;
  });
}

async function saveScreenshot(page, name) {
  if (!existsSync("screenshots")) mkdirSync("screenshots", { recursive: true });
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  console.log(`   📸 ${name}.png`);
}

run().catch(console.error);
