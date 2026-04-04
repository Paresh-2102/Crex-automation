// Extraction script - browse site, login, navigate, extract all locators
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const URL = "https://stage.crexagent.com/login";
const EMAIL = "zaid.m@simformsolutions.com";
const PASSWORD = "Test@123";

async function run() {
  console.log("🚀 Launching browser...");
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const allResults = {};

  try {
    // ===== STEP 1: Open Login Page =====
    console.log("\n📍 Step 1: Opening login page...");
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log(`   Page title: ${await page.title()}`);

    // Extract login page elements
    allResults.loginPage = await extractElements(page);
    console.log(`   Found ${allResults.loginPage.length} elements on login page`);

    // ===== STEP 2: Login =====
    console.log("\n📍 Step 2: Logging in...");
    // Try to find and fill email input
    const emailSelectors = ['input[type="email"]', 'input[name="email"]', '#email', 'input[placeholder*="email" i]', 'input[placeholder*="Email" i]', 'input[placeholder*="john.doe" i]', 'input[type="text"]'];
    for (const sel of emailSelectors) {
      try {
        const el = page.locator(sel);
        if (await el.count() > 0) {
          await el.first().fill(EMAIL);
          console.log(`   ✅ Filled email using: ${sel}`);
          break;
        }
      } catch {}
    }

    // Try to find and fill password input
    const passSelectors = ['input[type="password"]', 'input[name="password"]', '#password', 'input[placeholder*="password" i]'];
    for (const sel of passSelectors) {
      try {
        const el = page.locator(sel);
        if (await el.count() > 0) {
          await el.first().fill(PASSWORD);
          console.log(`   ✅ Filled password using: ${sel}`);
          break;
        }
      } catch {}
    }

    // Screenshot before clicking login
    await saveScreenshot(page, "01-login-filled");

    // Click login/submit button
    const loginBtnSelectors = [
      'button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")',
      'button:has-text("Log in")', 'button:has-text("Sign in")', 'input[type="submit"]',
      'button:has-text("Continue")',
    ];
    for (const sel of loginBtnSelectors) {
      try {
        const el = page.locator(sel);
        if (await el.count() > 0) {
          await el.first().click();
          console.log(`   ✅ Clicked login button using: ${sel}`);
          break;
        }
      } catch {}
    }

    await page.waitForTimeout(5000);
    await page.waitForLoadState("domcontentloaded");
    await saveScreenshot(page, "02-after-login");
    console.log(`   Current URL: ${page.url()}`);

    // ===== STEP 3: Select Properties from left panel =====
    console.log("\n📍 Step 3: Clicking Properties in sidebar...");
    // The nav is a v-navigation-drawer with v-list items
    try {
      // Try clicking the Properties nav item directly via text
      const propsLink = page.locator('nav').getByText('Properties', { exact: true });
      if (await propsLink.count() > 0) {
        await propsLink.first().click();
        console.log("   ✅ Clicked Properties via nav text");
      } else {
        // Try href-based approach
        const hrefLink = page.locator('a[href*="propert" i]');
        if (await hrefLink.count() > 0) {
          await hrefLink.first().click();
          console.log("   ✅ Clicked Properties via href");
        } else {
          // Last resort: click by visible text anywhere
          await page.getByText('Properties', { exact: true }).first().click();
          console.log("   ✅ Clicked Properties via getByText");
        }
      }
    } catch (err) {
      console.log(`   ⚠️ Error clicking Properties: ${err.message}`);
      // List all nav links for debugging
      const navLinks = await page.evaluate(() => {
        const nav = document.querySelector('nav');
        if (!nav) return [];
        return Array.from(nav.querySelectorAll('a, div, span'))
          .filter(el => el.textContent?.trim().length > 0 && el.textContent?.trim().length < 50)
          .map(el => ({ tag: el.tagName, text: el.textContent?.trim(), href: el.getAttribute('href') }));
      });
      console.log("   Nav items:", JSON.stringify(navLinks.slice(0, 20), null, 2));
    }

    await page.waitForTimeout(3000);
    await saveScreenshot(page, "03-properties-page");
    console.log(`   Current URL: ${page.url()}`);

    // Extract properties page elements
    allResults.propertiesPage = await extractElements(page);
    console.log(`   Found ${allResults.propertiesPage.length} elements on properties page`);

    // ===== STEP 4: Click Filter button =====
    console.log("\n📍 Step 4: Looking for Filter button...");
    const filterSelectors = [
      'button:has-text("Filter")', 'button:has-text("Filters")',
      '[data-testid*="filter" i]', 'button[aria-label*="filter" i]',
      '.filter-button', '[class*="filter" i] button',
      'button:has-text("filter")', 'div:has-text("Filter"):not(:has(*))',
      'span:has-text("Filter")',
    ];

    let filterClicked = false;
    for (const sel of filterSelectors) {
      try {
        const el = page.locator(sel);
        if (await el.count() > 0 && await el.first().isVisible()) {
          await el.first().click();
          console.log(`   ✅ Clicked Filter using: ${sel}`);
          filterClicked = true;
          break;
        }
      } catch {}
    }

    if (!filterClicked) {
      console.log("   ⚠️ Could not find Filter button. Listing buttons on page...");
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("button, [role='button']"))
          .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
          .map(el => ({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 80),
            class: el.className?.substring?.(0, 60),
            ariaLabel: el.getAttribute("aria-label"),
          }));
      });
      console.log("   Visible buttons:", JSON.stringify(buttons, null, 2));
    }

    await page.waitForTimeout(3000);
    await saveScreenshot(page, "04-after-filter");

    // Extract filter page/panel elements
    allResults.filterPanel = await extractElements(page);
    console.log(`   Found ${allResults.filterPanel.length} elements after filter click`);

    // ===== STEP 5: Extract ALL elements from the current view (first page) =====
    console.log("\n📍 Step 5: Extracting all elements from full first page view...");
    allResults.fullPage = await extractElements(page);
    console.log(`   Found ${allResults.fullPage.length} total elements`);
    await saveScreenshot(page, "05-full-page");

    // Save raw results
    if (!existsSync("output")) mkdirSync("output", { recursive: true });
    writeFileSync("output/raw-elements.json", JSON.stringify(allResults, null, 2));
    console.log("\n💾 Raw elements saved to output/raw-elements.json");

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    await saveScreenshot(page, "error-state");
  } finally {
    console.log("\n⏳ Keeping browser open for 5 seconds so you can see it...");
    await page.waitForTimeout(5000);
    await browser.close();
    console.log("🌐 Browser closed.");
  }
}

