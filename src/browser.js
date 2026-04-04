// ============================================
// BROWSER MANAGER - Controls the Playwright browser
// ============================================
// Handles launching, navigating, and interacting with a real browser.

import { chromium } from "playwright";

let browser = null;
let context = null;
let page = null;

// Launch the browser (visible so you can watch the agent work)
export async function launchBrowser(headless = false) {
  if (browser) return page;
  browser = await chromium.launch({ headless });
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  page = await context.newPage();
  console.log("🌐 Browser launched.");
  return page;
}

// Navigate to a URL
export async function navigateTo(url) {
  const p = await launchBrowser();
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForTimeout(2000); // let JS render
  console.log(`🌐 Navigated to: ${url}`);
  return p;
}

// Get the current page instance
export function getPage() {
  return page;
}

// Close the browser
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
    console.log("🌐 Browser closed.");
  }
}

// Extract a simplified DOM snapshot for Claude to analyze
// This strips scripts/styles and captures meaningful attributes
export async function extractPageSnapshot() {
  const p = getPage();
  if (!p) throw new Error("Browser not open. Use open_url first.");

  const snapshot = await p.evaluate(() => {
    function getSelector(el) {
      // Try data-testid first (best for Playwright)
      if (el.getAttribute("data-testid")) {
        return `[data-testid="${el.getAttribute("data-testid")}"]`;
      }
      // Try id
      if (el.id) {
        return `#${el.id}`;
      }
      // Try unique aria attributes
      if (el.getAttribute("aria-label")) {
        return `[aria-label="${el.getAttribute("aria-label")}"]`;
      }
      // Try name attribute (for form elements)
      if (el.getAttribute("name")) {
        return `${el.tagName.toLowerCase()}[name="${el.getAttribute("name")}"]`;
      }
      // Try placeholder
      if (el.getAttribute("placeholder")) {
        return `[placeholder="${el.getAttribute("placeholder")}"]`;
      }
      return null;
    }

    function getElementInfo(el) {
      const tag = el.tagName.toLowerCase();
      const info = { tag };

      // Collect meaningful attributes
      const attrs = ["id", "name", "type", "placeholder", "aria-label", "aria-labelledby",
        "data-testid", "data-test", "data-cy", "role", "href", "value", "title", "alt",
        "for", "class", "data-automation-id"];
      for (const attr of attrs) {
        const val = el.getAttribute(attr);
        if (val) info[attr] = val;
      }

      // Text content (trimmed, limited)
      const text = el.textContent?.trim().substring(0, 100);
      if (text && !["script", "style"].includes(tag)) {
        info.text = text;
      }

      // Visibility
      const rect = el.getBoundingClientRect();
      info.visible = rect.width > 0 && rect.height > 0;

      // Best selector we can find
      const selector = getSelector(el);
      if (selector) info.suggestedSelector = selector;

      return info;
    }

    // Target interactive and meaningful elements
    const selectors = [
      "input", "button", "select", "textarea", "a[href]",
      "[role='button']", "[role='link']", "[role='tab']", "[role='checkbox']",
      "[role='radio']", "[role='menuitem']", "[role='textbox']",
      "[data-testid]", "[data-test]", "[data-cy]",
      "label", "h1", "h2", "h3", "nav", "form",
    ];

    const elements = [];
    const seen = new Set();

    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);
        elements.push(getElementInfo(el));
      }
    }

    return {
      url: window.location.href,
      title: document.title,
      elementCount: elements.length,
      elements,
    };
  });

  return snapshot;
}
