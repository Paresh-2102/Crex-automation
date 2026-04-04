// ============================================
// CREX Agent - Excel-Driven Automation Script
// Reads input from: test-data/filter-input-template.xlsx
// Fills all three filter tabs: Market Filters â†’ Market Features â†’ Y-Factor
//
// Usage:
//   node run-from-excel.js                         (default Excel file)
//   node run-from-excel.js path/to/custom.xlsx     (custom Excel file)
// ============================================

import { chromium } from 'playwright';
import { readExcelData } from './test-data/read-excel-data.js';
import { getLocator as getLoginLocator } from './locators/login-page.locators.js';
import { getLocator as getNavLocator } from './locators/sidebar-nav.locators.js';
import { getLocator as getFilterLocator } from './locators/properties-market-filters.locators.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File-based logger for reliable output capture
const logFile = path.join(__dirname, 'run-from-excel.log');
fs.writeFileSync(logFile, '');
function log(msg) {
  process.stdout.write(msg + '\n');
  fs.appendFileSync(logFile, msg + '\n');
}

// =====================================================
// Configuration
// =====================================================
const BASE_URL = 'https://stage.crexagent.com';
const EMAIL = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// =====================================================
// Helper: Select a value from Vuetify v-autocomplete by typing
// =====================================================
async function selectDropdownValue(page, inputSelector, value) {
  if (!value) return;

  const input = page.locator(inputSelector);
  await input.click({ force: true });
  await wait(1000);
  await input.fill(value);
  await wait(2000);

  // Wait for dropdown list and find matching item
  const listItems = page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
  await listItems.first().waitFor({ state: 'visible', timeout: 10000 });

  // Try to click the exact matching item
  const matchingItem = listItems.filter({ hasText: value });
  const count = await matchingItem.count();
  if (count > 0) {
    await matchingItem.first().click();
  } else {
    // Fallback: select first available option
    await listItems.first().click();
  }
  await wait(2000);
}

// =====================================================
// Helper: Select first dropdown option (for dependent fields)
// =====================================================
async function selectDropdownFirstOption(page, inputSelector) {
  const input = page.locator(inputSelector);
  await input.click({ force: true });
  await wait(2000);
  const items = page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
  await items.first().waitFor({ state: 'visible', timeout: 10000 });
  await items.first().click();
  await wait(2000);
}

// =====================================================
// Helper: Remove overlay scrims that block clicks
// =====================================================
async function removeOverlayScrim(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove());
  });
}