// Extract all interactive/meaningful elements from the page
async function extractElements(page) {
  return await page.evaluate(() => {
    const selectors = [
      "input", "button", "select", "textarea", "a[href]",
      "[role='button']", "[role='link']", "[role='tab']", "[role='checkbox']",
      "[role='radio']", "[role='menuitem']", "[role='textbox']", "[role='combobox']",
      "[role='switch']", "[role='option']", "[role='listbox']",
      "[data-testid]", "[data-test]", "[data-cy]", "[data-automation-id]",
      "label", "h1", "h2", "h3", "h4", "nav", "form", "table", "th", "img[alt]",
      "[class*='dropdown']", "[class*='modal']", "[class*='dialog']",
      "[class*='tab']", "[class*='menu']", "[class*='sidebar']",
    ];

    const elements = [];
    const seen = new Set();

    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);

        const tag = el.tagName.toLowerCase();
        const rect = el.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;

        const info = { tag, visible };

        // All meaningful attributes
        const attrs = [
          "id", "name", "type", "placeholder", "aria-label", "aria-labelledby",
          "data-testid", "data-test", "data-cy", "data-automation-id",
          "role", "href", "value", "title", "alt", "for",
          "class", "autocomplete", "required", "disabled", "readonly",
          "aria-expanded", "aria-selected", "aria-checked", "tabindex",
        ];
        for (const attr of attrs) {
          const val = el.getAttribute(attr);
          if (val != null && val !== "") info[attr] = val;
        }

        // Text content
        const text = el.textContent?.trim().substring(0, 120);
        if (text && !["script", "style"].includes(tag)) info.text = text;

        // Inner HTML for small elements
        if (el.children.length === 0 && el.innerHTML.trim().length < 100) {
          info.innerHTML = el.innerHTML.trim();
        }

        // Parent info for context
        const parent = el.parentElement;
        if (parent) {
          info.parentTag = parent.tagName.toLowerCase();
          if (parent.id) info.parentId = parent.id;
          if (parent.getAttribute("class")) info.parentClass = parent.getAttribute("class").substring(0, 80);
        }

        // Associated label (for inputs)
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) info.associatedLabel = label.textContent?.trim().substring(0, 80);
        }

        elements.push(info);
      }
    }

    return elements;
  });
}

async function saveScreenshot(page, name) {
  if (!existsSync("screenshots")) mkdirSync("screenshots", { recursive: true });
  const path = `screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 Screenshot: ${path}`);
}

run().catch(console.error);
