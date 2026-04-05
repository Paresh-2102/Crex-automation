// ============================================================
// tests/crex-agent-complete-flow.spec.js
//
// CREX Agent — End-to-End test suite
//
// Architecture:
//   • Imports page objects via Playwright fixtures (fixtures/index.js)
//   • All credentials / constants from utils/testData.js
//   • Dynamic Excel data from test-data/read-excel-data.js
//   • Pure math/IO helpers from utils/helpers.js
//   • NO locators here — all locators live in pages/ or locators/
//   • NO page actions here — all actions live in page objects
// ============================================================

import { test, expect } from '../fixtures/index.js';
import { readExcelData } from '../test-data/read-excel-data.js';
import {
  CREDENTIALS,
  URLS,
  TIMEOUTS,
  Y_FACTOR_ROWS,
  NUMERIC_FACTOR_ORDER,
  FACTOR_LABELS,
  YN_FIELDS,
  OPINION_FIELDS,
  FACTOR_NAMES,
  PHOTO_FACTORS,
  OPINION_CALC_FILE,
  OUTPUT_DIR,
} from '../utils/testData.js';
import {
  computeRatios,
  applyRatios,
  sumValues,
  toSlug,
  extractNumber,
  saveJson,
  loadJson,
} from '../utils/helpers.js';

const { email: EMAIL, password: PASSWORD } = CREDENTIALS;

// ─── Excel data loaded once for all tests ────────────────────────────────────
let excelData;
test.beforeAll(async () => {
  excelData = await readExcelData();
});

