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
  test.setTimeout(180000);

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

  test('TC-004: should create Y-formula from Settings > Y-Total', async ({ page }) => {
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
    // STEP 4: Fill mandatory market configuration fields
    // ============================================================
    await selectYFormulaDialogOption(page, 'Select MLS Board', 'Northstar MLS');
    await wait(2000); // Wait for State dropdown to become enabled (API cascade)
    await selectYFormulaDialogOption(page, 'Select State', 'Minnesota');
    await wait(2000); // Wait for County dropdown to become enabled (API cascade)
    await selectYFormulaDialogOption(page, 'Select County', 'Washington');
    await wait(1500); // Wait for City/Zip dropdowns to become enabled

    // Optional fields
    await selectYFormulaDialogOption(page, 'Select City', 'Stillwater');
    await wait(1000);
    await selectYFormulaDialogOption(page, 'Select Zip Code', '55082');
    await wait(1000);

    // Ensure no dropdown overlay is blocking the Base Value input
    const overlayOpen = await page.locator('.v-overlay--active .v-list-item').count();
    if (overlayOpen > 0) {
      await page.keyboard.press('Tab');
      await wait(400);
    }

    const baseValueInput = page.locator('.v-dialog input[placeholder="Enter base value"]');
    await baseValueInput.click();
    await wait(500);
    await baseValueInput.fill('1000');
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

    // Wait for the dialog's active-overlay class to be removed (Vuetify removes
    // v-overlay--active when a dialog closes, even before the element leaves DOM).
    await page.locator('.v-overlay--active').waitFor({ state: 'hidden', timeout: 30000 });

    // Verify we are back on the Y-Total table
    await expect(getYFormulaLocator(page, 'addNewFormulaButton').first()).toBeVisible({ timeout: 10000 });
  });

});
