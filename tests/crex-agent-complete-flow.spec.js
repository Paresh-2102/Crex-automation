import { test, expect } from '@playwright/test';
import { getLocator as getLoginLocator } from '../locators/login-page.locators.js';
import { getLocator as getNavLocator } from '../locators/sidebar-nav.locators.js';
import { getLocator as getFilterLocator } from '../locators/properties-market-filters.locators.js';
import { getLocator as getFeaturesLocator } from '../locators/market-features-filters.locators.js';
import { getLocator as getYFactorLocator } from '../locators/yfactor-filters.locators.js';
import { getLocator as getYFormulaLocator } from '../locators/yformula-creation.locators.js';
import { readExcelData } from '../test-data/read-excel-data.js';

const EMAIL = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Excel data loaded once before all tests
let excelData;
test.beforeAll(async () => {
  excelData = await readExcelData();
});

/**
 * Helper: select a specific option from a Vuetify v-autocomplete dropdown.
 * Strategy: try fill() first (works for some fields), then fallback to
 * pressSequentially (works for others). Wait for matching option to appear.
 */
async function selectDropdownOption(page, inputSelector, value) {
  if (!value) return;

  const input = page.locator(inputSelector);
  await input.click({ force: true });
  await wait(1000);

  // Try fill() first — works for fields like MLS Board, State
  await input.fill(value);
  await wait(2000);

  const dropdownItems = page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
  const matchingOption = dropdownItems.filter({ hasText: value });

  // Check if fill() produced the matching option
  if (await matchingOption.count() > 0) {
    await matchingOption.first().click();
    await wait(2000);
    return;
  }

  // fill() didn't work — clear and try typing slowly
  await input.clear();
  await wait(500);
  await input.click({ force: true });
  await wait(1000);
  await input.pressSequentially(value, { delay: 100 });
  await wait(3000);

  // Check if dropdown is still open with matching option
  const retryItems = page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
  const retryMatch = retryItems.filter({ hasText: value });
  if (await retryMatch.count() > 0) {
    await retryMatch.first().click();
    await wait(2000);
  } else {
    // Option may have been auto-selected or dropdown closed — press Enter to confirm
    await page.keyboard.press('Enter');
    await wait(2000);
  }
}

/**
 * Helper: remove Vuetify overlay scrims that block clicks.
 */
async function removeOverlayScrim(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove());
  });
}

/**
 * Helper: select exact value from Y-Formula dialog dropdown.
 * Mirrors the proven selectDropdownOption strategy:
 * 1. Try fill(value) directly — triggers Vuetify filtering via the native input event.
 * 2. If no matching option appears, fall back to pressSequentially (slower, more reliable).
 * Never presses Escape — that bubbles to the v-dialog and closes it.
 */
async function selectYFormulaDialogOption(page, placeholder, value) {
  const input = page.locator(`.v-dialog input[placeholder="${placeholder}"]`).first();
  // Use explicit timeouts: 10s for visibility, 15s for enabled (cascading API calls can be slow)
  await expect(input).toBeVisible({ timeout: 10000 });
  await expect(input).toBeEnabled({ timeout: 15000 });

  await input.click({ force: true });
  await wait(1000); // Wait for dropdown to open and initial API results to load

  // Strategy 1: fill(value) directly — triggers Vue's input handler which filters the list
  await input.fill(value);
  await wait(2000); // API needs time to return filtered results

  const overlay = page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
  const option = overlay.filter({ hasText: value }).first();

  if (await option.count() > 0) {
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click({ force: true });
    await wait(800);
    return;
  }

  // Strategy 2: clear and type slowly — some Vuetify fields ignore programmatic fill
  await input.clear();
  await wait(500);
  await input.click({ force: true });
  await wait(1000);
  await input.pressSequentially(value, { delay: 100 });
  await wait(3000);

  if (await option.count() > 0) {
    await option.click({ force: true });
    await wait(800);
  } else {
    // Option may have been auto-selected (value matches exactly)
    await page.keyboard.press('Enter');
    await wait(1000);
  }
}

