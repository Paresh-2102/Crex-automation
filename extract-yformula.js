/**
 * extract-yformula.js
 *
 * Navigates to Settings → Y-Total → Add New Formula
 * Extracts all locators from the "Add New Formula" dialog:
 *   - Market Configuration section (MLS Board, State, County, Base Value — all mandatory)
 *   - Features section
 *   - Factors section
 *   - Add / submit button
 *
 * Flow:
 *   Login → Settings (left panel) → Y-Total → Add New Formula → Extract form elements
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL    = 'Zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── helpers ──────────────────────────────────────────────────────────────────

/** Capture a screenshot with a timestamped filename section label */
async function snap(page, label) {
  const file = `screenshots/yformula-${label}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`   📸 ${file}`);
}

/**
 * Extract every visible interactive / structural element from a container
 * and return a compact descriptor list.
 */
async function extractElements(page, containerSelector) {
  return page.evaluate((sel) => {
    const root = sel ? document.querySelector(sel) : document.body;
    if (!root) return [];

    const tags = [
      'input', 'button', 'select', 'textarea', 'a',
      '[role="button"]', '[role="combobox"]', '[role="listbox"]',
      '[role="checkbox"]', '[role="radio"]', '[role="tab"]',
      'h1','h2','h3','h4','h5','h6','label',
      'th', 'td',
      '.v-btn','.v-field','.v-select','.v-autocomplete',
      '.v-chip','.v-list-item','.v-tab',
    ];

    const all = root.querySelectorAll(tags.join(', '));
    const results = [];

    all.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return; // hidden

      const dataAttrs = {};
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-')) dataAttrs[attr.name] = attr.value;
      }

      results.push({
        index:       i,
        tag:         el.tagName.toLowerCase(),
        type:        el.type || null,
        id:          el.id || null,
        name:        el.name || null,
        role:        el.getAttribute('role') || null,
        placeholder: el.getAttribute('placeholder') || null,
        ariaLabel:   el.getAttribute('aria-label') || null,
        text:        (el.textContent || '').trim().slice(0, 120),
        classes:     el.className || null,
        forAttr:     el.getAttribute('for') || null,
        disabled:    el.disabled || false,
        dataAttrs,
      });
    });

    return results;
  }, containerSelector);
}

async function selectFirstDropdownOption(page, placeholder) {
  const input = page.locator(`.v-dialog input[placeholder="${placeholder}"]`).first();
  if (await input.count() === 0) return null;

  await input.click({ force: true });
  await wait(1200);

  const options = page.locator('.v-overlay--active .v-list-item');
  if (await options.count() === 0) return null;

  const selectedText = ((await options.first().innerText()) || '').trim();
  await options.first().click({ force: true });
  await wait(1000);
  return selectedText;
}

async function resolveActiveContainer(page) {
  if (await page.locator('.v-dialog').count() > 0) return '.v-dialog';
  if (await page.locator('.v-overlay--active').count() > 0) return '.v-overlay--active';
  return null;
}

// ── main flow ─────────────────────────────────────────────────────────────────

async function run() {
  fs.mkdirSync('screenshots', { recursive: true });
  fs.mkdirSync('output',      { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page    = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // ── 1. LOGIN ───────────────────────────────────────────────────────────────
    console.log('\n1. Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/affiliate-managers', { timeout: 20000 });
    console.log('   ✓ Logged in');

    // ── 2. SETTINGS (left panel) ──────────────────────────────────────────────
    console.log('\n2. Click Settings in left panel...');
    // Remove any nav-drawer overlay scrim that may block clicks
    await page.evaluate(() =>
      document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove())
    );
    await wait(500);
    await page.locator('nav .v-list-item, nav a').filter({ hasText: 'Settings' }).first().click({ force: true });
    await wait(3000);
    console.log('   Current URL:', page.url());
    await snap(page, '01-settings');

    // ── 3. Y-TOTAL ────────────────────────────────────────────────────────────
    console.log('\n3. Click Y-Total...');
    // Y-Total may be a sub-menu item or a tab on the Settings page
    await page.getByText('Y-Total', { exact: true }).first().click({ force: true });
    await wait(3000);
    console.log('   Current URL:', page.url());
    await snap(page, '02-ytotal');

    // ── 4. ADD NEW FORMULA button ─────────────────────────────────────────────
    console.log('\n4. Click Add New Formula button...');
    // Try common button labels
    const addFormulaBtnSelectors = [
      page.getByRole('button', { name: /Add New Formula/i }),
      page.getByText(/Add New Formula/i),
      page.getByRole('button', { name: /Add Formula/i }),
    ];

    let clicked = false;
    for (const btn of addFormulaBtnSelectors) {
      const cnt = await btn.count();
      if (cnt > 0) {
        await btn.first().click({ force: true });
        clicked = true;
        console.log('   ✓ Clicked Add New Formula');
        break;
      }
    }
    if (!clicked) {
      console.warn('   ⚠  Could not find "Add New Formula" button — taking screenshot for inspection');
      await snap(page, '03-add-formula-not-found');
    }

    await wait(3000);
    await snap(page, '03-add-formula-dialog');

    // ── 5. EXTRACT MARKET CONFIGURATION TAB ───────────────────────────────────
    console.log('\n5. Extracting Market Configuration tab elements...');

    // The dialog is likely .v-dialog or .v-overlay--active > .v-card
    let dialogSelector = null;

    const dialogCount = await page.locator('.v-dialog').count();
    if (dialogCount > 0) {
      dialogSelector = '.v-dialog';
      console.log(`   Using .v-dialog (${dialogCount} found)`);
    } else {
      const overlayCount = await page.locator('.v-overlay--active').count();
      if (overlayCount > 0) {
        dialogSelector = '.v-overlay--active';
        console.log(`   Using .v-overlay--active (${overlayCount} found)`);
      }
    }

    const marketConfigurationElements = await extractElements(page, dialogSelector);
    console.log(`   Extracted ${marketConfigurationElements.length} market configuration elements`);
    fs.writeFileSync('output/yformula-raw-elements.json', JSON.stringify(marketConfigurationElements, null, 2));

    // ── 6. CAPTURE SECTION-LEVEL STRUCTURE ────────────────────────────────────
    console.log('\n6. Capturing section structure...');
    const sectionInfo = await page.evaluate((sel) => {
      const root = sel ? document.querySelector(sel) : document.body;
      if (!root) return [];

      const sections = [];
      // Look for section headings / labels
      const headings = root.querySelectorAll('h1,h2,h3,h4,h5,h6,.v-card-title,.section-title,[class*="title"],[class*="heading"]');
      headings.forEach(h => {
        const text = h.textContent?.trim();
        if (text) sections.push({ tag: h.tagName.toLowerCase(), text, classes: h.className });
      });
      return sections;
    }, dialogSelector);

    console.log('   Sections found:');
    sectionInfo.forEach(s => console.log(`     [${s.tag}] ${s.text}`));

    // ── 7. CAPTURE SPECIFIC FIELD GROUPS ─────────────────────────────────────
    console.log('\n7. Scanning for key form fields...');
    const formFields = await page.evaluate((sel) => {
      const root = sel ? document.querySelector(sel) : document.body;
      if (!root) return {};

      function getInputInfo(input) {
        return {
          tag:         input.tagName.toLowerCase(),
          id:          input.id || null,
          name:        input.name || null,
          type:        input.type || null,
          placeholder: input.getAttribute('placeholder') || null,
          ariaLabel:   input.getAttribute('aria-label') || null,
          disabled:    input.hasAttribute('disabled'),
          classes:     input.className,
        };
      }

      // All inputs and comboboxes
      const inputs = Array.from(root.querySelectorAll('input, [role="combobox"], textarea'));
      const buttons = Array.from(root.querySelectorAll('button, [role="button"]'));
      const labels  = Array.from(root.querySelectorAll('label'));

      return {
        inputs:  inputs.map(getInputInfo),
        buttons: buttons.map(b => ({
          tag:  b.tagName.toLowerCase(),
          text: (b.textContent || '').trim().slice(0, 100),
          id:   b.id || null,
          classes: b.className,
          ariaLabel: b.getAttribute('aria-label') || null,
          disabled: b.hasAttribute('disabled'),
        })),
        labels: labels.map(l => ({
          text:    (l.textContent || '').trim(),
          forAttr: l.getAttribute('for') || null,
        })),
      };
    }, dialogSelector);

    fs.writeFileSync('output/yformula-form-fields.json', JSON.stringify(formFields, null, 2));
    console.log(`   Inputs: ${formFields.inputs?.length}  Buttons: ${formFields.buttons?.length}  Labels: ${formFields.labels?.length}`);
    console.log('   Labels:', formFields.labels?.map(l => l.text).filter(Boolean));
    console.log('   Button texts:', formFields.buttons?.map(b => b.text).filter(Boolean));
    console.log('   Input placeholders:', formFields.inputs?.map(i => i.placeholder).filter(Boolean));

    // ── 8. FILL MANDATORY FIELDS + MOVE TO MARKET FEATURES TAB ───────────────
    console.log('\n8. Filling mandatory fields and moving to Market Features...');
    const selected = {
      mlsBoard: await selectFirstDropdownOption(page, 'Select MLS Board'),
      state: await selectFirstDropdownOption(page, 'Select State'),
      county: await selectFirstDropdownOption(page, 'Select County'),
    };

    const baseValueInput = page.locator('.v-dialog input[placeholder="fit"]').first();
    if (await baseValueInput.count() > 0) {
      await baseValueInput.fill('100');
      await wait(500);
      selected.baseValue = '100';
    }

    const nextButton = page.getByRole('button', { name: 'Next' }).first();
    await nextButton.click({ force: true });
    await wait(2000);
    await snap(page, '04-market-features-tab');

    // If Next closes the modal, reopen it from table edit action.
    let currentContainer = await resolveActiveContainer(page);
    if (!currentContainer) {
      console.log('   Dialog closed after Next. Reopening from first row edit action...');
      const editButtons = page.locator('button:has(i.mdi-pencil), button:has(.mdi-pencil)');
      if (await editButtons.count() > 0) {
        await editButtons.first().click({ force: true });
        await wait(1800);
      }
      currentContainer = await resolveActiveContainer(page);
    }

    if (!currentContainer) {
      throw new Error('Unable to find active dialog/container for Market Features extraction');
    }

    // Move to Market Features tab explicitly by tab text.
    const marketFeaturesTab = page.getByText('Market Features', { exact: true }).first();
    if (await marketFeaturesTab.count() > 0) {
      await marketFeaturesTab.click({ force: true });
      await wait(1200);
    }

    const marketFeaturesElements = await extractElements(page, currentContainer);
    fs.writeFileSync('output/yformula-market-features-elements.json', JSON.stringify(marketFeaturesElements, null, 2));
    console.log(`   Extracted ${marketFeaturesElements.length} market features elements`);

    // ── 9. MOVE TO Y FACTOR TAB + CAPTURE FINAL BUTTON ───────────────────────
    console.log('\n9. Moving to Y Factor tab...');
    const yFactorTab = page.getByText('Y Factor', { exact: true }).first();
    if (await yFactorTab.count() > 0) {
      await yFactorTab.click({ force: true });
      await wait(1500);
    }

    await snap(page, '05-yfactor-tab');
    const yFactorElements = await extractElements(page, currentContainer);
    fs.writeFileSync('output/yformula-yfactor-elements.json', JSON.stringify(yFactorElements, null, 2));
    console.log(`   Extracted ${yFactorElements.length} y-factor elements`);

    // Build a compact summary with likely stable locators
    const locatorSummary = {
      metadata: {
        page: 'Settings > Y-Total > Add New Formula',
        mandatoryFields: ['MLS Board', 'State', 'County', 'Base Value'],
      },
      selectedValues: selected,
      tabs: {
        marketConfigurationTab: 'getByText("Market Configuration", { exact: true })',
        marketFeaturesTab: 'getByText("Market Features", { exact: true })',
        yFactorTab: 'getByText("Y Factor", { exact: true })',
      },
      marketConfiguration: {
        mlsBoardInput: 'locator(".v-dialog input[placeholder=\"Select MLS Board\"]")',
        stateInput: 'locator(".v-dialog input[placeholder=\"Select State\"]")',
        countyInput: 'locator(".v-dialog input[placeholder=\"Select County\"]")',
        cityInput: 'locator(".v-dialog input[placeholder=\"Select City\"]")',
        schoolDistrictInput: 'locator(".v-dialog input[placeholder=\"Select School District\"]")',
        zipCodeInput: 'locator(".v-dialog input[placeholder=\"Select Zip Code\"]")',
        baseValueInput: 'locator(".v-dialog input[placeholder=\"Enter base value\"]")',
      },
      marketFeatures: {
        sectionHeading: 'getByText("Market Features", { exact: true })',
        addNewMarketFeatureButton: 'getByRole("button", { name: /Add New Market Feature/i })',
      },
      yFactor: {
        sectionHeading: 'getByText("Y Factor", { exact: true })',
      },
      actions: {
        cancelButton: 'getByRole("button", { name: "Cancel" })',
        nextButton: 'getByRole("button", { name: "Next" })',
        addButton: 'getByRole("button", { name: /Add/i })',
      },
    };
    fs.writeFileSync('output/yformula-locator-summary.json', JSON.stringify(locatorSummary, null, 2));

    // ── 10. FINAL SCREENSHOT ──────────────────────────────────────────────────
    await snap(page, '04-final');
    console.log('\n✓ Extraction complete. Output saved to output/yformula-*.json');

  } catch (err) {
    console.error('\n✗ Error:', err.message);
    await snap(page, 'error').catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