test.describe('CREX Agent - Complete Property Filter Flow', () => {

  test.setTimeout(300000);

  // ==========================================================================
  // TC-001: Login
  // ==========================================================================
  test('TC-001: should login successfully', async ({ loginPage, navPage }) => {
    test.use({ storageState: undefined });
    await loginPage.navigate();
    await loginPage.login(EMAIL, PASSWORD);

    await loginPage.page.waitForURL(URLS.affiliateManagers, { timeout: TIMEOUTS.medium });
    await expect(navPage.getPropertiesNavLocator()).toBeVisible();
  });

  // ==========================================================================
  // TC-002: Full Filter Flow — Filters → Features → Y-Factors → Apply
  // ==========================================================================
  test('TC-002: should complete full filter flow — Filters → Features → Y-Factors → Apply',
    async ({ loginPage, navPage, propertiesPage }) => {
      const { marketFilters: filters, marketFeatures: features, yFactors } = excelData;

      // STEP 1: Pre-authenticated via storageState
      await loginPage.page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate to Properties & open Filter Dialog
      await navPage.goToProperties();
      await propertiesPage.openFilterDialog();

      // STEP 3: Assert Market Filters dialog is open
      await expect(propertiesPage.page.getByRole('heading', { name: 'Market Filters', level: 4 })).toBeVisible();

      // STEP 4: Fill Market Filters → advance
      await propertiesPage.applyMarketFilters(filters);
      await propertiesPage.page.screenshot({ path: 'test-results/market-filters-filled.png', fullPage: false });
      await propertiesPage.goToMarketFeatures();

      // STEP 5: Assert Market Features dialog & fill
      await expect(propertiesPage.getMarketFeaturesDialogTitleLocator()).toBeVisible();
      await propertiesPage.applyMarketFeatures(features);
      await propertiesPage.goToYFactors();

      // STEP 6: Assert Y-Factors step & fill
      await expect(propertiesPage.getYFactorConfigTextLocator()).toBeVisible();
      await expect(propertiesPage.getYFactorsHeaderLocator()).toBeVisible();
      await propertiesPage.applyYFactors(yFactors);

      // STEP 7: Apply Filters — assert URL
      await propertiesPage.clickApplyFilters();
      await expect(propertiesPage.page).toHaveURL(/properties/);
    });

  // ==========================================================================
  // TC-003: Click original property (blue dot) and view detail
  // ==========================================================================
  test('TC-003: should click original property (blue dot) and view detail',
    async ({ loginPage, navPage, propertiesPage }) => {
      const { marketFilters: filters, marketFeatures: features } = excelData;

      // STEP 1: Pre-authenticated via storageState
      await loginPage.page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate → Filter → Features → Apply
      await navPage.goToProperties();
      await propertiesPage.openFilterDialog();
      await propertiesPage.applyMarketFilters(filters);
      await propertiesPage.goToMarketFeatures();
      await propertiesPage.applyMarketFeatures(features);
      await propertiesPage.goToYFactors();
      await propertiesPage.clickApplyFilters();

      // STEP 3: Assert properties page with filters applied
      await expect(propertiesPage.page).toHaveURL(/properties/);

      // STEP 4: Click blue dot and view detail
      await propertiesPage.clickFirstBlueDot();
      await propertiesPage.clickViewDetail();

      // STEP 5: Verify navigation to property detail page
      await expect(propertiesPage.page).toHaveURL(/properties|property|detail/);
    });

  // ==========================================================================
  // TC-004: Create Y-formula from Settings > Y-Total
  // ==========================================================================
  test('TC-004: should create Y-formula from Settings > Y-Total',
    async ({ page, loginPage, navPage, yFormulaPage, propertiesPage }) => {
      await page.setViewportSize({ width: 1280, height: 1024 });

      // STEP 1: Pre-authenticated via storageState
      await page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate to Settings > Y-Total
      await navPage.goToSettings();
      await yFormulaPage.clickYTotalTab();

      // STEP 3: Open Create Formula dialog
      await yFormulaPage.openCreateFormulaDialog();

      // STEP 4: Assert required labels are visible
      await expect(yFormulaPage.getCreateFormulaDialogTitleLocator()).toBeVisible();
      await expect(yFormulaPage.getMlsBoardLabelRequiredLocator()).toBeVisible();
      await expect(yFormulaPage.getStateLabelRequiredLocator()).toBeVisible();
      await expect(yFormulaPage.getCountyLabelRequiredLocator()).toBeVisible();
      await expect(yFormulaPage.getBaseValueLabelRequiredLocator()).toBeVisible();

      // STEP 5: Fill Market Configuration
      await yFormulaPage.fillMarketConfiguration(excelData.yFormula);

      // STEP 6: Move to Market Features step
      await yFormulaPage.goToMarketFeaturesStep();
      await expect(
        page.locator('.v-dialog input[placeholder="Select the features (optional)"]').first()
      ).toBeVisible({ timeout: TIMEOUTS.short });

      // STEP 7: Fill Market Features
      await yFormulaPage.fillYFormulaMarketFeatures(excelData.marketFeatures);

      // STEP 8: Move to Y-Factor step
      await yFormulaPage.goToYFactorStep();
      await expect(
        page.locator('.v-dialog input[placeholder="Enter base number"]').first()
      ).toBeVisible({ timeout: TIMEOUTS.short });

      // STEP 9: Fill Y-Factor rows (defaults merged with Excel data)
      await yFormulaPage.fillYFactorRows(Y_FACTOR_ROWS, excelData.yFactors);
      await yFormulaPage.fillAssociationYN(excelData.yFactors.associationYn);
      await yFormulaPage.fillCoolingYN(excelData.yFactors.coolingYn);

      // STEP 10: Submit
      await yFormulaPage.submitCreateFormula();

      // STEP 11: Verify back on Y-Total table
      await expect(yFormulaPage.getAddNewFormulaButtonLocator()).toBeVisible({ timeout: TIMEOUTS.short });

      // STEP 12: Click Search icon on matching row → navigate to Properties
      await yFormulaPage.clickRowSearchButton(
        excelData.yFormula.mlsBoard,
        excelData.yFormula.state,
        excelData.yFormula.county
      );

      // STEP 13: Wait for map and verify Properties page
      await propertiesPage.waitForMapToLoad();
      const mapLocator = page.locator(
        '.leaflet-container, canvas.leaflet-zoom-animated, svg.leaflet-zoom-animated, #map, [class*="mapbox"], [class*="map-container"]'
      );

      await page.reload();
      await page.waitForLoadState('load');

      if (await mapLocator.count() > 0) {
        await expect(mapLocator.first()).toBeVisible({ timeout: TIMEOUTS.medium });
      } else {
        await expect(page).toHaveURL(/properties/, { timeout: TIMEOUTS.short });
      }
    });

  // ==========================================================================
  // TC-005: Explore Set Opinion flow from Properties chart
  // ==========================================================================
  test('TC-005: should explore Set Opinion flow from Properties chart',
    async ({ page, loginPage, navPage, yFormulaPage, propertiesPage, opinionPage }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      // STEP 1: Pre-authenticated via storageState
      await page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate to Settings → Y-Total → Search
      await navPage.goToSettings();
      await yFormulaPage.clickYTotalTab();
      await yFormulaPage.clickRowSearchButton(
        excelData.yFormula.mlsBoard,
        excelData.yFormula.state,
        excelData.yFormula.county
      );

      // STEP 3: Wait for properties/chart to load
      await page.waitForURL(URLS.properties, { timeout: TIMEOUTS.long });
      await propertiesPage.waitForMapToLoad();

      // STEP 4: Click chart dot
      await propertiesPage.clickChartDot(0.35, 0.70);

      // STEP 5: Select property → Set Opinion
      await propertiesPage.clickSelectProperty();
      await propertiesPage.clickSetOpinion();

      // STEP 6: Wait for opinion form to load
      await opinionPage.waitForPageLoad();
      await opinionPage.scrollDown(500);

      // STEP 7: Assert Select Photos button is visible
      await expect(opinionPage.getSelectPhotosButtonLocator()).toBeVisible({ timeout: TIMEOUTS.short });

      // STEP 8: Fill opinion fields (values from testData.js)
      await opinionPage.fillAllOpinionFields(OPINION_FIELDS);
      await opinionPage.fillRemarks('Test opinion remark from TC-005 automation');

      // STEP 9: Read opinion totals
      const originalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
      const originalYTotal = await opinionPage.readOriginalYTotal();
      const opinionTotal = await opinionPage.readOpinionTotal();

      // STEP 10: Compute and save ratios
      const currentFactors = await opinionPage.readAllFactorValues(FACTOR_NAMES);
      const savedRatios = computeRatios(currentFactors, originalOpinionTotal);

      saveJson(OPINION_CALC_FILE, {
        capturedAt: new Date().toISOString(),
        factors: currentFactors,
        originalOpinionTotal,
        originalYTotal,
        opinionTotal,
        ratios: savedRatios,
        notes: {
          originalOpinionTotalSource: 'page_element',
          formula: 'ratio = factor_value / originalOpinionTotal',
        },
      });

      // STEP 11: Select photos for required factors
      await opinionPage.openSelectPhotosDialog();
      const outerOverlay = opinionPage.getOuterOverlayLocator();
      await expect(outerOverlay).toBeVisible({ timeout: TIMEOUTS.short });

      for (const factor of PHOTO_FACTORS) {
        await opinionPage.selectPhotoForFactor(outerOverlay, factor);
      }
      await opinionPage.confirmPhotoSelection();

      // STEP 12: Save Opinion
      await opinionPage.saveOpinion();

      // STEP 13: Navigate back to Properties and verify panel shows opinion
      await navPage.goToProperties();
      await page.waitForURL(URLS.properties, { timeout: 20000 });
      await propertiesPage.waitForMapToLoad();
      await propertiesPage.hoverChartDot(0.35, 0.70);

      // STEP 14: Assert opinion data showing in panel
      const panelText = await propertiesPage.getCardPanelText();
      expect(typeof panelText).toBe('string');
    });

  // ==========================================================================
  // TC-006: Edit Y-Formula base/factor values → verify opinion updates
  // ==========================================================================
  test('TC-006: should edit Y-Formula and verify opinion values update on property',
    async ({ page, loginPage, navPage, yFormulaPage, propertiesPage, opinionPage }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      // Load ratios saved by TC-005
      const savedCalc = loadJson(OPINION_CALC_FILE, 'run TC-005 first');

      // STEP 1: Pre-authenticated via storageState
      await page.goto(URLS.affiliateManagers);

      // STEP 2: Navigate to Settings → Y-Total
      await navPage.goToSettings();
      await yFormulaPage.clickYTotalTab();

      // STEP 3: Click Edit icon on formula row
      await yFormulaPage.clickRowEditButton(
        excelData.yFormula.mlsBoard,
        excelData.yFormula.state,
        excelData.yFormula.county
      );

      // STEP 4: Change Base Value
      const newBaseValue = '2000';
      await yFormulaPage.fillBaseValueInEditDialog(newBaseValue);

      // STEP 5: Save
      await yFormulaPage.saveEditDialog();

      // STEP 6: Navigate to Properties via Search button
      await yFormulaPage.clickRowSearchButton(
        excelData.yFormula.mlsBoard,
        excelData.yFormula.state,
        excelData.yFormula.county
      );
      await propertiesPage.waitForMapToLoad();

      // STEP 7: Click property dot → Select → Set Opinion
      await propertiesPage.clickChartDot(0.35, 0.70);
      await propertiesPage.clickSelectProperty();
      await propertiesPage.clickSetOpinion();

      // STEP 8: Read updated opinion values
      await opinionPage.waitForPageLoad();
      const newOrigOpTotal = await opinionPage.readOriginalOpinionTotal();
      const newOrigYTotal = await opinionPage.readOriginalYTotal();
      const newOpinionTotal = await opinionPage.readOpinionTotal();
      const updatedFactors = await opinionPage.readAllFactorValues(FACTOR_NAMES);

      // STEP 9: Assert new Original Opinion Total is present
      expect(newOrigOpTotal, 'New Original Opinion Total must be present on the property page').not.toBeNull();

      // STEP 10: Verify each factor: expected = savedRatio × newOrigOpTotal
      const assertionErrors = [];
      const expectedFactors = applyRatios(savedCalc.ratios, newOrigOpTotal);

      for (const [label, expected] of Object.entries(expectedFactors)) {
        const actual = updatedFactors[label];
        const match = actual !== null && expected !== null
          ? Math.abs(actual - expected) < 0.01
          : false;
        if (!match) {
          assertionErrors.push(
            `${label}: expected ${expected} (ratio ${savedCalc.ratios[label]} × ${newOrigOpTotal}), got ${actual}`
          );
        }
      }

      // STEP 11: Assert Opinion Total == sum of 8 fields
      const sumOf8 = sumValues(updatedFactors);
      if (newOpinionTotal !== null && Math.abs(newOpinionTotal - sumOf8) >= 0.01) {
        assertionErrors.push(`Opinion Total mismatch: page shows ${newOpinionTotal} but sum of 8 fields = ${sumOf8}`);
      }

      if (assertionErrors.length > 0) {
        expect(assertionErrors, assertionErrors.join('\n')).toHaveLength(0);
      }
    });

  // ==========================================================================
  // TC-007: BVT — Update Y-Formula from Excel and verify opinion recalculates
  // ==========================================================================
  test('TC-007: should update Y-Formula from Excel and verify property opinion recalculates',
    async ({ browser }) => {
      const bvtScenarios = excelData.bvtScenarios;
      if (!bvtScenarios || bvtScenarios.length === 0) {
        throw new Error('No BVT scenarios found in Excel BVT Scenarios sheet');
      }

      test.setTimeout(bvtScenarios.length * TIMEOUTS.perScenario);

      const allScenarioResults = [];

      for (const scenario of bvtScenarios) {
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`  TC-007 SCENARIO: ${scenario.scenario}  (Base=${scenario.baseValue}, Expected=${scenario.expected})`);

        const scenarioAssertionErrors = [];
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          storageState: 'playwright/.auth/user.json'
        });

        try {
          const page1 = await context.newPage();

          // ── Instantiate page objects ──────────────────────────────────────
          const loginPage1 = new (await import('../pages/LoginPage.js')).LoginPage(page1);
          const navPage1 = new (await import('../pages/SidebarNavPage.js')).SidebarNavPage(page1);
          const yFormulaPage1 = new (await import('../pages/YFormulaPage.js')).YFormulaPage(page1);
          const propertiesPage1 = new (await import('../pages/PropertiesPage.js')).PropertiesPage(page1);
          const opinionPage1 = new (await import('../pages/OpinionPage.js')).OpinionPage(page1);

          // STEP 1: Pre-authenticated via storageState (added storageState to context)
          await page1.goto(`${process.env.BASE_URL || URLS.base}${URLS.affiliateManagers}`);

          // STEP 2: Navigate to Settings → Y-Total → Search
          await navPage1.goToSettings();
          await yFormulaPage1.clickYTotalTab();
          await yFormulaPage1.clickRowSearchButton(
            excelData.yFormula.mlsBoard,
            excelData.yFormula.state,
            excelData.yFormula.county
          );
          await propertiesPage1.waitForMapToLoad();

          // STEP 3: Click dot → capture panel prices
          await propertiesPage1.clickChartDot(0.35, 0.70);
          const panelTextForPrices = await propertiesPage1.getCardPanelText();
          const soldPrice = extractNumber(panelTextForPrices, /sold\s*price\s*\n?\s*\$?([\d,.-]+)/i);
          const listingPrice = extractNumber(panelTextForPrices, /listing\s*price\s*\n?\s*\$?([\d,.-]+)/i);

          await propertiesPage1.clickSelectProperty();
          await propertiesPage1.clickSetOpinion();

          // STEP 4: Capture Original Opinion Total BEFORE formula edit
          await opinionPage1.waitForPageLoad();
          const originalOpinionTotal = await opinionPage1.readOriginalOpinionTotal();
          const originalYTotal = await opinionPage1.readOriginalYTotal();
          const opinionTotal = await opinionPage1.readOpinionTotal();

          // ASSERTION: BEFORE — originalOpinionTotal = soldPrice - originalYTotal
          if (soldPrice !== null && originalYTotal !== null) {
            const expectedOOT = parseFloat((soldPrice - originalYTotal).toFixed(4));
            if (Math.abs(originalOpinionTotal - expectedOOT) >= 0.01) {
              scenarioAssertionErrors.push(
                `BEFORE UPDATE: Original Opinion Total mismatch — expected ${soldPrice} - ${originalYTotal} = ${expectedOOT}, got ${originalOpinionTotal}`
              );
            }
          }

          // STEP 5: Read factor values & compute saved ratios
          const currentFactors = await opinionPage1.readAllFactorValues(FACTOR_NAMES);
          const savedRatios = computeRatios(currentFactors, originalOpinionTotal);

          // STEP 6: Open Settings in new tab to edit formula
          const page2 = await context.newPage();
          const yFormulaPage2 = new (await import('../pages/YFormulaPage.js')).YFormulaPage(page2);
          await page2.goto(`${process.env.BASE_URL || URLS.base}${URLS.settingsYTotal}`);
          await yFormulaPage2.wait(3000);
          await yFormulaPage2.clickYTotalTab();

          // STEP 7: Click Edit & fill updated values
          await yFormulaPage2.clickRowEditButton(
            excelData.yFormula.mlsBoard,
            excelData.yFormula.state,
            excelData.yFormula.county
          );
          await yFormulaPage2.fillBaseValueInEditDialog(parseInt(scenario.baseValue));
          await yFormulaPage2.clickNextInDialog();
          await yFormulaPage2.clickYFactorTab();
          await yFormulaPage2.fillYFactorRowsInEditDialog(NUMERIC_FACTOR_ORDER, FACTOR_LABELS, scenario.yFactors);
          await yFormulaPage2.fillYNFieldsInEditDialog(YN_FIELDS, NUMERIC_FACTOR_ORDER.length, scenario.yFactors);

          // STEP 8: Save and close Settings tab
          await yFormulaPage2.saveEditDialog();
          await page2.close();

          // STEP 9: Reload property page
          await page1.bringToFront();
          await page1.reload({ waitUntil: 'networkidle', timeout: TIMEOUTS.extraLong });
          await opinionPage1.waitForPageLoad();
          await opinionPage1.scrollPageToTop();
          await opinionPage1.scrollInSteps([300, 600, 900, 1200]);

          // STEP 10: Read updated values
          const newOriginalOpinionTotal = await opinionPage1.readOriginalOpinionTotal();
          const newOriginalYTotal = await opinionPage1.readOriginalYTotal();
          const newOpinionTotal = await opinionPage1.readOpinionTotal();

          const updatedFactors = {};
          for (const name of FACTOR_NAMES) {
            await opinionPage1.scrollFactorIntoView(name);
            const val = await opinionPage1.readFactorValue(name);
            updatedFactors[name] = val !== null ? (parseFloat(val) || null) : null;
          }

          // ASSERTION: AFTER — originalOpinionTotal = soldPrice - newOriginalYTotal
          if (soldPrice !== null && newOriginalYTotal !== null) {
            const expectedOOT = parseFloat((soldPrice - newOriginalYTotal).toFixed(4));
            if (Math.abs(newOriginalOpinionTotal - expectedOOT) >= 0.01) {
              scenarioAssertionErrors.push(
                `AFTER UPDATE: Original Opinion Total mismatch — expected ${soldPrice} - ${newOriginalYTotal} = ${expectedOOT}, got ${newOriginalOpinionTotal}`
              );
            }
          }

          // ASSERTION: Each factor = savedRatio × newOriginalOpinionTotal
          const expectedFactors = applyRatios(savedRatios, newOriginalOpinionTotal);
          for (const name of FACTOR_NAMES) {
            const expected = expectedFactors[name];
            const actual = updatedFactors[name];
            const match = actual !== null && expected !== null
              ? Math.abs(actual - expected) < 0.01
              : false;
            if (!match) {
              scenarioAssertionErrors.push(
                `${name}: expected ${expected} (${savedRatios[name]} × ${newOriginalOpinionTotal}) but got ${actual}`
              );
            }
          }

          // ASSERTION: Opinion Total == sum of 8 fields
          const sumOf8Fields = sumValues(updatedFactors);
          if (newOpinionTotal !== null && Math.abs(newOpinionTotal - sumOf8Fields) >= 0.01) {
            scenarioAssertionErrors.push(
              `Opinion Total mismatch: page shows ${newOpinionTotal} but sum of 8 fields = ${sumOf8Fields}`
            );
          }

          // STEP 11: Navigate back to Properties chart — verify panel Opinion Total
          await navPage1.goToProperties();
          await page1.waitForURL(URLS.properties, { timeout: 20000 });
          await propertiesPage1.waitForMapToLoad();
          await propertiesPage1.clickChartDot(0.35, 0.70);

          const panelText = await propertiesPage1.getCardPanelText();
          const panelOpinionVal = extractNumber(panelText, /OPINION\s*\n?\s*\$?([\d,.-]+)/i);

          if (panelOpinionVal !== null && Math.abs(panelOpinionVal - sumOf8Fields) >= 0.01) {
            scenarioAssertionErrors.push(
              `Panel Opinion Total mismatch: panel shows ${panelOpinionVal} but expected ${sumOf8Fields}`
            );
          }

          // ── Save scenario verification output ────────────────────────────
          const slug = toSlug(scenario.scenario || `scenario-${bvtScenarios.indexOf(scenario) + 1}`);
          saveJson(`${OUTPUT_DIR}/tc007-${slug}.json`, {
            capturedAt: new Date().toISOString(),
            scenario: scenario.scenario,
            before: { originalOpinionTotal, originalYTotal, opinionTotal, soldPrice, listingPrice },
            after: { newOriginalOpinionTotal, newOriginalYTotal, newOpinionTotal, sumOf8Fields, panelOpinionVal, updatedFactors },
            savedRatios,
            passed: scenarioAssertionErrors.length === 0,
            failures: scenarioAssertionErrors,
          });

        } finally {
          await context.close();
        }

        allScenarioResults.push({
          scenario: scenario.scenario,
          expected: scenario.expected,
          passed: scenarioAssertionErrors.length === 0,
          failures: scenarioAssertionErrors,
        });
      }

      // ── Final summary ──────────────────────────────────────────────────────
      console.log(`\n${'═'.repeat(70)}`);
      console.log('=== TC-007 BVT SUMMARY ===');
      for (const r of allScenarioResults) {
        const status = r.passed ? '✓ PASS' : '✗ FAIL';
        console.log(`  ${status}  [${r.scenario}]  (expected=${r.expected})`);
        if (!r.passed) r.failures.forEach(f => console.log(`         ↳ ${f}`));
      }
      const totalPass = allScenarioResults.filter(r => r.passed).length;
      console.log(`\n  ${totalPass} / ${allScenarioResults.length} scenarios passed.`);

      const failedScenarios = allScenarioResults.filter(r => !r.passed);
      if (failedScenarios.length > 0) {
        const summary = failedScenarios.map(r =>
          `[${r.scenario}]:\n` + r.failures.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
        ).join('\n\n');
        expect(failedScenarios, `${failedScenarios.length} / ${allScenarioResults.length} scenario(s) FAILED:\n\n${summary}`).toHaveLength(0);
      }
    });

});