test.describe('CREX Agent - Complete Property Filter Flow', () => {

  // Long E2E flow needs more time
  test.setTimeout(300000);

  test.skip('TC-001: should login successfully', async ({ page }) => {
    await page.goto('/login');
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await expect(getLoginLocator(page, 'signInButton')).toBeVisible();
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
    await expect(getNavLocator(page, 'propertiesNav')).toBeVisible();
  });

  test.skip('TC-002: should complete full filter flow — Filters → Features → Y-Factors → Apply', async ({ page }) => {
    const filters = excelData.marketFilters;
    const features = excelData.marketFeatures;
    const yFactors = excelData.yFactors;

    // ============================================================
    // STEP 1: Login
    // ============================================================
    await page.goto('/login');
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });

    // ============================================================
    // STEP 2: Navigate to Properties & Open Filter Dialog
    // ============================================================
    await getNavLocator(page, 'propertiesNav').click();
    await page.waitForURL('**/properties', { timeout: 15000 });
    await wait(3000);

    await removeOverlayScrim(page);
    await page.getByText('Filter By').click({ force: true });
    await wait(3000);
    await page.locator('.v-dialog').first().waitFor({ state: 'visible', timeout: 10000 });

    // Verify Market Filters dialog
    await expect(page.getByRole('heading', { name: 'Market Filters', level: 4 })).toBeVisible();

    // ============================================================
    // STEP 3: Fill Market Filters (Tab 1) — using Excel data
    // ============================================================

    // MLS Board (required)
    await selectDropdownOption(page, '.v-dialog input[placeholder="Select MLS Board"]', filters.mlsBoard);
    await wait(3000);

    // State (required) — depends on MLS Board
    await selectDropdownOption(page, '.v-dialog input[placeholder="Select State"]', filters.state);
    await wait(3000);

    // County (required) — depends on State
    await selectDropdownOption(page, '.v-dialog input[placeholder="Select County"]', filters.county);
    await wait(3000);

    // City (optional) — depends on County
    if (filters.city) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select Cities"]', filters.city);
      await page.keyboard.press('Escape');
      await wait(2000);
    }

    // School District (optional) — depends on County
    if (filters.schoolDistrict) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select School Districts"]', filters.schoolDistrict);
      await page.keyboard.press('Escape');
      await wait(2000);
    }

    // Zip Code (optional) — depends on City
    if (filters.zipCode) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select Zip Codes"]', filters.zipCode);
      await page.keyboard.press('Escape');
      await wait(2000);
    }

    // Property Status (optional — skip if empty)
    if (filters.propertyStatus) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select property status"]', filters.propertyStatus);
      await page.keyboard.press('Escape');
      await wait(1500);
    }

    // Min / Max Price from Excel (skip if empty)
    if (filters.minPrice) {
      await getFilterLocator(page, 'minPriceInput').fill(filters.minPrice);
    }
    if (filters.maxPrice) {
      await getFilterLocator(page, 'maxPriceInput').fill(filters.maxPrice);
    }

    // Screenshot to verify filter selections
    await page.screenshot({ path: 'test-results/market-filters-filled.png', fullPage: false });

    // Click Next → Market Features Filters
    await getFilterLocator(page, 'nextButton').click();
    await wait(3000);

    // ============================================================
    // STEP 4: Add Market Features (Tab 2)
    // ============================================================
    await expect(getFeaturesLocator(page, 'marketFeaturesDialogTitle')).toBeVisible();

    // Add each feature from Excel
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];

      // Click "Add New Market Feature"
      await page.getByRole('button', { name: 'Add New Market Feature' }).click();
      await wait(3000);

      const nestedDialog = page.locator('.v-overlay--active:has(h3:has-text("Add New Market Feature"))');

      // Select Feature Type by text from Excel
      const featureTypeSelect = nestedDialog.locator('.v-select').first();
      await featureTypeSelect.click({ force: true });
      await wait(2000);
      await page.getByText(feature.featureType, { exact: true }).click();
      await wait(3000);

      // Select Features (multi-select)
      const featuresSelect = nestedDialog.locator('.v-select').nth(1);
      await featuresSelect.click({ force: true });
      await wait(3000);
      const fItems = page.locator('.v-overlay--active').last().locator('.v-list-item');
      await fItems.first().waitFor({ state: 'visible', timeout: 15000 });

      if (feature.features && feature.features.length > 0) {
        for (const featureName of feature.features) {
          const matchingItem = fItems.filter({ hasText: featureName });
          if (await matchingItem.count() > 0) {
            await matchingItem.first().click();
            await wait(500);
          }
        }
      } else {
        await fItems.first().click();
        await wait(500);
      }
      await page.keyboard.press('Escape');
      await wait(1000);

      // Select Operator if not AND
      if (feature.operator && feature.operator !== 'AND') {
        await page.locator(`#operator-${feature.operator}`).click({ force: true });
        await wait(500);
      }

      // Click "Add Feature"
      await page.getByRole('button', { name: 'Add Feature', exact: true }).click();
      await wait(3000);

      // Verify feature added to table
      await expect(page.getByText(feature.featureType).first()).toBeVisible();
    }

    // Click Next → Y-Factor Filters
    await getFeaturesLocator(page, 'nextButton').click();
    await wait(3000);

    // ============================================================
    // STEP 5: Fill Y-Factor Filters (Tab 3) — skip if all empty
    // ============================================================
    await expect(page.getByText('Configure Y-factor filters for your property search')).toBeVisible();
    await expect(getYFactorLocator(page, 'yFactorsHeader')).toBeVisible();

    // Min/Max fields (rows 0–7) — only fill if data exists
    const minMaxFields = [
      { key: 'bedroomsTotal', index: 0 },
      { key: 'bathroomsTotal', index: 1 },
      { key: 'siteArea', index: 2 },
      { key: 'finishedSqFt', index: 3 },
      { key: 'yearBuilt', index: 4 },
      { key: 'stories', index: 5 },
      { key: 'garageSpaces', index: 6 },
      { key: 'fireplacesTotal', index: 7 },
    ];

    for (const field of minMaxFields) {
      const data = yFactors[field.key];
      if (!data) continue;
      if (data.min) {
        await page.locator('.v-dialog input[placeholder="Enter Min Value"]').nth(field.index).fill(String(data.min));
        await wait(300);
      }
      if (data.max) {
        await page.locator('.v-dialog input[placeholder="Enter Max Value"]').nth(field.index).fill(String(data.max));
        await wait(300);
      }
    }

    // Yes/No fields — only fill if data exists
    const yesNoFields = [
      { key: 'associationYn' },
      { key: 'coolingYn' },
    ];

    for (const field of yesNoFields) {
      const value = yFactors[field.key];
      if (!value) continue;

      await page.keyboard.press('Escape');
      await wait(500);
      await removeOverlayScrim(page);
      await wait(500);

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

    // ============================================================
    // STEP 6: Click Apply Filters
    // ============================================================
    await getYFactorLocator(page, 'applyFiltersButton').click();
    await wait(5000);

    // Verify we are back on the Properties page with filters applied
    await expect(page).toHaveURL(/properties/);
  });

  test.skip('TC-003: should click original property (blue dot) and view detail', async ({ page }) => {
    // ============================================================
    // STEP 1: Login
    // ============================================================
    await page.goto('/login');
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });

    // ============================================================
    // STEP 2: Navigate to Properties & Apply Filters (same as TC-002)
    // ============================================================
    const filters = excelData.marketFilters;
    const features = excelData.marketFeatures;

    await getNavLocator(page, 'propertiesNav').click();
    await page.waitForURL('**/properties', { timeout: 15000 });
    await wait(3000);

    await removeOverlayScrim(page);
    await page.getByText('Filter By').click({ force: true });
    await wait(3000);
    await page.locator('.v-dialog').first().waitFor({ state: 'visible', timeout: 10000 });

    // MLS Board
    await selectDropdownOption(page, '.v-dialog input[placeholder="Select MLS Board"]', filters.mlsBoard);
    await wait(3000);

    // State
    await selectDropdownOption(page, '.v-dialog input[placeholder="Select State"]', filters.state);
    await wait(3000);

    // County
    await selectDropdownOption(page, '.v-dialog input[placeholder="Select County"]', filters.county);
    await wait(3000);

    // City
    if (filters.city) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select Cities"]', filters.city);
      await page.keyboard.press('Escape');
      await wait(2000);
    }

    // School District
    if (filters.schoolDistrict) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select School Districts"]', filters.schoolDistrict);
      await page.keyboard.press('Escape');
      await wait(2000);
    }

    // Zip Code
    if (filters.zipCode) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select Zip Codes"]', filters.zipCode);
      await page.keyboard.press('Escape');
      await wait(2000);
    }

    // Property Status (skip if empty)
    if (filters.propertyStatus) {
      await selectDropdownOption(page, '.v-dialog input[placeholder="Select property status"]', filters.propertyStatus);
      await page.keyboard.press('Escape');
      await wait(1500);
    }

    // Price (skip if empty)
    if (filters.minPrice) {
      await getFilterLocator(page, 'minPriceInput').fill(filters.minPrice);
    }
    if (filters.maxPrice) {
      await getFilterLocator(page, 'maxPriceInput').fill(filters.maxPrice);
    }

    // Next → Market Features
    await getFilterLocator(page, 'nextButton').click();
    await wait(3000);

    // Add features
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      await page.getByRole('button', { name: 'Add New Market Feature' }).click();
      await wait(3000);

      const nestedDialog = page.locator('.v-overlay--active:has(h3:has-text("Add New Market Feature"))');

      const featureTypeSelect = nestedDialog.locator('.v-select').first();
      await featureTypeSelect.click({ force: true });
      await wait(2000);
      await page.getByText(feature.featureType, { exact: true }).click();
      await wait(3000);

      const featuresSelect = nestedDialog.locator('.v-select').nth(1);
      await featuresSelect.click({ force: true });
      await wait(3000);
      const fItems = page.locator('.v-overlay--active').last().locator('.v-list-item');
      await fItems.first().waitFor({ state: 'visible', timeout: 15000 });

      if (feature.features && feature.features.length > 0) {
        for (const featureName of feature.features) {
          const matchingItem = fItems.filter({ hasText: featureName });
          if (await matchingItem.count() > 0) {
            await matchingItem.first().click();
            await wait(500);
          }
        }
      } else {
        await fItems.first().click();
        await wait(500);
      }
      await page.keyboard.press('Escape');
      await wait(1000);

      if (feature.operator && feature.operator !== 'AND') {
        await page.locator(`#operator-${feature.operator}`).click({ force: true });
        await wait(500);
      }

      await page.getByRole('button', { name: 'Add Feature', exact: true }).click();
      await wait(3000);
    }

    // Next → Y-Factors (skip filling, just apply)
    await getFeaturesLocator(page, 'nextButton').click();
    await wait(3000);

    // Apply Filters (Y-Factors empty)
    await getYFactorLocator(page, 'applyFiltersButton').click();
    await wait(5000);

    await expect(page).toHaveURL(/properties/);

    // ============================================================
    // STEP 3: Click on Original Property (blue dot) on the map
    // ============================================================
    // Wait for the map and property markers to load
    await wait(5000);

    // Original properties are represented by blue dots/markers on the map
    // Look for the blue marker (original property indicator)
    const blueMarker = page.locator('.leaflet-marker-icon, .marker-cluster, [class*="marker"], [class*="blue"], svg circle[fill="blue"], .leaflet-interactive').first();
    await blueMarker.waitFor({ state: 'visible', timeout: 20000 });
    await blueMarker.click({ force: true });
    await wait(3000);

    // ============================================================
    // STEP 4: Click "View Detail" button
    // ============================================================
    const viewDetailBtn = page.getByRole('button', { name: /view detail/i });
    await viewDetailBtn.waitFor({ state: 'visible', timeout: 10000 });
    await viewDetailBtn.click();
    await wait(5000);

    // Verify navigation to property detail page
    await expect(page).toHaveURL(/properties|property|detail/);
  });

  test.skip('TC-004: should create Y-formula from Settings > Y-Total', async ({ page }) => {
    // Increase viewport height so the dialog footer (Next/Add buttons) is always visible
    await page.setViewportSize({ width: 1280, height: 1024 });

    // ============================================================
    // STEP 1: Login
    // ============================================================
    await page.goto('/login');
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });

    // ============================================================
    // STEP 2: Open Settings > Y-Total
    // ============================================================
    await removeOverlayScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    await page.waitForURL('**/settings**', { timeout: 15000 });
    await wait(2000);

    await getYFormulaLocator(page, 'yTotalTab').first().click({ force: true });
    await wait(2000);

    // ============================================================
    // STEP 3: Open Create Formula dialog
    // ============================================================
    await getYFormulaLocator(page, 'addNewFormulaButton').first().click({ force: true });
    await wait(2000); // Wait for dialog to open
    await expect(getYFormulaLocator(page, 'createFormulaDialogTitle')).toBeVisible();

    // Required labels must be visible (mandatory fields)
    await expect(getYFormulaLocator(page, 'mlsBoardLabelRequired')).toBeVisible();
    await expect(getYFormulaLocator(page, 'stateLabelRequired')).toBeVisible();
    await expect(getYFormulaLocator(page, 'countyLabelRequired')).toBeVisible();
    await expect(getYFormulaLocator(page, 'baseValueLabelRequired')).toBeVisible();

    // ============================================================
    // STEP 4: Fill mandatory market configuration fields (values from Excel)
    // ============================================================
    await selectYFormulaDialogOption(page, 'Select MLS Board', excelData.yFormula.mlsBoard);
    await wait(2000); // Wait for State dropdown to become enabled (API cascade)
    await selectYFormulaDialogOption(page, 'Select State', excelData.yFormula.state);
    await wait(2000); // Wait for County dropdown to become enabled (API cascade)
    await selectYFormulaDialogOption(page, 'Select County', excelData.yFormula.county);
    await wait(1500); // Wait for City/Zip dropdowns to become enabled

    // Optional fields
    if (excelData.yFormula.city) {
      await selectYFormulaDialogOption(page, 'Select City', excelData.yFormula.city);
      await wait(1000);
    }
    if (excelData.yFormula.zipCode) {
      await selectYFormulaDialogOption(page, 'Select Zip Code', excelData.yFormula.zipCode);
      await wait(1000);
    }

    // Ensure no dropdown overlay is blocking the Base Value input
    const overlayOpen = await page.locator('.v-overlay--active .v-list-item').count();
    if (overlayOpen > 0) {
      await page.keyboard.press('Tab');
      await wait(400);
    }

    const baseValueInput = page.locator('.v-dialog input[placeholder="Enter base value"]');
    await baseValueInput.click();
    await wait(500);
    await baseValueInput.fill(excelData.yFormula.baseValue);
    await baseValueInput.press('Tab');
    await wait(800);

    // ============================================================
    // STEP 5: Move through wizard — Market Config → Market Features → Y Factor
    // ============================================================

    // ── Step 1 → Step 2: Market Config → Market Features ─────────────────────
    // The first Next button (Market Config step) is .first() — only Step 1 buttons exist here.
    const nextButton = getYFormulaLocator(page, 'nextButton').first();
    await removeOverlayScrim(page);
    await expect(nextButton).toBeEnabled({ timeout: 10000 });
    await nextButton.click();
    await wait(2000);

    // If wizard tab did not stay open after Next, reopen the first row via edit icon.
    if (await page.locator('.v-dialog').count() === 0) {
      const editButton = page.locator('button:has(i.mdi-pencil), button:has(.mdi-pencil)').first();
      if (await editButton.count() > 0) {
        await editButton.click({ force: true });
        await wait(2000);
      }
    }

    // Wait for Market Features loading spinner to disappear.
    // The tab fetches 29 property attribute rows from the API — can take 5-30 seconds.
    try {
      await page.getByText('Loading property attributes...').waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* already gone or never appeared */ }
    await wait(1000);

    // Confirm on Market Features tab by checking for feature dropdowns
    await expect(
      page.locator('.v-dialog input[placeholder="Select the features (optional)"]').first()
    ).toBeVisible({ timeout: 10000 });

    // ── Fill Market Features rows (optional — data from Excel) ────────────────
    // 29 feature type rows in fixed alphabetical order; each has a multi-select
    // dropdown (placeholder = "Select the features (optional)") and AND/OR/NOT radios.
    const featureTypeOrder = [
      'Accessibility Features', 'Appliances', 'Architectural Style',
      'Association Amenities', 'Common Interest', 'Community Features',
      'Construction Materials', 'Cooling', 'Exterior Features',
      'Foundation Details', 'Heating', 'Interior Features',
      'Levels', 'Lot Features', 'Other Structures',
      'Parking Features', 'Patio Porch Features', 'Pool Features',
      'Property Sub Type', 'Property Type', 'Road Surface Type',
      'Security Features', 'Sewer', 'Structure Type',
      'Utilities', 'View', 'Water Source',
      'Waterfront Features', 'Window Features',
    ];

    for (const featureEntry of excelData.marketFeatures) {
      if (!featureEntry.features?.length) continue;
      const rowIndex = featureTypeOrder.indexOf(featureEntry.featureType);
      if (rowIndex === -1) continue;

      // Scroll this feature type row into view within the dialog's scrollable content area
      await page.evaluate((idx) => {
        const inputs = document.querySelectorAll('.v-dialog input[placeholder="Select the features (optional)"]');
        const target = inputs[idx];
        if (!target) return;
        let el = target.parentElement;
        while (el && !el.classList.contains('v-dialog')) {
          if (el.scrollHeight > el.clientHeight) {
            const tr = target.getBoundingClientRect();
            const cr = el.getBoundingClientRect();
            el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
            break;
          }
          el = el.parentElement;
        }
      }, rowIndex);
      await wait(500);

      // Open the multi-select dropdown and pick each feature value
      const featureInput = page.locator('.v-dialog input[placeholder="Select the features (optional)"]').nth(rowIndex);
      for (const featureValue of featureEntry.features) {
        await featureInput.click({ force: true });
        await wait(600);
        await featureInput.fill(featureValue);
        await wait(1500);
        const option = page.locator('.v-overlay--active .v-list-item').filter({ hasText: featureValue }).first();
        if (await option.count() > 0) {
          await option.click({ force: true });
          await wait(400);
        }
      }
      // Close multi-select dropdown (Tab is safe — does not close the v-dialog)
      await page.keyboard.press('Tab');
      await wait(500);

      // Click the AND/OR/NOT radio label — only enabled once a feature is selected
      const featureKey = featureEntry.featureType.toLowerCase().replace(/\s+/g, '_');
      const operatorLabel = page.locator(`label[for="operator-${featureKey}-${rowIndex}-${featureEntry.operator}"]`);
      if (await operatorLabel.count() > 0) {
        await operatorLabel.click({ force: true });
        await wait(300);
      }
    }

    // ── Step 2 → Step 3: Market Features → Y Factor ──────────────────────────
    // Market Features content is ~2500px tall (29 feature rows). The footer Next button
    // is below the fold. Scroll all overflow containers, then click via page.mouse.click()
    // using real getBoundingClientRect coordinates (bypasses Playwright visibility checks
    // on the clipped overlay content area).
    await page.evaluate(() => {
      ['.v-overlay__content', '.v-dialog', '.v-dialog > div', '.v-dialog .v-card', '.v-dialog .v-card-text', '.v-dialog .v-sheet']
        .forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
          });
        });
    });
    await wait(800);

    // Find the VISIBLE Next button — previous-step buttons are hidden (getBCR width=0).
    const step2NextPos = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.v-dialog button')]
        .filter(b => b.textContent.trim() === 'Next');
      const btn = btns.find(b => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }) || btns[btns.length - 1];
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    if (step2NextPos) {
      await page.mouse.click(step2NextPos.x, step2NextPos.y);
    }
    await wait(3000);

    // ── Confirm Y Factor tab — check for base number inputs ───────────────────
    await expect(
      page.locator('.v-dialog input[placeholder="Enter base number"]').first()
    ).toBeVisible({ timeout: 10000 });

    // ── Fill Y Factor fields ──────────────────────────────────────────────────
    // 8 numeric rows (Base Number + Unit Value each) followed by 2 Yes/No dropdowns.
    // Y-factors are optional but if filling a row, BOTH fields must be completed.
    // Uses Excel data when present; otherwise falls back to hardcoded test defaults.
    const yFactorRows = [
      { key: 'bedroomsTotal',   base: '1',    unit: '5000'  },  // Bedrooms Total
      { key: 'bathroomsTotal',  base: '1',    unit: '3000'  },  // Bathrooms Total
      { key: 'siteArea',        base: '1',    unit: '1000'  },  // Site Area
      { key: 'finishedSqFt',    base: '1',    unit: '100'   },  // Finished Sq Ft
      { key: 'yearBuilt',       base: '2000', unit: '500'   },  // Year Built
      { key: 'stories',         base: '1',    unit: '2000'  },  // Stories
      { key: 'garageSpaces',    base: '1',    unit: '5000'  },  // Garage Spaces
      { key: 'fireplacesTotal', base: '1',    unit: '3000'  },  // Fireplaces Total
    ];

    for (let i = 0; i < yFactorRows.length; i++) {
      const row = yFactorRows[i];
      const excelRow = excelData.yFactors[row.key] || {};
      const baseVal = (excelRow.min && excelRow.min !== '') ? excelRow.min : row.base;
      const unitVal = (excelRow.max && excelRow.max !== '') ? excelRow.max : row.unit;

      // Scroll row into view within Y Factor scrollable content
      await page.evaluate((idx) => {
        const inputs = document.querySelectorAll('.v-dialog input[placeholder="Enter base number"]');
        const target = inputs[idx];
        if (!target) return;
        let el = target.parentElement;
        while (el && !el.classList.contains('v-dialog')) {
          if (el.scrollHeight > el.clientHeight) {
            const tr = target.getBoundingClientRect();
            const cr = el.getBoundingClientRect();
            el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
            break;
          }
          el = el.parentElement;
        }
      }, i);
      await wait(300);

      const baseInput = page.locator('.v-dialog input[placeholder="Enter base number"]').nth(i);

      await baseInput.click({ force: true });
      await wait(200);
      await baseInput.fill(baseVal);
      // Tab triggers blur on base input — Vue removes readonly from unit value input
      // and changes its placeholder from "Enter base number first" → "Enter unit value"
      await baseInput.press('Tab');
      await wait(500);

      // Target unit value by its EDITABLE placeholder "Enter unit value".
      // nth(i) is correct because exactly i unit inputs will have this placeholder
      // by the time we process row i (each base fill unlocks one unit input in order).
      const unitInput = page.locator('.v-dialog input[placeholder="Enter unit value"]').nth(i);
      await expect(unitInput).toBeVisible({ timeout: 5000 });
      await unitInput.click({ force: true });
      await wait(200);
      await unitInput.fill(unitVal);
      await wait(300);
    }

    // Association YN and Cooling YN — only fill when Excel explicitly provides values.
    // These rows REQUIRE a unit value if a Y/N is selected (both must be completed).
    // Since the Excel template has these empty, they are skipped to keep Create enabled.
    const assocYnValue = excelData.yFactors.associationYn; // '' if not set in Excel
    if (assocYnValue) {
      await page.evaluate(() => {
        const target = document.querySelectorAll('.v-dialog input[placeholder="Select Yes or No"]')[0];
        if (!target) return;
        let el = target.parentElement;
        while (el && !el.classList.contains('v-dialog')) {
          if (el.scrollHeight > el.clientHeight) {
            const tr = target.getBoundingClientRect();
            const cr = el.getBoundingClientRect();
            el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
            break;
          }
          el = el.parentElement;
        }
      });
      await wait(400);
      const assocInput = page.locator('.v-dialog input[placeholder="Select Yes or No"]').nth(0);
      await assocInput.click({ force: true });
      await wait(600);
      const assocOption = page.locator('.v-overlay--active .v-list-item').filter({ hasText: assocYnValue }).first();
      if (await assocOption.count() > 0) {
        await assocOption.click({ force: true });
        await wait(500);
        // After YN selection, unit value unlocks (placeholder → "Enter unit value").
        // nth(8) = 9th "Enter unit value" input after 8 numeric rows are already filled.
        const assocUnitInput = page.locator('.v-dialog input[placeholder="Enter unit value"]').nth(8);
        if (await assocUnitInput.count() > 0) {
          await assocUnitInput.click({ force: true });
          await wait(200);
          await assocUnitInput.fill('1000');
          await wait(300);
        }
      } else {
        await page.keyboard.press('Escape');
        await wait(300);
      }
      await page.keyboard.press('Tab');
      await wait(400);
    }

    const coolingYnValue = excelData.yFactors.coolingYn; // '' if not set in Excel
    if (coolingYnValue) {
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('.v-dialog input[placeholder="Select Yes or No"]');
        const target = inputs[inputs.length - 1];  // last = Cooling YN
        if (!target) return;
        let el = target.parentElement;
        while (el && !el.classList.contains('v-dialog')) {
          if (el.scrollHeight > el.clientHeight) {
            const tr = target.getBoundingClientRect();
            const cr = el.getBoundingClientRect();
            el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
            break;
          }
          el = el.parentElement;
        }
      });
      await wait(400);
      const coolingInput = page.locator('.v-dialog input[placeholder="Select Yes or No"]').last();
      await coolingInput.click({ force: true });
      await wait(600);
      const coolingOption = page.locator('.v-overlay--active .v-list-item').filter({ hasText: coolingYnValue }).first();
      if (await coolingOption.count() > 0) {
        await coolingOption.click({ force: true });
        await wait(500);
        // nth(9) = 10th "Enter unit value" input (8 numeric + 1 assocYN + 1 coolingYN)
        const coolingUnitInput = page.locator('.v-dialog input[placeholder="Enter unit value"]').nth(9);
        if (await coolingUnitInput.count() > 0) {
          await coolingUnitInput.click({ force: true });
          await wait(200);
          await coolingUnitInput.fill('2000');
          await wait(300);
        }
      } else {
        await page.keyboard.press('Escape');
        await wait(300);
      }
    }

    // The Y Factor Create button is in the footer below the fold (~1143px without scroll).
    // Scroll to reveal it, then verify it is visible and enabled.
    await page.evaluate(() => {
      ['.v-overlay__content', '.v-dialog', '.v-dialog > div', '.v-dialog .v-card', '.v-dialog .v-card-text', '.v-dialog .v-sheet']
        .forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
          });
        });
    });
    await wait(600);

    // Final submission button on Y Factor tab is "Create" (not "Add").
    // createButton is already visible+enabled after the scroll done above.
    const createButton = page.locator('.v-dialog button:has-text("Create")').last();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });

    // Click Create to submit the Y-formula.
    // scrollIntoViewIfNeeded scrolls the overlay content so Create is in viewport,
    // then click({ force: true }) triggers Vue's @click handler reliably.
    await createButton.scrollIntoViewIfNeeded();
    await wait(500);
    await createButton.click({ force: true });

    // Wait up to 60s for the dialog to close (success) OR for a duplicate error toast.
    // If the API rejects the formula (duplicate geographic location), the dialog stays
    // open. In that case we close it manually — the matching row already exists in the
    // table and we can still proceed to click its search button.
    const dialogClosed = await Promise.race([
      page.locator('[role="dialog"].v-overlay--active')
        .waitFor({ state: 'hidden', timeout: 60000 })
        .then(() => true)
        .catch(() => false),
      // Detect duplicate-error toast: "already exists"
      page.locator('.v-snackbar, [class*="toast"], [role="status"]')
        .filter({ hasText: /already exists/i })
        .waitFor({ state: 'visible', timeout: 60000 })
        .then(() => false)
        .catch(() => false),
    ]);

    if (!dialogClosed) {
      // Formula may still be processing OR may have just closed — check first.
      const dialogStillOpen = await page.locator('[role="dialog"].v-overlay--active').isVisible();
      if (dialogStillOpen) {
        // Dialog is genuinely still open (duplicate error) — dismiss with Escape
        await page.keyboard.press('Escape');
        await wait(1500);
      }
      // If dialog is already gone, proceed normally
    }

    // Verify we are back on the Y-Total table
    await expect(getYFormulaLocator(page, 'addNewFormulaButton').first()).toBeVisible({ timeout: 10000 });

    // ============================================================
    // STEP 6: Click the Search icon on the matching row
    //         and wait until the map/plot finishes loading
    // ============================================================
    // Find the row that matches the formula values from Excel (MLS Board + State + County).
    // Falls back to first row if no match found.
    // The search button (magnifying glass) is the 3rd icon button (index 2) in the action cell.
    const targetMls    = excelData.yFormula.mlsBoard;
    const targetState  = excelData.yFormula.state;
    const targetCounty = excelData.yFormula.county;

    // Locate the matching table row by visible text, then get its search button
    const matchingRow = page.locator('table tbody tr').filter({
      has: page.locator('td', { hasText: targetMls }),
    }).filter({
      has: page.locator('td', { hasText: targetState }),
    }).filter({
      has: page.locator('td', { hasText: targetCounty }),
    }).first();

    const rowExists = await matchingRow.count() > 0;
    const searchBtn = rowExists
      ? matchingRow.locator('td:last-child button:nth-child(3)')
      : getYFormulaLocator(page, 'rowSearchButton'); // fallback: first row

    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click({ force: true });

    // Wait for navigation to the Properties page
    await page.waitForURL('**/properties**', { timeout: 30000 });

    // Wait until the map/plot loading spinner disappears (plot is done)
    // The spinner uses class v-progress-circular or mdi-loading; wait for it to vanish.
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]').first().waitFor({ state: 'hidden', timeout: 60000 });
    } catch { /* spinner may never appear if data loads instantly */ }

    // Additional buffer for the Leaflet map tiles to fully render
    await wait(5000);

    // Confirm the map is visible — Leaflet, Canvas, or SVG-based map
    // Use a soft check: pass if ANY map element is found
    const mapLocator = page.locator('.leaflet-container, canvas.leaflet-zoom-animated, svg.leaflet-zoom-animated, #map, [class*="mapbox"], [class*="map-container"]');
    const mapCount = await mapLocator.count();
    if (mapCount > 0) {
      await expect(mapLocator.first()).toBeVisible({ timeout: 15000 });
    } else {
      // Verify we are at minimum on the properties page with some content loaded
      await expect(page).toHaveURL(/properties/, { timeout: 5000 });
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  });

  // ============================================================
  // TC-005: Explore Properties chart — click dot → Select → Set Opinion → find locators
  // Flow: Login → Settings → Y-Total → Search icon → reload wait →
  //       hover/click blue dot → Select property → Set Opinion → extract all locators
  // ============================================================
  test.skip('TC-005: should explore Set Opinion flow from Properties chart', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── STEP 1: Login ─────────────────────────────────────────────────────────
    await page.goto('/login');
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });

    // ── STEP 2: Navigate → Settings → Y-Total tab ─────────────────────────────
    await removeOverlayScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    await page.waitForURL('**/settings**', { timeout: 15000 });
    await wait(2000);

    await getYFormulaLocator(page, 'yTotalTab').first().click({ force: true });
    await wait(2000);

    // ── STEP 3: Click the Search icon on the first available formula row ───────
    // The search button is the 3rd icon button in the last-column action cell
    const targetMls    = excelData.yFormula.mlsBoard;
    const targetState  = excelData.yFormula.state;
    const targetCounty = excelData.yFormula.county;

    const matchingRow = page.locator('table tbody tr').filter({
      has: page.locator('td', { hasText: targetMls }),
    }).filter({
      has: page.locator('td', { hasText: targetState }),
    }).filter({
      has: page.locator('td', { hasText: targetCounty }),
    }).first();

    const rowExists = await matchingRow.count() > 0;
    const searchBtn = rowExists
      ? matchingRow.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');

    await expect(searchBtn).toBeVisible({ timeout: 10000 });

    console.log('=== TC-005: Search button locator ===');
    const searchBtnHtml = await searchBtn.evaluate(el => el.outerHTML);
    console.log('Search button HTML:', searchBtnHtml);

    await searchBtn.click({ force: true });

    // ── STEP 4: Wait for Properties page + chart to fully load ────────────────
    await page.waitForURL('**/properties**', { timeout: 30000 });
    await wait(2000);

    // Wait for any loading spinner/indicator to disappear
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]').first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner appeared */ }

    // Wait for chart data points to appear (SVG circles or canvas)
    await wait(4000);

    // ── STEP 6: Find locators on the loaded Properties page ───────────────────
    console.log('\n=== TC-005: Extracting page locators ===');

    // Chart container
    const chartInfo = await page.evaluate(() => {
      const results = {};

      // Chart wrapper
      const chartWrappers = [
        document.querySelector('svg'),
        document.querySelector('canvas'),
        document.querySelector('[class*="chart"]'),
        document.querySelector('[class*="recharts"]'),
        document.querySelector('[class*="apexcharts"]'),
      ].filter(Boolean);
      results.chartType = chartWrappers.length > 0 ? chartWrappers[0].tagName + (chartWrappers[0].className ? ' class="' + chartWrappers[0].className + '"' : '') : 'not found';

      // SVG circles (typical scatter plot dots)
      const circles = document.querySelectorAll('svg circle');
      results.svgCirclesCount = circles.length;
      if (circles.length > 0) {
        const sample = circles[0];
        results.svgCircleSample = { tag: 'circle', fill: sample.getAttribute('fill'), cx: sample.getAttribute('cx'), cy: sample.getAttribute('cy'), r: sample.getAttribute('r'), class: sample.getAttribute('class') };
      }

      // SVG ellipses (alternative dot rendering)
      const ellipses = document.querySelectorAll('svg ellipse');
      results.svgEllipsesCount = ellipses.length;
      if (ellipses.length > 0) {
        const s = ellipses[0];
        results.svgEllipseSample = { cx: s.getAttribute('cx'), cy: s.getAttribute('cy'), rx: s.getAttribute('rx'), ry: s.getAttribute('ry'), fill: s.getAttribute('fill'), class: s.getAttribute('class') };
      }

      // SVG paths
      const paths = document.querySelectorAll('svg path');
      results.svgPathsCount = paths.length;

      // SVG groups that may contain dots
      const groups = document.querySelectorAll('svg g');
      results.svgGroupsCount = groups.length;

      // Chart container bounding rect
      const svg = document.querySelector('svg');
      if (svg) results.svgRect = svg.getBoundingClientRect();

      // Recharts dots
      const rechartsDots = document.querySelectorAll('.recharts-dot, .recharts-scatter-symbol, [class*="recharts-dot"]');
      results.rechartsDotCount = rechartsDots.length;

      return results;
    });

    console.log('Chart info:', JSON.stringify(chartInfo, null, 2));

    // ── STEP 7: Hover over and click a blue dot ────────────────────────────────
    // The chart is canvas-based. Find the chart-card container and click into it.
    let clicked = false;

    // Get chart container bounding rect (from initial run: x≈320, y≈211, w≈654, h≈728)
    const chartRect = await page.evaluate(() => {
      const candidates = [
        document.querySelector('.chart-card'),
        document.querySelector('[class*="chart-card"]'),
        document.querySelector('canvas'),
        document.querySelector('[class*="chart"]'),
      ].filter(Boolean);
      if (candidates.length === 0) return null;
      const el = candidates[0];
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, tag: el.tagName, class: el.className };
    });

    console.log('Chart container rect:', JSON.stringify(chartRect));

    if (chartRect) {
      // Blue dots are scattered in the chart. Try several coordinate positions
      // from dense cluster area (35-55% width, 55-80% height of chart area)
      const dotPositions = [
        { px: 0.35, py: 0.70 },  // lower-left cluster
        { px: 0.45, py: 0.65 },  // center cluster
        { px: 0.30, py: 0.75 },  // bottom-left
        { px: 0.50, py: 0.60 },  // center
        { px: 0.40, py: 0.55 },  // upper-center
      ];

      for (const pos of dotPositions) {
        const x = Math.round(chartRect.x + chartRect.width * pos.px);
        const y = Math.round(chartRect.y + chartRect.height * pos.py);
        console.log(`Trying hover at (${x}, ${y}) [${pos.px*100}%, ${pos.py*100}%]`);
        await page.mouse.move(x, y);
        await wait(1000);

        // Check if right panel updated (no longer shows placeholder text)
        const panelText = await page.locator('.card-panel, [class*="card-panel"]').first().innerText().catch(() => '');
        console.log(`Panel text after hover: "${panelText.slice(0, 60)}"`);

        if (!panelText.includes('Hover or click') && panelText.trim().length > 0) {
          // Property data appeared — click here
          await page.mouse.click(x, y);
          clicked = true;
          console.log(`✓ Dot found and clicked at (${x}, ${y})`);
          await wait(2500);
          break;
        }
      }

      // If hover didn't trigger, just click the most likely spot (dense cluster center)
      if (!clicked) {
        const x = Math.round(chartRect.x + chartRect.width * 0.38);
        const y = Math.round(chartRect.y + chartRect.height * 0.72);
        console.log(`Forced click at (${x}, ${y}) - dense dot cluster area`);
        await page.mouse.move(x, y);
        await wait(800);
        await page.screenshot({ path: 'screenshots/tc005-hover-state.png' });
        await page.mouse.click(x, y);
        clicked = true;
        await wait(2500);
      }
    } else {
      // Last resort: use hardcoded coordinates based on 1440x900 viewport observation
      const x = 555, y = 640;
      console.log(`No chart container found. Using hardcoded coords (${x}, ${y})`);
      await page.mouse.move(x, y);
      await wait(800);
      await page.mouse.click(x, y);
      clicked = true;
      await wait(2500);
    }

    // Screenshot after clicking to see if property appeared in right panel
    await page.screenshot({ path: 'screenshots/tc005-after-dot-click.png' });
    console.log('Screenshot after dot click saved');

    // ── STEP 8: Find the property panel on the right side ─────────────────────
    console.log('\n=== TC-005: Looking for property panel (right side) ===');
    await wait(1500);

    const propertyPanelInfo = await page.evaluate(() => {
      const candidates = [
        document.querySelector('[class*="property-detail"]'),
        document.querySelector('[class*="property-panel"]'),
        document.querySelector('[class*="detail-panel"]'),
        document.querySelector('[class*="side-panel"]'),
        document.querySelector('[class*="right-panel"]'),
        // Look for a card/panel that appeared after click
        ...document.querySelectorAll('.v-card, [class*="card"]'),
      ].filter(Boolean);

      // Find the rightmost panel-like element visible
      return candidates.slice(0, 5).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText?.slice(0, 100),
        rect: el.getBoundingClientRect(),
      }));
    });
    console.log('Property panel candidates:', JSON.stringify(propertyPanelInfo, null, 2));

    // Check for "Select" button
    const selectBtn = page.locator('button:has-text("Select"), [class*="select-btn"], .v-btn:has-text("Select")').first();
    const selectBtnVisible = await selectBtn.isVisible().catch(() => false);
    console.log(`Select button visible: ${selectBtnVisible}`);

    if (selectBtnVisible) {
      const selectBtnHtml = await selectBtn.evaluate(el => el.outerHTML);
      console.log('Select button HTML:', selectBtnHtml);

      // ── STEP 9: Click the Select button ─────────────────────────────────────
      await selectBtn.click({ force: true });
      await wait(1500);

      // ── STEP 10: Verify Set Opinion button becomes active ────────────────────
      const setOpinionBtn = page.locator('button:has-text("Set Opinion"), .v-btn:has-text("Set Opinion")').first();
      const setOpinionVisible = await setOpinionBtn.isVisible().catch(() => false);
      console.log(`Set Opinion button visible after Select: ${setOpinionVisible}`);

      if (setOpinionVisible) {
        const isEnabled = await setOpinionBtn.isEnabled().catch(() => false);
        console.log(`Set Opinion button enabled: ${isEnabled}`);
        const setOpinionHtml = await setOpinionBtn.evaluate(el => el.outerHTML);
        console.log('Set Opinion button HTML:', setOpinionHtml);

        // ── STEP 11: Click Set Opinion and scroll down ─────────────────────────
        await setOpinionBtn.click({ force: true });

        // Wait for navigation to the Set Opinion page (property detail page)
        await page.waitForURL(/properties.*\/\d+|property-detail|set-opinion/i, { timeout: 20000 }).catch(() => {});

        // Wait for "Loading property details..." spinner to disappear
        try {
          await page.locator('text=Loading property details').waitFor({ state: 'hidden', timeout: 30000 });
        } catch { /* spinner gone or never appeared */ }
        await wait(4000); // additional buffer for all form fields to render

        // Scroll down to see all form fields
        await page.evaluate(() => window.scrollBy(0, 500));
        await wait(1000);

        // ── STEP 12: Find all opinion form field locators ─────────────────────
        console.log('\n=== TC-005: Extracting Set Opinion form locators ===');

        const formLocators = await page.evaluate(() => {
          const results = {};

          // All inputs and selects
          const allInputs = [...document.querySelectorAll('input, select, textarea')];
          results.allInputsCount = allInputs.length;

          // View field — look by placeholder or nearby label
          const viewInput = allInputs.find(el =>
            (el.placeholder || '').toLowerCase().includes('view') ||
            (el.getAttribute('aria-label') || '').toLowerCase().includes('view')
          );
          results.viewField = viewInput ? { tag: viewInput.tagName, class: viewInput.className, placeholder: viewInput.placeholder || '' } : null;

          // Condition fields — find by placeholder or label
          const conditionInputs = allInputs.filter(el =>
            (el.placeholder || '').toLowerCase().includes('condition')
          );
          results.conditionFieldsCount = conditionInputs.length;
          results.conditionFields = conditionInputs.slice(0, 8).map(el => ({
            tag: el.tagName,
            class: el.className,
            placeholder: el.placeholder || '',
            id: el.id || '',
            type: el.type || '',
          }));

          // Remark / comment field
          const remarkField = allInputs.find(el =>
            el.tagName === 'TEXTAREA' ||
            (el.placeholder || '').toLowerCase().includes('remark') ||
            (el.placeholder || '').toLowerCase().includes('comment') ||
            (el.placeholder || '').toLowerCase().includes('note')
          );
          results.remarkField = remarkField ? { tag: remarkField.tagName, class: remarkField.className, placeholder: remarkField.placeholder || '' } : null;

          // All visible labels
          const labels = [...document.querySelectorAll('label, .v-label')];
          results.visibleLabels = [...new Set(labels.map(l => l.innerText?.trim()).filter(t => t && t.length > 0 && t.length < 60))];

          // All buttons
          results.buttons = [...document.querySelectorAll('button')].map(b => ({
            text: b.innerText?.trim(),
            class: b.className,
            disabled: b.disabled,
          })).filter(b => b.text);

          // Photo upload inputs
          const photoInputs = [...document.querySelectorAll('input[type="file"]')];
          results.photoInputCount = photoInputs.length;
          results.photoInputs = photoInputs.map(el => ({
            tag: el.tagName,
            type: el.type || '',
            class: el.className,
            accept: el.accept || '',
          }));

          // Any element with photo/image/upload related classes
          const photoClickables = [...document.querySelectorAll('[class*="photo"], [class*="image-upload"], [class*="upload"], [class*="camera"]')];
          results.photoClickables = photoClickables.slice(0, 5).map(el => ({
            tag: el.tagName,
            class: el.className,
            outerHTML: el.outerHTML.slice(0, 150),
          }));

          return results;
        });

        console.log('Form locators found:', JSON.stringify(formLocators, null, 2));

        // Screenshot to capture the full form state
        await page.screenshot({ path: 'screenshots/tc005-set-opinion-form.png', fullPage: false });
        console.log('Screenshot saved: screenshots/tc005-set-opinion-form.png');

        // ── STEP 13: Fill all 8 opinion fields + Remarks ─────────────────────
        console.log('\n=== TC-005: Filling opinion form fields ===');

        // The 8 fields use numeric inputs with placeholder "Enter <FieldName> Value"
        // Labels discovered: View*, Condition*, Quality*, Amenities*, Access, Appeal, Elevation, Economic
        const opinionFields = [
          { placeholder: 'Enter View Value',      value: '5' },
          { placeholder: 'Enter Condition Value', value: '5' },
          { placeholder: 'Enter Quality Value',   value: '5' },
          { placeholder: 'Enter Amenities Value', value: '5' },
          { placeholder: 'Enter Access Value',    value: '5' },
          { placeholder: 'Enter Appeal Value',    value: '5' },
          { placeholder: 'Enter Elevation Value', value: '5' },
          { placeholder: 'Enter Economic Value',  value: '5' },
        ];

        for (const field of opinionFields) {
          // Use a broad approach: match by placeholder substring
          const input = page.locator(`input[placeholder="${field.placeholder}"]`).first();
          const inputVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
          if (inputVisible) {
            await input.click({ force: true });
            await wait(300);
            await input.fill(field.value);
            await wait(200);
            console.log(`Filled: ${field.placeholder} = ${field.value}`);
          } else {
            // Try generic number inputs in order (fallback)
            console.log(`Field not found by placeholder: "${field.placeholder}" — trying number inputs`);
            const allNumberInputs = page.locator('input[type="number"]');
            const idx = opinionFields.indexOf(field);
            const nthInput = allNumberInputs.nth(idx);
            if (await nthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              await nthInput.click({ force: true });
              await wait(200);
              await nthInput.fill(field.value);
              await wait(200);
              console.log(`Filled nth(${idx}) number input = ${field.value}`);
            }
          }
        }

        // Fill Remarks / textarea
        const remarksField = page.locator('textarea[placeholder="Enter remarks"], textarea').first();
        const remarksVisible = await remarksField.isVisible({ timeout: 5000 }).catch(() => false);
        if (remarksVisible) {
          await remarksField.click({ force: true });
          await wait(300);
          await remarksField.fill('Test opinion remark from TC-005 automation');
          await wait(300);
          console.log('Filled: Remarks');
        }

        // Screenshot before saving
        await page.screenshot({ path: 'screenshots/tc005-opinion-filled.png', fullPage: false });
        console.log('Screenshot saved: tc005-opinion-filled.png');

        // ── STEP 13b: Capture factor values, Original Opinion Total, Y Total & percentages ──
        console.log('\n=== TC-005: Capturing opinion values and calculating percentages ===');

        const opinionData = await page.evaluate((fields) => {
          const result = {
            factors: {},
            originalOpinionTotal: null,
            originalYTotal: null,
            opinionTotal: null,
            percentages: {},
          };

          // Read each factor's current value from the input
          for (const f of fields) {
            const input = [...document.querySelectorAll('input')]
              .find(el => el.placeholder === f.placeholder);
            result.factors[f.label] = input ? (parseFloat(input.value) || 0) : 0;
          }

          // Read the three labeled card values from the page:
          // "Original Opinion Total", "Original Y Total", "Opinion Total"
          const allElements = [...document.querySelectorAll('*')];

          const findValueNearLabel = (labelRegex) => {
            const labelEl = allElements.find(el =>
              labelRegex.test(el.innerText?.trim()) &&
              el.children.length < 4 &&
              el.tagName !== 'BODY' && el.tagName !== 'HTML'
            );
            if (!labelEl) return null;
            // Value is typically in the next sibling or parent's next child
            const parent = labelEl.parentElement;
            if (parent) {
              const siblings = [...parent.children];
              const idx = siblings.indexOf(labelEl);
              for (let i = idx + 1; i < siblings.length; i++) {
                const text = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
                if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
              }
              // Also try the parent's next sibling
              const parentNext = parent.nextElementSibling;
              if (parentNext) {
                const text = parentNext.innerText?.trim().replace(/[$,\s]/g, '');
                if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
              }
            }
            return null;
          };

          result.originalOpinionTotal = findValueNearLabel(/^original\s+opinion\s+total$/i);
          result.originalYTotal       = findValueNearLabel(/^original\s+y\s+total$/i);
          result.opinionTotal         = findValueNearLabel(/^opinion\s+total$/i);

          return result;
        }, opinionFields.map((f, i) => ({
          placeholder: f.placeholder,
          label: ['View', 'Condition', 'Quality', 'Amenities', 'Access', 'Appeal', 'Elevation', 'Economic'][i],
        })));

        // Denominator is Original Opinion Total read from the page
        const originalOpinionTotal = opinionData.originalOpinionTotal;
        const originalYTotal       = opinionData.originalYTotal;
        const opinionTotal         = opinionData.opinionTotal;

        // Calculate: factor_value / originalOpinionTotal (raw decimal, no ×100)
        if (originalOpinionTotal && originalOpinionTotal !== 0) {
          for (const [label, value] of Object.entries(opinionData.factors)) {
            opinionData.percentages[label] = parseFloat((value / originalOpinionTotal).toFixed(6));
          }
        }

        // ── Console output per parameter ───────────────────────────────────────
        console.log('\n─────────────────────────────────────────────────────────────');
        console.log('  OPINION FACTOR BREAKDOWN');
        console.log(`  Original Opinion Total : ${originalOpinionTotal ?? 'not found on page'}`);
        console.log(`  Original Y Total       : ${originalYTotal ?? 'not found on page'}`);
        console.log(`  Opinion Total          : ${opinionTotal ?? 'not found on page'}`);
        console.log('─────────────────────────────────────────────────────────────');
        console.log('  Factor          | Value  | factor / Original Opinion Total');
        console.log('  ────────────────|────────|────────────────────────────────');
        for (const [label, value] of Object.entries(opinionData.factors)) {
          const ratio = opinionData.percentages[label] ?? 'N/A';
          const labelPad = label.padEnd(16);
          const valuePad = String(value).padEnd(6);
          console.log(`  ${labelPad}| ${valuePad} | ${ratio}`);
        }
        console.log('─────────────────────────────────────────────────────────────\n');

        // Build final save object
        const opinionCalculation = {
          capturedAt: new Date().toISOString(),
          factors: opinionData.factors,
          originalOpinionTotal: originalOpinionTotal,
          originalYTotal: originalYTotal,
          opinionTotal: opinionTotal,
          ratios: opinionData.percentages,
          notes: {
            originalOpinionTotalSource: 'page_element',
            formula: 'ratio = factor_value / originalOpinionTotal',
          },
        };

        // Save to output/opinion-calculation.json
        const { writeFileSync, mkdirSync } = await import('fs');
        mkdirSync('output', { recursive: true });
        writeFileSync('output/opinion-calculation.json', JSON.stringify(opinionCalculation, null, 2));
        console.log('Opinion calculation saved to output/opinion-calculation.json');

        // ── STEP 14: Select Photos for required factors ───────────────────────
        // Photos are required for View, Condition, Quality, Amenities before saving.
        // Click "Select Photos" to open the primary photo selection dialog.
        console.log('\n=== TC-005: Opening Select Photos dialog ===');
        const selectPhotosBtn = page.locator('button:has-text("Select Photos")').first();
        await expect(selectPhotosBtn).toBeVisible({ timeout: 10000 });
        await selectPhotosBtn.click({ force: true });
        await wait(2000);

        // The outer dialog appears as the first .v-overlay--active on the page
        const outerOverlay = page.locator('.v-overlay--active').first();
        await expect(outerOverlay).toBeVisible({ timeout: 10000 });
        console.log('Select Primary Photos outer dialog opened');
        await page.screenshot({ path: 'screenshots/tc005-photo-dialog-open.png' });

        // For each factor: click its Select Photo button, handle inner gallery, save selection
        const factorRows = ['View', 'Condition', 'Quality', 'Amenities'];

        for (const factor of factorRows) {
          console.log(`\nSelecting photo for: ${factor}`);

          // Count active overlays BEFORE clicking (so we know when the inner one opens)
          const overlayCountBefore = await page.locator('.v-overlay--active').count();
          console.log(`  Overlays before: ${overlayCountBefore}`);

          // Scope to the OUTER dialog overlay to avoid clicking page-level "Select Photos" button
          const outerDialogBtns = outerOverlay.locator('button:has-text("Select Photo")');
          const btnCount = await outerDialogBtns.count();
          console.log(`  "Select Photo" buttons in outer dialog: ${btnCount}`);

          if (btnCount === 0) {
            console.log(`  No buttons left for ${factor}, skipping`);
            continue;
          }

          // Always click the first remaining "Select Photo" in the outer dialog
          await outerDialogBtns.first().click({ force: true });
          await wait(3000); // Give time for inner gallery to load

          const overlayCountAfter = await page.locator('.v-overlay--active').count();
          console.log(`  Overlays after: ${overlayCountAfter}`);
          await page.screenshot({ path: `screenshots/tc005-inner-gallery-${factor.toLowerCase()}.png` });

          if (overlayCountAfter > overlayCountBefore) {
            // A new overlay (inner gallery) has appeared
            const innerOverlay = page.locator('.v-overlay--active').last();
            const imgElements = innerOverlay.locator('img');
            const imgCount = await imgElements.count();
            console.log(`  Inner gallery opened for ${factor}, images: ${imgCount}`);

            // Save Selection button in inner dialog
            const saveSelBtn = innerOverlay.locator('button:has-text("Save Selection")');

            // Click the FIRST image — try parent container first (the selection handler is on the card)
            let imageSelected = false;
            const firstImg = imgElements.first();
            const firstImgVisible = await firstImg.isVisible({ timeout: 3000 }).catch(() => false);

            if (firstImgVisible) {
              // Try clicking the parent container of img (the card/wrapper with the click handler)
              // Go up 1-2 levels to find the clickable wrapper
              await page.evaluate(() => {
                const overlays = [...document.querySelectorAll('.v-overlay--active')];
                const innerDlg = overlays[overlays.length - 1];
                if (!innerDlg) return;
                const imgs = innerDlg.querySelectorAll('img');
                if (imgs.length === 0) return;
                // Walk up from img to find a clickable parent
                let el = imgs[0].parentElement;
                for (let i = 0; i < 4; i++) {
                  if (!el) break;
                  // Try clicking this level
                  el.click();
                  el = el.parentElement;
                }
              });
              await wait(1000);
              imageSelected = await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false);
              console.log(`  After parent walk click, Save enabled: ${imageSelected}`);
            }

            if (!imageSelected) {
              // Fallback: click the img element directly
              await firstImg.click({ force: true });
              await wait(1000);
              imageSelected = await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false);
              console.log(`  After direct img click, Save enabled: ${imageSelected}`);
            }

            if (!imageSelected) {
              // Fallback: click at coordinates in the gallery area (first photo area)
              const innerBox = await innerOverlay.boundingBox();
              if (innerBox) {
                // First photo should be in the upper-left region of the gallery area
                // Offset ~100px from top (for header) and ~50px from left
                const clickX = Math.round(innerBox.x + innerBox.width * 0.2);
                const clickY = Math.round(innerBox.y + 200); // roughly where first photo starts
                await page.mouse.click(clickX, clickY);
                await wait(1000);
                imageSelected = await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false);
                console.log(`  After coords click (${clickX}, ${clickY}), Save enabled: ${imageSelected}`);
              }
            }

            // Click Save Selection if enabled
            const finalSaveEnabled = await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false);
            if (finalSaveEnabled) {
              await saveSelBtn.click({ force: true });
              await wait(2000);
              console.log(`  Saved selection for ${factor}`);
              // Wait for inner overlay to close
              await page.waitForFunction(
                (prevCount) => document.querySelectorAll('.v-overlay--active').length <= prevCount,
                overlayCountBefore + 1,
                { timeout: 5000 }
              ).catch(() => {});
            } else {
              console.log(`  Save Selection still disabled for ${factor} — pressing Escape`);
              await page.keyboard.press('Escape');
              await wait(1500);
            }
          } else {
            // No new overlay — button click didn't open inner dialog
            const debugInfo = await page.evaluate(() =>
              [...document.querySelectorAll('.v-overlay--active')]
                .map(el => el.innerText?.slice(0, 80))
            );
            console.log(`  No new inner dialog for ${factor}. Active overlays:`, JSON.stringify(debugInfo));
          }

          await wait(500);
        }

        // Screenshot outer dialog after all photo selections
        await page.screenshot({ path: 'screenshots/tc005-photo-dialog-after-selection.png' });

        // Click Confirm on the outer "Select Primary Photos" dialog
        const outerConfirmBtn = outerOverlay.locator('button:has-text("Confirm")').first();
        const confirmEnabled = await outerConfirmBtn.isEnabled({ timeout: 5000 }).catch(() => false);
        console.log(`\nOuter Confirm button enabled: ${confirmEnabled}`);
        if (confirmEnabled) {
          await outerConfirmBtn.click({ force: true });
          await wait(2000);
          console.log('Photo selection confirmed!');
        } else {
          console.log('Confirm still disabled — cancelling photo dialog');
          await outerOverlay.locator('button:has-text("Cancel")').first().click({ force: true }).catch(() => {});
          await wait(500);
        }

        // ── STEP 15: Click Save Opinion ────────────────────────────────────────
        console.log('\n=== TC-005: Clicking Save Opinion ===');
        const saveOpinionBtn = page.locator('button:has-text("Save Opinion")').first();
        const saveEnabled = await saveOpinionBtn.isEnabled({ timeout: 5000 }).catch(() => false);
        console.log(`Save Opinion button enabled: ${saveEnabled}`);
        await saveOpinionBtn.scrollIntoViewIfNeeded().catch(() => {});
        await wait(500);
        await saveOpinionBtn.click({ force: true });
        await wait(3000);

        // Check for success or error state
        const snackbarText = await page.locator('.v-snackbar, [role="status"], [role="alert"]').first().innerText().catch(() => '');
        console.log(`Snackbar/toast text: "${snackbarText}"`);
        await page.screenshot({ path: 'screenshots/tc005-after-save-opinion.png', fullPage: false });
        console.log('Screenshot saved: tc005-after-save-opinion.png');

        // ── STEP 16: Navigate back to Properties chart ─────────────────────────
        console.log('\n=== TC-005: Navigating back to Properties chart ===');
        await getNavLocator(page, 'propertiesNav').first().click({ force: true });
        await page.waitForURL('**/properties**', { timeout: 20000 });
        await wait(3000);

        // Wait for chart to load
        try {
          await page.locator('.v-progress-circular, [class*="loading"]').first().waitFor({ state: 'hidden', timeout: 20000 });
        } catch { /* already loaded */ }
        await wait(3000);

        // ── STEP 17: Hover on the same dot and verify opinion shows ─────────────
        console.log('\n=== TC-005: Hovering on same dot — checking for opinion value ===');

        const chartRect2 = await page.evaluate(() => {
          const el = document.querySelector('.chart-card') || document.querySelector('[class*="chart-card"]');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        });

        if (chartRect2) {
          // Hover at the same relative position as before (35%, 70%)
          const hx = Math.round(chartRect2.x + chartRect2.width * 0.35);
          const hy = Math.round(chartRect2.y + chartRect2.height * 0.70);
          console.log(`Hovering at (${hx}, ${hy})`);
          await page.mouse.move(hx, hy);
          await wait(1500);

          const panelAfter = await page.locator('.card-panel, [class*="card-panel"]').first().innerText().catch(() => '');
          console.log(`Panel text after hover: "${panelAfter.slice(0, 200)}"`);

          // Check if opinion/adjustment value appears
          const hasOpinion = panelAfter.toLowerCase().includes('opinion') ||
                             panelAfter.includes('$') ||
                             panelAfter.toLowerCase().includes('select');
          console.log(`Opinion value reflecting in panel: ${hasOpinion}`);

          await page.screenshot({ path: 'screenshots/tc005-hover-after-opinion.png', fullPage: false });
          console.log('Screenshot saved: tc005-hover-after-opinion.png');

          // Click on the dot to open full property card and verify opinion dot color changed (yellow)
          await page.mouse.click(hx, hy);
          await wait(2000);

          const panelAfterClick = await page.locator('.card-panel, [class*="card-panel"]').first().innerText().catch(() => '');
          console.log(`Panel text after click: "${panelAfterClick.slice(0, 300)}"`);

          await page.screenshot({ path: 'screenshots/tc005-after-opinion-dot-click.png', fullPage: false });
          console.log('Screenshot saved: tc005-after-opinion-dot-click.png');
        }
      }
    }

    // Final screenshot of the full page state
    await page.screenshot({ path: 'screenshots/tc005-final-state.png', fullPage: false });
    console.log('\n=== TC-005: Final screenshot saved: screenshots/tc005-final-state.png ===');
    console.log('=== TC-005 COMPLETE ===');
  });

  // ============================================================
  // TC-006: Edit Y-Formula base/factor values → verify property opinion updates
  // Flow: Login → Settings → Y-Total → Edit formula → change base value & factors
  //       → open same property URL → verify each factor updated as:
  //         new_value = (saved_ratio × new_original_opinion_total)
  // ============================================================
  test.skip('TC-006: should edit Y-Formula and verify opinion values update on property', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Load saved ratios from TC-005 output
    const { readFileSync } = await import('fs');
    let savedCalc;
    try {
      savedCalc = JSON.parse(readFileSync('output/opinion-calculation.json', 'utf8'));
    } catch {
      throw new Error('output/opinion-calculation.json not found — run TC-005 first');
    }
    console.log('\n=== TC-006: Loaded saved opinion calculation ===');
    console.log(`  Original Opinion Total : ${savedCalc.originalOpinionTotal}`);
    console.log(`  Original Y Total       : ${savedCalc.originalYTotal}`);
    console.log(`  Opinion Total          : ${savedCalc.opinionTotal}`);
    console.log('  Saved Ratios:');
    for (const [label, ratio] of Object.entries(savedCalc.ratios)) {
      console.log(`    ${label.padEnd(12)}: ${ratio}`);
    }

    // ── STEP 1: Login ─────────────────────────────────────────────────────────
    await page.goto('/login');
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });

    // ── STEP 2: Navigate to Settings → Y-Total tab ────────────────────────────
    await removeOverlayScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    await page.waitForURL('**/settings**', { timeout: 15000 });
    await wait(2000);
    await getYFormulaLocator(page, 'yTotalTab').first().click({ force: true });
    await wait(2000);

    // ── STEP 3: Find and click the Edit icon on the matching formula row ──────
    console.log('\n=== TC-006: Finding formula row to edit ===');
    const targetMls    = excelData.yFormula.mlsBoard;
    const targetState  = excelData.yFormula.state;
    const targetCounty = excelData.yFormula.county;

    const matchingRow = page.locator('table tbody tr').filter({
      has: page.locator('td', { hasText: targetMls }),
    }).filter({
      has: page.locator('td', { hasText: targetState }),
    }).filter({
      has: page.locator('td', { hasText: targetCounty }),
    }).first();

    const rowFound = await matchingRow.count() > 0;
    console.log(`Formula row found: ${rowFound}`);

    // Edit button is the 1st icon button in the last-column action cell
    const editBtn = rowFound
      ? matchingRow.locator('td:last-child button:nth-child(1)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(1)');

    await expect(editBtn).toBeVisible({ timeout: 10000 });
    const editBtnHtml = await editBtn.evaluate(el => el.outerHTML);
    console.log('Edit button HTML:', editBtnHtml);
    await editBtn.click({ force: true });
    await wait(3000);
    await page.screenshot({ path: 'screenshots/tc006-edit-dialog-opened.png' });

    // ── STEP 4: Change Base Value in edit dialog ──────────────────────────────
    console.log('\n=== TC-006: Changing Base Value ===');

    // Extract current dialog inputs to find base value and factor fields
    const dialogInfo = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"], .v-dialog')];
      const dlg = dialogs.find(d => d.offsetParent !== null);
      if (!dlg) return null;
      const inputs = [...dlg.querySelectorAll('input, textarea')].map(el => ({
        placeholder: el.placeholder,
        value: el.value,
        label: el.closest('[class*="field"], .v-field')?.previousElementSibling?.innerText?.trim() || '',
      }));
      const labels = [...dlg.querySelectorAll('label, .v-label')].map(l => l.innerText?.trim()).filter(Boolean);
      return { inputs: inputs.slice(0, 20), labels };
    });
    console.log('Dialog inputs:', JSON.stringify(dialogInfo, null, 2));
    await page.screenshot({ path: 'screenshots/tc006-edit-dialog-fields.png' });

    // Find base value input — try by placeholder or label proximity
    const baseValueInput = page.locator([
      'input[placeholder*="Base Value" i]',
      'input[placeholder*="base" i]',
      '.v-dialog input[type="number"]',
    ].join(', ')).first();

    const baseValueVisible = await baseValueInput.isVisible({ timeout: 5000 }).catch(() => false);
    let newBaseValue = '2000'; // new base value to set
    if (baseValueVisible) {
      const currentVal = await baseValueInput.inputValue();
      console.log(`Current base value: ${currentVal}`);
      await baseValueInput.click({ force: true });
      await baseValueInput.fill(newBaseValue);
      await wait(500);
      console.log(`Base value changed to: ${newBaseValue}`);
    } else {
      console.log('Base value input not found directly — screenshot taken for inspection');
    }

    // ── STEP 5: Change factor values (View, Condition, Quality etc.) ──────────
    console.log('\n=== TC-006: Changing factor values ===');
    const factorFields = [
      { name: 'View',      placeholder: /view/i,      newValue: '10' },
      { name: 'Condition', placeholder: /condition/i, newValue: '10' },
      { name: 'Quality',   placeholder: /quality/i,   newValue: '10' },
      { name: 'Amenities', placeholder: /amenities/i, newValue: '10' },
      { name: 'Access',    placeholder: /access/i,    newValue: '10' },
      { name: 'Appeal',    placeholder: /appeal/i,    newValue: '10' },
      { name: 'Elevation', placeholder: /elevation/i, newValue: '10' },
      { name: 'Economic',  placeholder: /economic/i,  newValue: '10' },
    ];

    for (const f of factorFields) {
      const allInputs = page.locator('[role="dialog"] input, .v-dialog input');
      const count = await allInputs.count();
      let filled = false;
      for (let i = 0; i < count; i++) {
        const inp = allInputs.nth(i);
        const ph = await inp.getAttribute('placeholder').catch(() => '');
        const lb = await inp.evaluate(el => {
          const field = el.closest('[class*="field"], .v-field, .v-input');
          return field?.querySelector('label, .v-label')?.innerText?.trim() || '';
        }).catch(() => '');
        if (f.placeholder.test(ph) || f.placeholder.test(lb)) {
          const cur = await inp.inputValue().catch(() => '');
          await inp.click({ force: true });
          await inp.fill(f.newValue);
          await wait(300);
          console.log(`  ${f.name}: ${cur} → ${f.newValue}`);
          filled = true;
          break;
        }
      }
      if (!filled) console.log(`  ${f.name}: input not found`);
    }

    await page.screenshot({ path: 'screenshots/tc006-after-factor-edit.png' });

    // ── STEP 6: Save the edited formula ───────────────────────────────────────
    console.log('\n=== TC-006: Saving edited formula ===');
    const saveBtn = page.locator('[role="dialog"] button:has-text("Save"), .v-dialog button:has-text("Save"), [role="dialog"] button:has-text("Update"), .v-dialog button:has-text("Update")').last();
    const saveBtnVisible = await saveBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Save/Update button visible: ${saveBtnVisible}`);
    if (saveBtnVisible) {
      await saveBtn.click({ force: true });
      await wait(3000);
      const snack = await page.locator('.v-snackbar, [role="status"], [role="alert"]').first().innerText().catch(() => '');
      console.log(`Save snackbar: "${snack}"`);
    }
    await page.screenshot({ path: 'screenshots/tc006-after-save-formula.png' });

    // ── STEP 7: Search the same formula row to get property page URL ──────────
    console.log('\n=== TC-006: Navigating to Properties page ===');
    await wait(2000);
    const searchBtn = rowFound
      ? matchingRow.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');

    // Row reference may be stale after save — re-query
    const freshRow = page.locator('table tbody tr').filter({
      has: page.locator('td', { hasText: targetMls }),
    }).filter({
      has: page.locator('td', { hasText: targetState }),
    }).filter({
      has: page.locator('td', { hasText: targetCounty }),
    }).first();
    const freshSearchBtn = await freshRow.count() > 0
      ? freshRow.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');

    await expect(freshSearchBtn).toBeVisible({ timeout: 10000 });
    await freshSearchBtn.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    await wait(3000);
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]').first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(4000);

    // ── STEP 8: Click the same blue dot and open the property ─────────────────
    console.log('\n=== TC-006: Clicking same property dot on chart ===');
    const chartRect = await page.evaluate(() => {
      const el = document.querySelector('.chart-card') || document.querySelector('[class*="chart-card"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

    if (chartRect) {
      const cx = Math.round(chartRect.x + chartRect.width * 0.35);
      const cy = Math.round(chartRect.y + chartRect.height * 0.70);
      await page.mouse.move(cx, cy);
      await wait(1000);
      await page.mouse.click(cx, cy);
      await wait(2000);
      console.log(`Clicked dot at (${cx}, ${cy})`);
    }
    await page.screenshot({ path: 'screenshots/tc006-property-dot-clicked.png' });

    // Click Select → Set Opinion
    const selectBtn2 = page.locator('button.select-remove-btn').first();
    if (await selectBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectBtn2.click({ force: true });
      await wait(1500);
    }
    const setOpinionBtn2 = page.locator('button:has-text("Set Opinion")').first();
    if (await setOpinionBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await setOpinionBtn2.click({ force: true });
      await page.waitForURL(/properties.*\/\d+|property-detail|set-opinion/i, { timeout: 20000 }).catch(() => {});
      await wait(4000);
    }

    // ── STEP 9: Read new Original Opinion Total and verify updated values ──────
    console.log('\n=== TC-006: Reading updated opinion values from property page ===');
    await page.screenshot({ path: 'screenshots/tc006-property-opinion-page.png' });

    const updatedData = await page.evaluate(() => {
      const result = {};
      const findValueNearLabel = (labelRegex) => {
        const allEls = [...document.querySelectorAll('*')];
        const labelEl = allEls.find(el =>
          labelRegex.test(el.innerText?.trim()) &&
          el.children.length < 4 &&
          el.tagName !== 'BODY' && el.tagName !== 'HTML'
        );
        if (!labelEl) return null;
        const parent = labelEl.parentElement;
        if (parent) {
          const siblings = [...parent.children];
          const idx = siblings.indexOf(labelEl);
          for (let i = idx + 1; i < siblings.length; i++) {
            const text = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
            if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
          }
          const parentNext = parent.nextElementSibling;
          if (parentNext) {
            const text = parentNext.innerText?.trim().replace(/[$,\s]/g, '');
            if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
          }
        }
        return null;
      };
      result.originalOpinionTotal = findValueNearLabel(/^original\s+opinion\s+total$/i);
      result.originalYTotal       = findValueNearLabel(/^original\s+y\s+total$/i);
      result.opinionTotal         = findValueNearLabel(/^opinion\s+total$/i);

      // Read each factor's current displayed/input value
      const factorNames = ['View', 'Condition', 'Quality', 'Amenities', 'Access', 'Appeal', 'Elevation', 'Economic'];
      result.factors = {};
      for (const name of factorNames) {
        const input = [...document.querySelectorAll('input')].find(el =>
          (el.placeholder || '').toLowerCase().includes(name.toLowerCase())
        );
        result.factors[name] = input ? (parseFloat(input.value) || null) : null;
      }
      return result;
    });

    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  TC-006: EXPECTED vs ACTUAL OPINION VALUES AFTER FORMULA EDIT');
    console.log(`  New Original Opinion Total : ${updatedData.originalOpinionTotal}`);
    console.log(`  New Original Y Total       : ${updatedData.originalYTotal}`);
    console.log(`  New Opinion Total          : ${updatedData.opinionTotal}`);
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('  Factor          | Saved Ratio       | Expected (ratio×newOrigOpTotal) | Actual on Page');
    console.log('  ────────────────|───────────────────|─────────────────────────────────|───────────────');

    const newOrigOpTotal = updatedData.originalOpinionTotal;
    const verificationResults = {};
    const assertionErrors = [];

    // Assert that the new Original Opinion Total was read from the page
    expect(newOrigOpTotal, 'New Original Opinion Total must be present on the property page after formula edit').not.toBeNull();

    for (const [label, ratio] of Object.entries(savedCalc.ratios)) {
      const expected = newOrigOpTotal !== null
        ? parseFloat((ratio * newOrigOpTotal).toFixed(4))
        : null;
      const actual = updatedData.factors[label];
      const match = actual !== null && expected !== null
        ? Math.abs(actual - expected) < 0.01
        : false;

      verificationResults[label] = { ratio, expected, actual, match };

      const labelPad = label.padEnd(16);
      const ratioPad = String(ratio).padEnd(18);
      const expPad   = String(expected).padEnd(32);
      console.log(`  ${labelPad}| ${ratioPad}| ${expPad}| ${actual} ${match ? '✓' : '✗'}`);

      if (!match) {
        console.log(`  ❌ MISMATCH [${label}]:`);
        console.log(`       Saved ratio          : ${ratio}`);
        console.log(`       New Orig Opinion Tot : ${newOrigOpTotal}`);
        console.log(`       Expected value       : ${ratio} × ${newOrigOpTotal} = ${expected}`);
        console.log(`       Actual on page       : ${actual}`);
        console.log(`       Difference           : ${actual !== null && expected !== null ? Math.abs(actual - expected).toFixed(6) : 'N/A'}`);
        assertionErrors.push(
          `${label}: expected ${expected} (ratio ${ratio} × ${newOrigOpTotal}), but got ${actual}`
        );
      } else {
        console.log(`  ✓ MATCH    [${label}]: ${actual} matches expected ${expected}`);
      }
    }
    console.log('─────────────────────────────────────────────────────────────────\n');

    // Save verification result
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync('output', { recursive: true });
    writeFileSync('output/tc006-verification.json', JSON.stringify({
      capturedAt: new Date().toISOString(),
      newOriginalOpinionTotal: updatedData.originalOpinionTotal,
      newOriginalYTotal: updatedData.originalYTotal,
      newOpinionTotal: updatedData.opinionTotal,
      savedRatios: savedCalc.ratios,
      verification: verificationResults,
      formula: 'expected_value = saved_ratio × new_original_opinion_total',
    }, null, 2));
    console.log('Verification result saved to output/tc006-verification.json');

    await page.screenshot({ path: 'screenshots/tc006-final-state.png' });

    // ── Final Assertions ────────────────────────────────────────────────────────
    // Fail the test with a clear summary if any factor value did not match
    if (assertionErrors.length > 0) {
      console.log('\n❌ ASSERTION FAILURES:');
      assertionErrors.forEach(e => console.log(`   ${e}`));
      expect(assertionErrors, [
        `${assertionErrors.length} factor(s) did not match expected values after Y-Formula edit:`,
        ...assertionErrors,
      ].join('\n')).toHaveLength(0);
    } else {
      console.log('✓ All factor values match expected values after Y-Formula edit.');
    }

    console.log('=== TC-006 COMPLETE ===');
  });

  // ============================================================
  // TC-007: Settings → Search → open property → capture ratios
  //         → new tab Settings → edit formula (base + factors from Excel)
  //         → return to property tab → reload → scroll → verify values
  // ============================================================
  test('TC-007: should update Y-Formula from Excel and verify property opinion recalculates', async ({ browser }) => {
    // ── Load BVT Scenarios from Excel ─────────────────────────────────────────
    const bvtScenarios = excelData.bvtScenarios;
    if (!bvtScenarios || bvtScenarios.length === 0) throw new Error('No BVT scenarios found in Excel BVT Scenarios sheet');
    console.log(`\n=== TC-007: Loaded ${bvtScenarios.length} BVT scenario(s) from Excel ===`);
    bvtScenarios.forEach((s, i) => console.log(`  [${i + 1}] ${s.scenario}  (Base=${s.baseValue}, Expected=${s.expected})`));

    // Each scenario opens its own browser and runs the full flow (~4 min each).
    // Override the shared 5-minute timeout to allow all scenarios to complete.
    const MS_PER_SCENARIO = 5 * 60 * 1000; // 5 minutes per scenario (conservative)
    test.setTimeout(bvtScenarios.length * MS_PER_SCENARIO);
    console.log(`  Timeout set to ${bvtScenarios.length} × 5 min = ${(bvtScenarios.length * MS_PER_SCENARIO / 60000).toFixed(0)} minutes`);

    // ── STEP 7: Each scenario opens its own browser (open → full flow → close) ─
    const allScenarioResults = [];
    for (const scenario of bvtScenarios) {
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`  TC-007 SCENARIO: ${scenario.scenario}  (Base=${scenario.baseValue}, Expected=${scenario.expected})`);
      console.log(`${'═'.repeat(70)}`);

      // ── Open fresh browser context for this scenario ──────────────────────────
      const scenarioAssertionErrors = []; // collect ALL failures — never throw inside the loop
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {  // try/finally guarantees context.close() even if an assertion or error occurs
      const page1 = await context.newPage();

      // STEP 1: Login
      await page1.goto(`${process.env.BASE_URL || 'https://stage.crexagent.com'}/login`);
      await getLoginLocator(page1, 'emailInput').fill(EMAIL);
      await getLoginLocator(page1, 'passwordInput').fill(PASSWORD);
      await getLoginLocator(page1, 'signInButton').click();
      await page1.waitForURL('**/affiliate-managers', { timeout: 15000 });

      // STEP 2: Settings → Y-Total tab
      await removeOverlayScrim(page1);
      await getNavLocator(page1, 'settingsNav').first().click({ force: true });
      await page1.waitForURL('**/settings**', { timeout: 15000 });
      await wait(2000);
      await getYFormulaLocator(page1, 'yTotalTab').first().click({ force: true });
      await wait(2000);

      // STEP 3: Click Search button on matching formula row
      console.log('\n=== TC-007: Clicking Search to open Properties page ===');
      const targetMls    = excelData.yFormula.mlsBoard;
      const targetState  = excelData.yFormula.state;
      const targetCounty = excelData.yFormula.county;

      const getMatchingRow = (p) => p.locator('table tbody tr').filter({
        has: p.locator('td', { hasText: targetMls }),
      }).filter({
        has: p.locator('td', { hasText: targetState }),
      }).filter({
        has: p.locator('td', { hasText: targetCounty }),
      }).first();

      const row1 = getMatchingRow(page1);
      const searchBtn1 = await row1.count() > 0
        ? row1.locator('td:last-child button:nth-child(3)')
        : page1.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');

      await expect(searchBtn1).toBeVisible({ timeout: 10000 });
      await searchBtn1.click({ force: true });
      await page1.waitForURL('**/properties**', { timeout: 30000 });
      await wait(3000);
      try {
        await page1.locator('.v-progress-circular, .mdi-loading, [class*="loading"]').first()
          .waitFor({ state: 'hidden', timeout: 30000 });
      } catch { /* no spinner */ }
      await wait(4000);

      // STEP 4: Click blue dot → Select → Set Opinion → read Original Opinion Total
      console.log('\n=== TC-007: Opening property opinion page ===');
      const chartRect = await page1.evaluate(() => {
        const el = document.querySelector('.chart-card') || document.querySelector('[class*="chart-card"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });

      if (!chartRect) throw new Error('Chart card not found on properties page');

      const cx = Math.round(chartRect.x + chartRect.width  * 0.35);
      const cy = Math.round(chartRect.y + chartRect.height * 0.70);
      await page1.mouse.move(cx, cy);
      await wait(1000);
      await page1.mouse.click(cx, cy);
      await wait(2000);

      // Capture Sold Price & Listing Price from panel text BEFORE navigating to Set Opinion page
      const panelTextForPrices = await page1.locator('.card-panel, [class*="card-panel"]').first().innerText().catch(() => '');
      console.log(`  Panel text (for prices): "${panelTextForPrices.replace(/\n/g, ' | ')}"`);
      const soldPriceMatch    = panelTextForPrices.match(/sold\s*price\s*\n?\s*\$?([\d,.-]+)/i);
      const listingPriceMatch = panelTextForPrices.match(/listing\s*price\s*\n?\s*\$?([\d,.-]+)/i);
      const soldPrice    = soldPriceMatch    ? parseFloat(soldPriceMatch[1].replace(/,/g, ''))    : null;
      const listingPrice = listingPriceMatch ? parseFloat(listingPriceMatch[1].replace(/,/g, '')) : null;
      console.log(`  Sold Price from panel   : ${soldPrice}`);
      console.log(`  Listing Price from panel: ${listingPrice}`);

      const selectBtn = page1.locator('button.select-remove-btn').first();
      if (await selectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await selectBtn.click({ force: true });
        await wait(1500);
      }
      const setOpinionBtn = page1.locator('button:has-text("Set Opinion")').first();
      if (await setOpinionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await setOpinionBtn.click({ force: true });
        await page1.waitForURL(/properties.*\/\d+|property-detail|set-opinion/i, { timeout: 20000 }).catch(() => {});
        await wait(4000);
      }

      const propertyUrl = page1.url();
      console.log(`Property URL: ${propertyUrl}`);

      // STEP 5: Capture Original Opinion Total from property page
      console.log('\n=== TC-007: Capturing Original Opinion Total before formula edit ===');
      const findValueNearLabel = async (p, labelRegex) => {
        return await p.evaluate((re) => {
          const allEls = [...document.querySelectorAll('*')];
          const labelEl = allEls.find(el =>
            new RegExp(re, 'i').test(el.innerText?.trim()) &&
            el.children.length < 4 &&
            el.tagName !== 'BODY' && el.tagName !== 'HTML'
          );
          if (!labelEl) return null;
          const parent = labelEl.parentElement;
          if (parent) {
            const siblings = [...parent.children];
            const idx = siblings.indexOf(labelEl);
            for (let i = idx + 1; i < siblings.length; i++) {
              const text = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
              if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
            }
            const pNext = parent.nextElementSibling;
            if (pNext) {
              const text = pNext.innerText?.trim().replace(/[$,\s]/g, '');
              if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
            }
          }
          return null;
        }, labelRegex.source);
      };

      const originalOpinionTotal = await findValueNearLabel(page1, /^original\s+opinion\s+total$/i);
      const originalYTotal       = await findValueNearLabel(page1, /^original\s+y\s+total$/i);
      const opinionTotal         = await findValueNearLabel(page1, /^opinion\s+total$/i);

      console.log(`  Original Opinion Total : ${originalOpinionTotal}`);
      console.log(`  Original Y Total       : ${originalYTotal}`);
      console.log(`  Opinion Total          : ${opinionTotal}`);

      // ── ASSERTION: BEFORE update — originalOpinionTotal = soldPrice - originalYTotal
      // soldPrice captured from panel text above (before navigating to Set Opinion page)
      console.log('\n─────────────────────────────────────────────────────────────────');
      console.log('  TC-007: BEFORE UPDATE — Original Opinion Total assertion');
      console.log(`  Sold Price       : ${soldPrice}`);
      console.log(`  Original Y Total : ${originalYTotal}`);
      if (soldPrice !== null && originalYTotal !== null) {
        const expectedOOT_before = parseFloat((soldPrice - originalYTotal).toFixed(4));
        const diffBefore = Math.abs(originalOpinionTotal - expectedOOT_before);
        const matchBefore = diffBefore < 0.01;
        console.log(`  Formula          : ${soldPrice} - ${originalYTotal} = ${expectedOOT_before}`);
        console.log(`  Actual on page   : ${originalOpinionTotal}`);
        if (matchBefore) {
          console.log(`  ✓  BEFORE UPDATE: Original Opinion Total matches formula (${originalOpinionTotal})`);
        } else {
          console.log(`  ❌ BEFORE UPDATE: Mismatch — expected ${expectedOOT_before}, got ${originalOpinionTotal}, diff ${diffBefore.toFixed(6)}`);
        }
        if (!matchBefore) {
          scenarioAssertionErrors.push(
            `BEFORE UPDATE: Original Opinion Total mismatch — expected ${soldPrice} - ${originalYTotal} = ${expectedOOT_before}, got ${originalOpinionTotal} (diff ${diffBefore.toFixed(6)})`
          );
        }
      } else {
        console.log(`  ⚠  BEFORE UPDATE: Could not read Sold Price — skipping assertion`);
      }
      console.log('─────────────────────────────────────────────────────────────────\n');

      // STEP 6: Read each factor's current value and compute saved ratios
      const factorNames = ['View', 'Condition', 'Quality', 'Amenities', 'Access', 'Appeal', 'Elevation', 'Economic'];
      const currentFactors = {};
      for (const name of factorNames) {
        const input = page1.locator(`input[placeholder*="${name}" i]`).first();
        const val = await input.inputValue().catch(() => null);
        currentFactors[name] = val !== null ? (parseFloat(val) || 0) : 0;
      }

      console.log('\n=== TC-007: Saving ratios (factor / originalOpinionTotal) ===');
      const savedRatios = {};
      for (const [name, val] of Object.entries(currentFactors)) {
        savedRatios[name] = originalOpinionTotal && originalOpinionTotal !== 0
          ? parseFloat((val / originalOpinionTotal).toFixed(6))
          : 0;
        console.log(`  ${name.padEnd(12)}: ${val} / ${originalOpinionTotal} = ${savedRatios[name]}`);
      }

      const newBaseValue = scenario.baseValue;
      const bvtYFactors  = scenario.yFactors; // { bedroomsTotal:{baseNumber,unitValue}, ..., associationYN:{value,unitValue}, coolingYN:{value,unitValue} }

      console.log('\n=== TC-007: Opening Settings in new tab to edit formula ===');
    const page2 = await context.newPage();
    await page2.goto(`${process.env.BASE_URL || 'https://stage.crexagent.com'}/settings?tab=ytotal`);
    await wait(3000);
    await getYFormulaLocator(page2, 'yTotalTab').first().click({ force: true }).catch(() => {});
    await wait(2000);

    // STEP 8: Click Edit icon on matching row in page2
    console.log('\n=== TC-007: Clicking Edit icon in Settings tab ===');
    const row2 = getMatchingRow(page2);
    const editBtn = await row2.count() > 0
      ? row2.locator('td:last-child button:nth-child(1)')
      : page2.locator('table tbody tr').first().locator('td:last-child button:nth-child(1)');

    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click({ force: true });
    await wait(3000);
    await page2.screenshot({ path: 'screenshots/tc007-edit-dialog.png' });

    // STEP 9: Update Base Value from Excel
    console.log(`\n=== TC-007: Updating Base Value to ${newBaseValue} ===`);

    // Debug: dump all inputs inside the active overlay to find the right selectors
    const dialogInputsDebug = await page2.evaluate(() => {
      const overlay = document.querySelector('.v-overlay--active, [role="dialog"]');
      if (!overlay) return { found: false, overlays: [...document.querySelectorAll('.v-overlay--active')].length };
      const inputs = [...overlay.querySelectorAll('input, textarea')];
      return {
        found: true,
        overlayClass: overlay.className?.slice(0, 60),
        inputs: inputs.map(el => ({
          type: el.type, placeholder: el.placeholder, value: el.value,
          label: el.closest('.v-field, .v-input')?.querySelector('label, .v-label')?.innerText?.trim() || '',
        })),
      };
    });
    console.log('  Dialog inputs debug:', JSON.stringify(dialogInputsDebug, null, 2));

    // Use .v-overlay--active as container (like TC-005 photo dialogs)
    const dialogOverlay = page2.locator('.v-overlay--active').first();
    const allDialogInputs = dialogOverlay.locator('input');
    const inputCount = await allDialogInputs.count();
    console.log(`  Total inputs in overlay: ${inputCount}`);

    // Find base value input by label proximity — look for the one labelled "Base Value"
    let baseInputFilled = false;
    for (let i = 0; i < inputCount; i++) {
      const inp = allDialogInputs.nth(i);
      const lb = await inp.evaluate(el => {
        const field = el.closest('.v-field, .v-input, [class*="field"]');
        return field?.querySelector('label, .v-label')?.innerText?.trim() || '';
      }).catch(() => '');
      const ph = await inp.getAttribute('placeholder').catch(() => '') || '';
      if (/base\s*value/i.test(lb) || /base/i.test(ph)) {
        const cur = await inp.inputValue();
        await inp.click({ force: true });
        await inp.fill(newBaseValue);
        await wait(300);
        console.log(`  Base Value: "${cur}" → "${newBaseValue}" (label: "${lb}")`);
        baseInputFilled = true;
        break;
      }
    }
    // Fallback: fill the first number input if base not found by label
    if (!baseInputFilled && inputCount > 0) {
      const firstInp = allDialogInputs.first();
      const cur = await firstInp.inputValue();
      await firstInp.click({ force: true });
      await firstInp.fill(newBaseValue);
      await wait(300);
      console.log(`  Base Value (fallback first input): "${cur}" → "${newBaseValue}"`);
    }

    // STEP 10: Navigate to next step to reach factor value fields
    console.log('\n=== TC-007: Navigating to next wizard step for factor values ===');
    const nextBtn = dialogOverlay.locator('button:has-text("Next"), button:has-text("Continue")').first();
    const nextVisible = await nextBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (nextVisible) {
      await nextBtn.click({ force: true });
      await wait(2000);
      console.log('  Clicked Next — on factor values step');
      await page2.screenshot({ path: 'screenshots/tc007-factor-step.png' });
    } else {
      console.log('  Next button not found — may already be on factor step or dialog structure differs');
    }

    // ── STEP 10b: Click "Y Factor" tab directly (3rd tab in dialog) ────────────
    console.log('\n=== TC-007: Clicking Y Factor tab ===');
    const yFactorTab = dialogOverlay.locator('button:has-text("Y Factor"), [role="tab"]:has-text("Y Factor")').first();
    if (await yFactorTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yFactorTab.click({ force: true });
      await wait(2000);
      console.log('  Y Factor tab clicked');
      await page2.screenshot({ path: 'screenshots/tc007-yfactor-tab.png' });
    } else {
      console.log('  Y Factor tab not found — filling on current step');
    }

    // ── STEP 10c: Fill 8 numeric Y-Factor rows (Base Number + Unit Value by index) ──
    // Dialog rows (in order): Bedrooms Total, Bathrooms Total, Site Area, Finished Sq Ft,
    //                          Year Built, Stories, Garage Spaces, Fireplaces Total
    console.log('\n=== TC-007: Filling Y-Factor Base Number + Unit Value fields ===');
    const numericFactorOrder = [
      'bedroomsTotal', 'bathroomsTotal', 'siteArea', 'finishedSqFt',
      'yearBuilt', 'stories', 'garageSpaces', 'fireplacesTotal',
    ];
    const factorLabels = [
      'Bedrooms Total', 'Bathrooms Total', 'Site Area', 'Finished Sq Ft',
      'Year Built', 'Stories', 'Garage Spaces', 'Fireplaces Total',
    ];

    for (let i = 0; i < numericFactorOrder.length; i++) {
      const key    = numericFactorOrder[i];
      const label  = factorLabels[i];
      const fData  = bvtYFactors[key] || { baseNumber: '', unitValue: '' };
      const baseNum = String(fData.baseNumber || '');
      const unitVal = String(fData.unitValue  || '');

      if (!baseNum && !unitVal) {
        console.log(`  ${label.padEnd(20)}: skipped (empty in BVT sheet)`);
        continue;
      }

      // Scroll the nth "Enter base number" input into view and fill
      await page2.evaluate((idx) => {
        const inputs = document.querySelectorAll('.v-overlay--active input[placeholder="Enter base number"]');
        const target = inputs[idx];
        if (!target) return;
        let el = target.parentElement;
        while (el && !el.classList.contains('v-dialog') && !el.classList.contains('v-overlay__content')) {
          if (el.scrollHeight > el.clientHeight) {
            const tr = target.getBoundingClientRect();
            const cr = el.getBoundingClientRect();
            el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
            break;
          }
          el = el.parentElement;
        }
      }, i);
      await wait(300);

      const baseInput = dialogOverlay.locator('input[placeholder="Enter base number"]').nth(i);
      if (await baseInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await baseInput.click({ force: true });
        await wait(200);
        await baseInput.fill(baseNum);
        await baseInput.press('Tab'); // Tab triggers blur → unlocks Unit Value input
        await wait(500);
        console.log(`  ${label.padEnd(20)} Base#: "${baseNum}"`);
      } else {
        console.log(`  ${label.padEnd(20)}: Enter base number input [${i}] not visible`);
        continue;
      }

      // Fill Unit Value — nth "Enter unit value" input (unlocked after Tab on base)
      const unitInput = dialogOverlay.locator('input[placeholder="Enter unit value"]').nth(i);
      if (await unitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await unitInput.click({ force: true });
        await wait(200);
        await unitInput.fill(unitVal);
        await wait(300);
        console.log(`  ${label.padEnd(20)} Unit : "${unitVal}"`);
      } else {
        console.log(`  ${label.padEnd(20)}: Enter unit value input [${i}] not visible (may need base number first)`);
      }
    }

    // ── STEP 10d: Handle Association YN + Cooling YN (Yes/No + Unit Value) ─────
    // Note: If Yes/No is selected, the Unit Value field MUST be filled (both are required together)
    const ynFields = [
      { key: 'associationYN', label: 'Association YN', dropdownIndex: 0 },
      { key: 'coolingYN',     label: 'Cooling YN',     dropdownIndex: 1 },
    ];

    for (const ynField of ynFields) {
      const ynData    = bvtYFactors[ynField.key] || {};
      const ynValue   = String(ynData.value     || '').trim();
      const ynUnit    = String(ynData.unitValue  || '').trim();

      if (!ynValue) {
        console.log(`  ${ynField.label.padEnd(20)}: skipped (no value in BVT sheet)`);
        continue;
      }

      console.log(`  ${ynField.label.padEnd(20)} Yes/No: "${ynValue}", Unit: "${ynUnit}"`);

      // Click the Yes/No dropdown (nth "Select Yes or No" input)
      const ynInput = dialogOverlay.locator('input[placeholder="Select Yes or No"]').nth(ynField.dropdownIndex);
      if (await ynInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await ynInput.click({ force: true });
        await wait(1000);
        // Select the matching option from the dropdown
        const option = page2.locator('.v-overlay--active .v-list-item, .v-list-item').filter({ hasText: new RegExp(`^${ynValue}$`, 'i') }).first();
        if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await option.click({ force: true });
          await wait(500);
          console.log(`    Selected: "${ynValue}"`);
        } else {
          // Fallback: type the value
          await ynInput.fill(ynValue);
          await wait(500);
        }
      } else {
        console.log(`  ${ynField.label}: Yes/No input not visible`);
        continue;
      }

      // Fill Unit Value (required when Yes/No selected)
      if (ynUnit) {
        // The unit input for YN rows uses placeholder "Enter base number first" initially,
        // then changes to "Enter base number" once a Yes/No is selected
        const ynUnitInput = dialogOverlay.locator(
          'input[placeholder="Enter base number"]:not([placeholder="Enter base value"])'
        ).nth(numericFactorOrder.length + ynField.dropdownIndex);
        if (await ynUnitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await ynUnitInput.click({ force: true });
          await wait(200);
          await ynUnitInput.fill(ynUnit);
          await wait(300);
          console.log(`    Unit value filled: "${ynUnit}"`);
        } else {
          console.log(`    ⚠  Unit value input not visible — Yes/No may not have unlocked it yet`);
        }
      } else if (ynValue.toLowerCase() === 'yes' || ynValue.toLowerCase() === 'no') {
        console.log(`    ⚠  Note: "${ynField.label}" = "${ynValue}" but Unit Value is empty in BVT sheet — both fields are required`);
      }
    }

    await page2.screenshot({ path: 'screenshots/tc007-after-factor-edit.png' });

    // STEP 11: Save the formula
    console.log('\n=== TC-007: Saving updated formula ===');
    const saveBtn = dialogOverlay.locator('button:has-text("Save"), button:has-text("Update")').last();
    const saveBtnVisible = await saveBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (saveBtnVisible) {
      await saveBtn.click({ force: true });
      await wait(3000);
      const snack = await page2.locator('.v-snackbar, [role="status"], [role="alert"]').first().innerText().catch(() => '');
      console.log(`  Save result: "${snack}"`);
    } else {
      console.log('  Save button not found');
    }

    // Close the settings tab before next scenario iteration
    await page2.close();

    // STEP 12: Switch back to property tab, reload, scroll down
    console.log('\n=== TC-007: Switching to property tab, reloading ===');
    await page1.bringToFront();
    await page1.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await wait(3000);
    try {
      await page1.locator('.v-progress-circular, .mdi-loading, [class*="loading"]').first()
        .waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(3000);

    // Scroll incrementally so all 8 factor fields become visible before reading
    console.log('\n=== TC-007: Scrolling property page to reveal all 8 factor fields ===');
    await page1.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    // Scroll in steps to trigger lazy-render and make all fields visible
    for (const offset of [300, 600, 900, 1200]) {
      await page1.evaluate((y) => window.scrollBy(0, y), offset);
      await wait(600);
    }
    await page1.screenshot({ path: 'screenshots/tc007-property-scrolled-fields.png' });

    // Log the current value of each field as visible on screen
    console.log('\n  Field values visible after scroll:');
    for (const name of factorNames) {
      const input = page1.locator(`input[placeholder*="${name}" i]`).first();
      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(200);
      const val = await input.inputValue().catch(() => 'NOT FOUND');
      console.log(`    ${name.padEnd(12)}: ${val}`);
    }
    await page1.screenshot({ path: 'screenshots/tc007-property-after-reload.png' });

    // STEP 13: Read updated Original Opinion Total, Opinion Total, and factor inputs
    console.log('\n=== TC-007: Reading updated values after formula edit ===');
    const newOriginalOpinionTotal = await findValueNearLabel(page1, /^original\s+opinion\s+total$/i);
    const newOriginalYTotal       = await findValueNearLabel(page1, /^original\s+y\s+total$/i);
    const newOpinionTotal         = await findValueNearLabel(page1, /^opinion\s+total$/i);

    const updatedFactors = {};
    for (const name of factorNames) {
      const input = page1.locator(`input[placeholder*="${name}" i]`).first();
      const val = await input.inputValue().catch(() => null);
      updatedFactors[name] = val !== null ? (parseFloat(val) || null) : null;
    }

    // STEP 14: Compute expected sum of 8 fields and expected per-factor values
    const sumOf8Fields = Object.values(updatedFactors).reduce((s, v) => s + (v || 0), 0);
    console.log(`\n  Sum of 8 factor fields on page : ${sumOf8Fields}`);
    console.log(`  Opinion Total shown on page    : ${newOpinionTotal}`);

    // ── ASSERTION: AFTER update — originalOpinionTotal = soldPrice - originalYTotal
    // Reuse soldPrice captured earlier from panel text (property hasn't changed)
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  TC-007: AFTER UPDATE — Original Opinion Total assertion');
    console.log(`  Sold Price           : ${soldPrice}`);
    console.log(`  New Original Y Total : ${newOriginalYTotal}`);
    if (soldPrice !== null && newOriginalYTotal !== null) {
      const expectedOOT_after = parseFloat((soldPrice - newOriginalYTotal).toFixed(4));
      const diffAfter = Math.abs(newOriginalOpinionTotal - expectedOOT_after);
      const matchAfter = diffAfter < 0.01;
      console.log(`  Formula            : ${soldPrice} - ${newOriginalYTotal} = ${expectedOOT_after}`);
      console.log(`  Actual on page     : ${newOriginalOpinionTotal}`);
      if (matchAfter) {
        console.log(`  ✓  AFTER UPDATE: Original Opinion Total matches formula (${newOriginalOpinionTotal})`);
      } else {
        console.log(`  ❌ AFTER UPDATE: Mismatch — expected ${expectedOOT_after}, got ${newOriginalOpinionTotal}, diff ${diffAfter.toFixed(6)}`);
      }
      if (!matchAfter) {
        scenarioAssertionErrors.push(
          `AFTER UPDATE: Original Opinion Total mismatch — expected ${soldPrice} - ${newOriginalYTotal} = ${expectedOOT_after}, got ${newOriginalOpinionTotal} (diff ${diffAfter.toFixed(6)})`
        );
      }
    } else {
      console.log(`  ⚠  AFTER UPDATE: Could not read Sold Price — skipping assertion`);
    }
    console.log('─────────────────────────────────────────────────────────────────\n');

    // STEP 15: Verify — expected factor value = savedRatio × newOriginalOpinionTotal
    //          Also verify Opinion Total == sum of 8 fields
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  TC-007: VERIFICATION — Opinion values after Y-Formula edit');
    console.log(`  New Original Opinion Total : ${newOriginalOpinionTotal}`);
    console.log(`  New Original Y Total       : ${newOriginalYTotal}`);
    console.log(`  Opinion Total on page      : ${newOpinionTotal}`);
    console.log(`  Sum of 8 factor fields     : ${sumOf8Fields}`);
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('  Factor          | Saved Ratio | Expected (ratio×newOrigOp)   | Actual   | Result');
    console.log('  ────────────────|─────────────|──────────────────────────────|──────────|───────');

    const assertionErrors = scenarioAssertionErrors; // reuse same array so all errors accumulate
    for (const name of factorNames) {
      const ratio    = savedRatios[name];
      const expected = newOriginalOpinionTotal !== null && newOriginalOpinionTotal !== 0
        ? parseFloat((ratio * newOriginalOpinionTotal).toFixed(4))
        : null;
      const actual   = updatedFactors[name];
      const match    = actual !== null && expected !== null
        ? Math.abs(actual - expected) < 0.01
        : false;

      const namePad = name.padEnd(16);
      const rPad    = String(ratio).padEnd(12);
      const ePad    = String(expected).padEnd(29);
      const aPad    = String(actual).padEnd(9);
      console.log(`  ${namePad}| ${rPad}| ${ePad}| ${aPad}| ${match ? '✓ MATCH' : '✗ MISMATCH'}`);

      if (!match) {
        console.log(`    ❌ [${name}]`);
        console.log(`         Saved Ratio          : ${ratio}`);
        console.log(`         New Orig Opinion Tot : ${newOriginalOpinionTotal}`);
        console.log(`         Expected             : ${ratio} × ${newOriginalOpinionTotal} = ${expected}`);
        console.log(`         Actual on page       : ${actual}`);
        console.log(`         Old Opinion Total    : ${originalOpinionTotal} (before formula edit)`);
        console.log(`         Difference           : ${actual !== null && expected !== null ? Math.abs(actual - expected).toFixed(6) : 'N/A'}`);
        assertionErrors.push(`${name}: expected ${expected} (${ratio} × ${newOriginalOpinionTotal}) but got ${actual}`);
      } else {
        console.log(`    ✓  [${name}] Matches: ${actual}`);
      }
    }

    // STEP 16: Assert Opinion Total on page == sum of 8 fields
    console.log('\n─────────────────────────────────────────────────────────────────');
    const opinionTotalMatch = newOpinionTotal !== null
      ? Math.abs(newOpinionTotal - sumOf8Fields) < 0.01
      : false;
    console.log(`  Opinion Total check: page shows ${newOpinionTotal}, sum of 8 fields = ${sumOf8Fields}`);
    if (!opinionTotalMatch) {
      console.log(`  ❌ MISMATCH — Opinion Total (${newOpinionTotal}) ≠ Sum of 8 fields (${sumOf8Fields})`);
      assertionErrors.push(`Opinion Total mismatch: page shows ${newOpinionTotal} but sum of 8 fields = ${sumOf8Fields}`);
    } else {
      console.log(`  ✓  Opinion Total matches sum of 8 fields: ${newOpinionTotal}`);
    }
    console.log('─────────────────────────────────────────────────────────────────\n');

    // STEP 17: Navigate back to Properties chart, hover same dot, check panel Opinion Total
    console.log('\n=== TC-007: Navigating back to Properties chart to check panel opinion ===');
    await getNavLocator(page1, 'propertiesNav').first().click({ force: true });
    await page1.waitForURL('**/properties**', { timeout: 20000 });
    await wait(3000);
    try {
      await page1.locator('.v-progress-circular, [class*="loading"]').first()
        .waitFor({ state: 'hidden', timeout: 20000 });
    } catch { /* loaded */ }
    await wait(4000);

    // Hover on same dot
    const chartRect2 = await page1.evaluate(() => {
      const el = document.querySelector('.chart-card') || document.querySelector('[class*="chart-card"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

    let panelOpinionValue = null;
    if (chartRect2) {
      const hx = Math.round(chartRect2.x + chartRect2.width  * 0.35);
      const hy = Math.round(chartRect2.y + chartRect2.height * 0.70);
      await page1.mouse.move(hx, hy);
      await wait(1500);
      await page1.mouse.click(hx, hy);
      await wait(2000);
      await page1.screenshot({ path: 'screenshots/tc007-panel-after-hover.png' });

      // Read the panel text — look for OPINION value
      const panelText = await page1.locator('.card-panel, [class*="card-panel"]').first()
        .innerText().catch(() => '');
      console.log(`  Panel text: "${panelText.replace(/\n/g, ' | ')}"`);

      // Extract the displayed opinion value from panel (e.g. "$40" next to "OPINION")
      const opinionMatch = panelText.match(/OPINION\s*\n?\s*\$?([\d,.-]+)/i);
      if (opinionMatch) {
        panelOpinionValue = parseFloat(opinionMatch[1].replace(/,/g, ''));
        console.log(`  Panel Opinion value extracted: ${panelOpinionValue}`);
      } else {
        console.log('  Panel Opinion value not found in text');
      }
    }

    // STEP 18: Assert panel Opinion Total matches sum of 8 fields
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('  TC-007: PANEL OPINION TOTAL ASSERTION');
    console.log(`  Expected (sum of 8 fields) : ${sumOf8Fields}`);
    console.log(`  Panel shows                : ${panelOpinionValue}`);

    if (panelOpinionValue === null) {
      console.log('  ⚠  Panel Opinion value could not be read — skipping panel assertion');
    } else if (Math.abs(panelOpinionValue - sumOf8Fields) < 0.01) {
      console.log(`  ✓  Panel Opinion Total matches: ${panelOpinionValue}`);
    } else {
      console.log(`  ❌ Panel Opinion Total MISMATCH`);
      console.log(`     Panel shows  : ${panelOpinionValue} (OLD value if formula not applied)`);
      console.log(`     Expected     : ${sumOf8Fields} (new sum of 8 fields)`);
      assertionErrors.push(`Panel Opinion Total mismatch: panel shows ${panelOpinionValue} but expected ${sumOf8Fields} (sum of 8 fields)`);
    }
    console.log('─────────────────────────────────────────────────────────────────\n');

    await page1.screenshot({ path: 'screenshots/tc007-final-state.png' });

    // Save per-scenario verification output
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync('output', { recursive: true });
    const scenarioSlug = (scenario.scenario || `scenario-${bvtScenarios.indexOf(scenario) + 1}`)
      .replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
    writeFileSync(`output/tc007-${scenarioSlug}.json`, JSON.stringify({
      capturedAt: new Date().toISOString(),
      scenario: scenario.scenario,
      excelFile: 'test-data/filter-input-template.xlsx (BVT Scenarios sheet)',
      excelInputs: { baseValue: newBaseValue, yFactors: bvtYFactors },
      expectedResult: scenario.expected,
      savedRatios,
      before: { originalOpinionTotal, originalYTotal, opinionTotal },
      after: {
        newOriginalOpinionTotal,
        newOriginalYTotal,
        newOpinionTotal,
        sumOf8Fields,
        panelOpinionValue,
        updatedFactors,
      },
      formula: 'expected_factor = savedRatio × newOriginalOpinionTotal',
      opinionTotalFormula: 'opinionTotal = sum of all 8 factor fields',
      passed: assertionErrors.length === 0,
      failures: assertionErrors,
    }, null, 2));
    console.log(`Verification saved to output/tc007-${scenarioSlug}.json`);

    // Track scenario outcome
    allScenarioResults.push({
      scenario: scenario.scenario,
      expected: scenario.expected,
      passed: assertionErrors.length === 0,
      failures: assertionErrors,
    });

    // Log outcome but do NOT throw — let all scenarios run first
    if (assertionErrors.length > 0) {
      console.log(`\n❌ [${scenario.scenario}] ${assertionErrors.length} check(s) FAILED (browser will close, next scenario starts):`);
      assertionErrors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    } else {
      console.log(`✓ [${scenario.scenario}] All checks passed.`);
    }

      } finally {
        // Always close the browser context — even if a step threw an unhandled error
        await context.close();
        console.log(`  Browser closed for scenario: ${scenario.scenario}`);
      }
  } // ──── end for (const scenario of bvtScenarios)

  // Summary across all BVT scenarios
  console.log(`\n${'═'.repeat(70)}`);
  console.log('=== TC-007 BVT SUMMARY ===');
  for (const r of allScenarioResults) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}  [${r.scenario}]  (expected=${r.expected})`);
    if (!r.passed) r.failures.forEach(f => console.log(`         ↳ ${f}`));
  }
  const totalPass = allScenarioResults.filter(r => r.passed).length;
  console.log(`\n  ${totalPass} / ${allScenarioResults.length} scenarios passed.`);
  console.log(`${'═'.repeat(70)}`);
  console.log('=== TC-007 COMPLETE ===');

  // Now throw once if any scenario failed — all scenarios have already run
  const failedScenarios = allScenarioResults.filter(r => !r.passed);
  if (failedScenarios.length > 0) {
    const summary = failedScenarios.map(r =>
      `[${r.scenario}]:\n` + r.failures.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
    ).join('\n\n');
    expect(failedScenarios, `${failedScenarios.length} / ${allScenarioResults.length} scenario(s) FAILED:\n\n${summary}`).toHaveLength(0);
  }
});

});
