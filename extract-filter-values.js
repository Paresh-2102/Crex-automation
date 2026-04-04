/**
 * extract-filter-values.js
 * 
 * Opens CREX Agent staging site, logs in, navigates to Properties,
 * opens Market Filters dialog, selects one value from each dropdown,
 * and saves selected values to test-data/ for use in automation tests.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const selectedValues = {};

  try {
    // ===== 1. LOGIN =====
    console.log('Step 1: Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
    console.log('  -> Logged in OK');

    // ===== 2. NAVIGATE TO PROPERTIES =====
    console.log('Step 2: Navigate to Properties...');
    await page.getByText('Properties', { exact: true }).first().click();
    await page.waitForURL('**/properties', { timeout: 15000 });
    await wait(3000);
    console.log('  -> On Properties page');

    // ===== 3. OPEN FILTER DIALOG =====
    console.log('Step 3: Open Market Filters...');
    await wait(2000);
    // The Vuetify navigation drawer creates an overlay scrim that blocks clicks.
    // Remove it via DOM manipulation, then click normally.
    await page.evaluate(() => {
      document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove());
    });
    await wait(500);
    await page.getByText('Filter By').click({ force: true });
    await wait(3000);
    // Wait for dialog to be visible using Vuetify class
    await page.locator('.v-dialog').first().waitFor({ state: 'visible', timeout: 10000 });
    console.log('  -> Dialog opened');

    // Helper: select first option from a Vuetify autocomplete dropdown
    // Uses evaluate() to count overlays before/after click to find the new menu
    async function selectDropdown(placeholder, label) {
      console.log(`  Selecting ${label}...`);
      
      // Count existing .v-list-item elements before opening dropdown
      const beforeCount = await page.locator('.v-menu .v-list-item').count();
      
      // Click the input element directly
      const input = page.locator(`.v-dialog input[placeholder="${placeholder}"]`);
      try {
        await input.click({ force: true });
      } catch {
        // Fallback: click the first element with this placeholder
        await page.locator(`.v-dialog [placeholder="${placeholder}"]`).first().click({ force: true });
      }
      await wait(2500);
      
      // Find the dropdown menu items - look for role=listbox within the menu overlay
      // Vuetify renders v-autocomplete options in the last opened .v-overlay with .v-list
      const menuItems = page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
      
      try {
        await menuItems.first().waitFor({ state: 'visible', timeout: 8000 });
        const count = await menuItems.count();
        console.log(`    ${count} options for ${label}`);
        
        if (count > 0) {
          const text = (await menuItems.first().innerText()).trim();
          await menuItems.first().click();
          await wait(1500);
          console.log(`    Selected: "${text}"`);
          return text;
        }
      } catch (e) {
        console.log(`    No options appeared for ${label}: ${e.message.split('\n')[0]}`);
        await page.keyboard.press('Escape');
        await wait(500);
      }
      return null;
    }

    // ===== 4-10. SELECT FROM EACH DROPDOWN =====
    const dropdowns = [
      { placeholder: 'Select MLS Board', label: 'MLS Board', key: 'mlsBoard', waitAfter: 3000 },
      { placeholder: 'Select State', label: 'State', key: 'state', waitAfter: 3000 },
      { placeholder: 'Select County', label: 'County', key: 'county', waitAfter: 3000 },
      { placeholder: 'Select Cities', label: 'City', key: 'city', waitAfter: 1500, escape: true },
      { placeholder: 'Select School Districts', label: 'School District', key: 'schoolDistrict', waitAfter: 1500, escape: true },
      { placeholder: 'Select Zip Codes', label: 'Zip Code', key: 'zipCode', waitAfter: 1500, escape: true },
      { placeholder: 'Select property status', label: 'Property Status', key: 'propertyStatus', waitAfter: 1500, escape: true },
    ];

    for (let i = 0; i < dropdowns.length; i++) {
      const dd = dropdowns[i];
      console.log(`Step ${i + 4}: ${dd.label}...`);
      const val = await selectDropdown(dd.placeholder, dd.label);
      if (val) selectedValues[dd.key] = val;
      if (dd.escape) {
        await page.keyboard.press('Escape');
        await wait(500);
      }
      await wait(dd.waitAfter);
    }

    // ===== 11. DATE RANGE =====
    console.log('Step 11: Read Date Range...');
    selectedValues.dateRangeFrom = 'Mar 28, 2025';
    selectedValues.dateRangeTo = 'Mar 28, 2026';
    console.log(`  -> Dates: ${selectedValues.dateRangeFrom} to ${selectedValues.dateRangeTo}`);

    // ===== 12. PRICE RANGE =====
    console.log('Step 12: Fill Price Range...');
    await page.locator('.v-dialog input[placeholder="Min Price"]').fill('100000');
    selectedValues.minPrice = '100000';
    await page.locator('.v-dialog input[placeholder="Max Price"]').fill('500000');
    selectedValues.maxPrice = '500000';
    console.log(`  -> Price: $100000 - $500000`);
    await wait(1000);

    // ===== 13. SCREENSHOT =====
    console.log('Step 13: Screenshot...');
    fs.mkdirSync('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/filter-values-selected.png', fullPage: true });
    console.log('  -> Saved');

    // ===== 14. SAVE DATA FILES =====
    console.log('Step 14: Saving...');
    fs.mkdirSync('test-data', { recursive: true });

    fs.writeFileSync('test-data/filter-values.json', JSON.stringify(selectedValues, null, 2));

    const jsContent = `// ============================================
// Test Data: Market Filter Selected Values
// Source: ${BASE_URL}/properties
// Extracted: ${new Date().toISOString().split('T')[0]}
//
// Usage:
//   import { filterValues } from '../test-data/filter-values.js';
//   await page.getByText(filterValues.mlsBoard).click();
// ============================================

export const filterValues = ${JSON.stringify(selectedValues, null, 2)};
`;
    fs.writeFileSync('test-data/filter-values.js', jsContent);

    console.log('\n======== SELECTED FILTER VALUES ========');
    for (const [key, val] of Object.entries(selectedValues)) {
      console.log(`  ${key}: ${val}`);
    }
    console.log('========================================');
    console.log('DONE!');

  } catch (err) {
    console.error('\n*** ERROR ***:', err.message);
    fs.mkdirSync('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/filter-values-error.png', fullPage: true }).catch(() => {});
    console.log('Error screenshot saved.');
    if (Object.keys(selectedValues).length > 0) {
      fs.mkdirSync('test-data', { recursive: true });
      fs.writeFileSync('test-data/filter-values-partial.json', JSON.stringify(selectedValues, null, 2));
      console.log('Partial data saved.');
    }
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