// =====================================================
// Step 1: Login
// =====================================================
async function login(page) {
  log('\nðŸ“‹ Step 1: Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await getLoginLocator(page, 'emailInput').fill(EMAIL);
  await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
  await getLoginLocator(page, 'signInButton').click();
  await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
  log('   âœ… Login successful');
}

// =====================================================
// Step 2: Navigate to Properties & Open Filter Dialog
// =====================================================
async function openFilterDialog(page) {
  log('\nðŸ“‹ Step 2: Opening filter dialog...');
  await getNavLocator(page, 'propertiesNav').click();
  await page.waitForURL('**/properties', { timeout: 15000 });
  await wait(3000);

  await removeOverlayScrim(page);
  await page.getByText('Filter By').click({ force: true });
  await wait(3000);
  await page.locator('.v-dialog').first().waitFor({ state: 'visible', timeout: 10000 });
  log('   âœ… Filter dialog opened');
}

// =====================================================
// Step 3: Fill Market Filters (Tab 1)
// =====================================================
async function fillMarketFilters(page, filters) {
  log('\nðŸ“‹ Step 3: Filling Market Filters...');

  // MLS Board
  if (filters.mlsBoard) {
    log(`   âž¤ MLS Board: ${filters.mlsBoard}`);
    await selectDropdownValue(page, '.v-dialog input[placeholder="Select MLS Board"]', filters.mlsBoard);
    await wait(2000);
  }

  // State
  if (filters.state) {
    log(`   âž¤ State: ${filters.state}`);
    await selectDropdownValue(page, '.v-dialog input[placeholder="Select State"]', filters.state);
    await wait(2000);
  }

  // County
  if (filters.county) {
    log(`   âž¤ County: ${filters.county}`);
    await selectDropdownValue(page, '.v-dialog input[placeholder="Select County"]', filters.county);
    await wait(2000);
  }

  // City (optional, depends on County)
  if (filters.city) {
    log(`   âž¤ City: ${filters.city}`);
    await selectDropdownValue(page, '.v-dialog input[placeholder="Select Cities"]', filters.city);
    await page.keyboard.press('Escape');
    await wait(1500);
  }

  // School District (optional)
  if (filters.schoolDistrict) {
    log(`   âž¤ School District: ${filters.schoolDistrict}`);
    await selectDropdownValue(page, '.v-dialog input[placeholder="Select School Districts"]', filters.schoolDistrict);
    await page.keyboard.press('Escape');
    await wait(1500);
  }

  // Zip Code (optional)
  if (filters.zipCode) {
    log(`   âž¤ Zip Code: ${filters.zipCode}`);
    await selectDropdownValue(page, '.v-dialog input[placeholder="Select Zip Codes"]', filters.zipCode);
    await page.keyboard.press('Escape');
    await wait(1500);
  }

  // Property Status (optional)
  if (filters.propertyStatus) {
    log(`   âž¤ Property Status: ${filters.propertyStatus}`);
    await selectDropdownValue(page, '.v-dialog input[placeholder="Select property status"]', filters.propertyStatus);
    await page.keyboard.press('Escape');
    await wait(1500);
  }

  // Date Range From (readonly input — use evaluate to set value)
  if (filters.dateRangeFrom) {
    log(`   ➤ Date Range From: ${filters.dateRangeFrom}`);
    await page.evaluate((val) => {
      const input = document.querySelector('input[placeholder="From Date"]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, filters.dateRangeFrom);
    await wait(500);
  }

  // Date Range To (readonly input — use evaluate to set value)
  if (filters.dateRangeTo) {
    log(`   ➤ Date Range To: ${filters.dateRangeTo}`);
    await page.evaluate((val) => {
      const input = document.querySelector('input[placeholder="To Date"]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, filters.dateRangeTo);
    await wait(500);
  }

  // Min Price
  if (filters.minPrice) {
    log(`   âž¤ Min Price: ${filters.minPrice}`);
    // Scroll to price range and remove any overlay scrims
    await removeOverlayScrim(page);
    await getFilterLocator(page, 'minPriceInput').scrollIntoViewIfNeeded();
    await wait(500);
    await getFilterLocator(page, 'minPriceInput').fill(filters.minPrice);
    await wait(500);
  }

  // Max Price
  if (filters.maxPrice) {
    log(`   âž¤ Max Price: ${filters.maxPrice}`);
    await getFilterLocator(page, 'maxPriceInput').fill(filters.maxPrice);
    await wait(500);
  }

  log('   âœ… Market Filters filled');

  // Click Next to go to Market Features Filters
  log('   âž¤ Clicking Next...');
  await page.getByRole('button', { name: 'Next' }).click();
  await wait(3000);
  log('   âœ… Navigated to Market Features Filters');
}

// =====================================================
// Step 4: Fill Market Features (Tab 2)
// =====================================================
async function fillMarketFeatures(page, features) {
  log('\nðŸ“‹ Step 4: Filling Market Features...');

  if (!features || features.length === 0) {
    log('   â­  No features to add, skipping...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);
    return;
  }

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    log(`\n   âž¤ Adding Feature ${i + 1}: ${feature.featureType}`);

    // Click "Add New Market Feature" button
    await page.getByRole('button', { name: 'Add New Market Feature' }).click();
    await wait(3000);

    // Target the nested dialog
    const nestedDialog = page.locator('.v-overlay--active:has(h3:has-text("Add New Market Feature"))');

    // Select Feature Type
    log(`     â€¢ Feature Type: ${feature.featureType}`);
    const featureTypeSelect = nestedDialog.locator('.v-select').first();
    await featureTypeSelect.click({ force: true });
    await wait(2000);

    // Find and click the matching Feature Type
    const ftItems = page.locator('.v-overlay--active').last().locator('.v-list-item');
    await ftItems.first().waitFor({ state: 'visible', timeout: 10000 });
    const matchingFT = ftItems.filter({ hasText: feature.featureType });
    if (await matchingFT.count() > 0) {
      await matchingFT.first().click();
    } else {
      await ftItems.first().click();
    }
    await wait(3000);

    // Select Features (multi-select)
    if (feature.features && feature.features.length > 0) {
      log(`     â€¢ Features: ${feature.features.join(', ')}`);
      const featuresSelect = nestedDialog.locator('.v-select').nth(1);
      await featuresSelect.click({ force: true });
      await wait(2000);

      const fItems = page.locator('.v-overlay--active').last().locator('.v-list-item');
      await fItems.first().waitFor({ state: 'visible', timeout: 10000 });

      for (const featureName of feature.features) {
        const matchingItem = fItems.filter({ hasText: featureName });
        if (await matchingItem.count() > 0) {
          await matchingItem.first().click();
          await wait(500);
        }
      }

      // Close the multi-select dropdown
      await page.keyboard.press('Escape');
      await wait(1000);
    }

    // Select Operator
    if (feature.operator && feature.operator !== 'AND') {
      log(`     â€¢ Operator: ${feature.operator}`);
      await page.locator(`#operator-${feature.operator}`).click({ force: true });
      await wait(500);
    } else {
      log(`     â€¢ Operator: AND (default)`);
    }

    // Click "Add Feature" to save
    await page.getByRole('button', { name: 'Add Feature', exact: true }).click();
    await wait(3000);
    log(`   âœ… Feature ${i + 1} added`);
  }

  // Click Next to go to Y-Factor Filters
  log('   âž¤ Clicking Next...');
  await page.getByRole('button', { name: 'Next' }).click();
  await wait(3000);
  log('   âœ… Navigated to Y-Factor Filters');
}

// =====================================================
// Step 5: Fill Y-Factor Filters (Tab 3)
// =====================================================
async function fillYFactors(page, yFactors) {
  log('\nðŸ“‹ Step 5: Filling Y-Factor Filters...');

  if (!yFactors || Object.keys(yFactors).length === 0) {
    log('   â­  No Y-Factor values to fill, skipping...');
    return;
  }

  // Min/Max text input rows (index 0-7)
  const minMaxFields = [
    { key: 'bedroomsTotal', label: 'Bedrooms Total', index: 0 },
    { key: 'bathroomsTotal', label: 'Bathrooms Total', index: 1 },
    { key: 'siteArea', label: 'Site Area', index: 2 },
    { key: 'finishedSqFt', label: 'Finished Sq Ft', index: 3 },
    { key: 'yearBuilt', label: 'Year Built', index: 4 },
    { key: 'stories', label: 'Stories', index: 5 },
    { key: 'garageSpaces', label: 'Garage Spaces', index: 6 },
    { key: 'fireplacesTotal', label: 'Fireplaces Total', index: 7 },
  ];

  for (const field of minMaxFields) {
    const data = yFactors[field.key];
    if (!data) continue;

    const { min, max } = data;
    if (min) {
      log(`   âž¤ ${field.label} Min: ${min}`);
      await page.locator('.v-dialog input[placeholder="Enter Min Value"]').nth(field.index).fill(String(min));
      await wait(300);
    }
    if (max) {
      log(`   âž¤ ${field.label} Max: ${max}`);
      await page.locator('.v-dialog input[placeholder="Enter Max Value"]').nth(field.index).fill(String(max));
      await wait(300);
    }
  }

  // Yes/No select fields (Association YN, Cooling YN)
  const yesNoFields = [
    { key: 'associationYn', label: 'Association YN' },
    { key: 'coolingYn', label: 'Cooling YN' },
  ];

  for (const field of yesNoFields) {
    const value = yFactors[field.key];
    if (!value) continue;

    log(`   ➤ ${field.label}: ${value}`);
    // Close any open overlays/dropdowns and remove scrims
    await page.keyboard.press('Escape');
    await wait(500);
    await removeOverlayScrim(page);
    await wait(500);

    // Find the row containing the label, then click its "Select Yes/No" input
    // After selection, the placeholder changes, so use first matching unselected input
    const selectInput = page.locator('.v-dialog input[placeholder="Select Yes/No"]').first();
    await selectInput.scrollIntoViewIfNeeded();
    await wait(500);
    await selectInput.click({ force: true });
    await wait(2000);

    const items = page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
    await items.first().waitFor({ state: 'visible', timeout: 10000 });

    const matchingItem = items.filter({ hasText: value });
    if (await matchingItem.count() > 0) {
      await matchingItem.first().click();
    }
    await wait(1500);
  }

  log('   âœ… Y-Factor Filters filled');
}

// =====================================================
// Step 6: Apply Filters
// =====================================================
async function applyFilters(page) {
  log('\nðŸ“‹ Step 6: Applying filters...');
  await page.getByRole('button', { name: 'Apply Filters' }).click();
  await wait(5000);
  log('   âœ… Filters applied successfully!');
}

// =====================================================
// Main Script
// =====================================================
async function main() {
  log('â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
  log('â•‘   CREX Agent - Excel-Driven Filter Automation       â•‘');
  log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

  // Read Excel data
  const excelPath = process.argv[2] || undefined;
  log(`\nðŸ“‚ Reading data from: ${excelPath || 'test-data/filter-input-template.xlsx'}`);

  let data;
  try {
    data = await readExcelData(excelPath);
  } catch (err) {
    log(`\nâŒ Error reading Excel file: ${err.message}`);
    process.exit(1);
  }

  log('\nðŸ“Š Data loaded:');
  log(`   â€¢ Market Filters: ${Object.values(data.marketFilters).filter(Boolean).length} fields with values`);
  log(`   â€¢ Market Features: ${data.marketFeatures.length} feature(s) to add`);
  const yFactorCount = Object.values(data.yFactors).filter(v =>
    typeof v === 'string' ? v : (v.min || v.max)
  ).length;
  log(`   â€¢ Y-Factors: ${yFactorCount} factor(s) with values`);

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    await login(page);
    await openFilterDialog(page);
    await fillMarketFilters(page, data.marketFilters);
    await fillMarketFeatures(page, data.marketFeatures);
    await fillYFactors(page, data.yFactors);
    await applyFilters(page);

    log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
    log('â•‘   âœ… All filters applied successfully!               â•‘');
    log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

    // Keep browser open for 10 seconds to see results
    log('\nâ³ Browser will close in 10 seconds...');
    await wait(10000);

  } catch (error) {
    log(`\nâŒ Error during automation: ${error.message}`);
    // Take screenshot on error
    const screenshotPath = path.join(__dirname, 'screenshots', `error-${Date.now()}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      log(`   ðŸ“¸ Error screenshot saved: ${screenshotPath}`);
    } catch (_) {}
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  log(err);
  process.exit(1);
});
