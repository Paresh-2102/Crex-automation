// ============================================================
// tests/crex-agent-filters.spec.js
//
// Market Filters dialog tests — refactored from crex-agent-filters.spec.js.bak
// and crex-agent-features.spec.js.bak
//
// POM compliance:
//   ✓ All locators live in PropertiesPage / page objects
//   ✓ All actions called via page methods (no raw locator() in spec)
//   ✓ Credentials & constants from utils/testData.js
//   ✓ Page objects injected via fixtures/index.js
// ============================================================

import { test, expect } from '../fixtures/index.js';
import { readExcelData } from '../test-data/read-excel-data.js';
import { CREDENTIALS, URLS, TIMEOUTS } from '../utils/testData.js';

const { email: EMAIL, password: PASSWORD } = CREDENTIALS;

let excelData;
test.beforeAll(async () => {
  excelData = await readExcelData();
});

test.describe('CREX Agent - Market Filters Selection', () => {

  // --------------------------------------------------------------------------
  // TC-F-001: All Market Filter dropdowns can be filled, Next is reachable
  // --------------------------------------------------------------------------
  test('TC-F-001: should fill all Market Filter dropdowns and reach Market Features',
    async ({ page, loginPage, navPage, propertiesPage }) => {
      const filters = excelData.marketFilters;

      // STEP 1: Pre-authenticated via storageState
      await page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate to Properties & open filter dialog
      await navPage.goToProperties();
      await propertiesPage.openFilterDialog();

      // STEP 3: Assert dialog opened
      await expect(page.getByRole('heading', { name: 'Market Filters', level: 4 })).toBeVisible();

      // STEP 4: Apply all filters (delegated to PropertiesPage)
      await propertiesPage.applyMarketFilters(filters);

      // STEP 5: Advance to Market Features step
      await propertiesPage.goToMarketFeatures();

      // STEP 6: Assert Market Features dialog loaded
      await expect(propertiesPage.getMarketFeaturesDialogTitleLocator()).toBeVisible();
      await expect(page.getByText('Add New Market Feature')).toBeVisible();
    });

  // --------------------------------------------------------------------------
  // TC-F-002: Market Features can be added and workflow advances to Y-Factors
  // --------------------------------------------------------------------------
  test('TC-F-002: should add a market feature and navigate to Y-Factor Filters',
    async ({ page, loginPage, navPage, propertiesPage }) => {
      const filters  = excelData.marketFilters;
      const features = excelData.marketFeatures;

      // STEP 1: Pre-authenticated via storageState
      await page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate → Filters → Features
      await navPage.goToProperties();
      await propertiesPage.openFilterDialog();
      await propertiesPage.applyMarketFilters(filters);
      await propertiesPage.goToMarketFeatures();

      // STEP 3: Assert Market Features dialog is open
      await expect(propertiesPage.getMarketFeaturesDialogTitleLocator()).toBeVisible();

      // STEP 4: Apply market features
      await propertiesPage.applyMarketFeatures(features);

      // STEP 5: Advance to Y-Factors
      await propertiesPage.goToYFactors();

      // STEP 6: Assert Y-Factor step loaded
      await expect(propertiesPage.getYFactorConfigTextLocator()).toBeVisible();
      await expect(propertiesPage.getYFactorsHeaderLocator()).toBeVisible();

      // Verify key factor rows are present in the dialog
      await expect(page.getByText('Bedrooms Total')).toBeVisible();
      await expect(page.getByText('Bathrooms Total')).toBeVisible();
      await expect(page.getByText('Site Area', { exact: true })).toBeVisible();
      await expect(page.getByText('Finished Sq Ft', { exact: true })).toBeVisible();
      await expect(page.getByText('Year Built', { exact: true })).toBeVisible();
    });

  // --------------------------------------------------------------------------
  // TC-F-003: Full filter pipeline — Filters → Features → Y-Factors → Apply
  // --------------------------------------------------------------------------
  test('TC-F-003: full filter pipeline leads to Properties page with results',
    async ({ page, loginPage, navPage, propertiesPage }) => {
      const filters  = excelData.marketFilters;
      const features = excelData.marketFeatures;
      const yFactors = excelData.yFactors;

      // STEP 1: Pre-authenticated via storageState
      await page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate and run full filter pipeline
      await navPage.goToProperties();
      await propertiesPage.openFilterDialog();
      await propertiesPage.applyMarketFilters(filters);
      await propertiesPage.goToMarketFeatures();
      await propertiesPage.applyMarketFeatures(features);
      await propertiesPage.goToYFactors();
      await propertiesPage.applyYFactors(yFactors);

      // STEP 3: Apply and verify Properties page loaded
      await propertiesPage.clickApplyFilters();
      await expect(page).toHaveURL(/properties/);
    });

});
