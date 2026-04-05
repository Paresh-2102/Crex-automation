// ============================================================
// File  : test-admin-opinion.spec.js
// Suite : Admin Opinion Flow
//
// Architecture:
//   • Page objects via fixtures/index.js (loginPage, navPage, yFormulaPage, opinionPage)
//   • All credentials / constants from utils/testData.js
//   • All I/O / math helpers from utils/helpers.js
//   • No raw locators in this file
//   • No inline helper functions in this file
// ============================================================

import { test, expect } from '../fixtures/index.js';
import { readExcelData } from '../test-data/read-excel-data.js';
import {
  URLS, FACTOR_NAMES,
  ADMIN_CREDENTIALS, AFM_CREDENTIALS, SA_CREDENTIALS,
  ADMIN_LABEL, AFM_LABEL, SA_LABEL,
  ADMIN_OPINION_VALUES, AFM_OPINION_VALUES, SA_OPINION_VALUES,
} from '../utils/testData.js';
import {
  sumValues, saveJson, loadJson,
  saveAdminOpinionResult, saveAfmOpinionResult, saveSubAgentOpinionResult,
  saveSharedOpinionData, readSharedOpinionData, extractOpinionId,
} from '../utils/helpers.js';

const PROPERTY_ID_ENV = process.env.PROPERTY_ID || 1006778;
const BASE_URL        = URLS.base;

/** Resolve property ID from env var or first BVT scenario row. */
function resolvePropertyId(data) {
  if (PROPERTY_ID_ENV) return PROPERTY_ID_ENV;
  const first = data.bvtScenarios?.[0];
  if (first?.propertyId) return String(first.propertyId);
  if (first?.scenario) {
    const m = String(first.scenario).match(/\d{5,}/);
    if (m) return m[0];
  }
  return null;
}

// ── Excel data loaded once ────────────────────────────────────────────────────
let excelData;
test.beforeAll(async () => {
  excelData = await readExcelData();
});

test.describe('Admin Opinion Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  // ============================================================================
  // ADM-001: Admin fills, saves and verifies opinion fields, then signs out
  // ============================================================================
  test('ADM-001: Admin fills, saves and verifies opinion fields, then signs out',
    async ({ loginPage, navPage, yFormulaPage, opinionPage }) => {
      test.setTimeout(3 * 60 * 1000);
      await opinionPage.page.setViewportSize({ width: 1440, height: 900 });

      // ── Resolve property ID ────────────────────────────────────────────────
      const propertyId = resolvePropertyId(excelData);
      if (!propertyId) throw new Error('Property ID not set. Provide PROPERTY_ID env var or add propertyId column to BVT Scenarios sheet.');
      const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
      console.log(`\n  Property ID  : ${propertyId}\n  Property URL : ${propertyUrl}`);

      // ── STEP 1: Login ──────────────────────────────────────────────────────
      console.log('\n── STEP 1: Login ────────────────────────────────────────');
      await loginPage.navigate();
      await loginPage.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await loginPage.page.waitForURL('**/affiliate-managers', { timeout: 15000 });
      // await page.goto(`${BASE_URL`);
      console.log('  ✓ Logged in');

      // ── STEP 2: Settings → Y-Total ─────────────────────────────────────────
      console.log('\n── STEP 2: Settings → Y-Total ───────────────────────────');
      await navPage.goToSettingsWithRetry();
      await yFormulaPage.clickYTotalTab();
      console.log('  ✓ On Y-Total tab');

      // ── STEP 3: Click Search on formula row ────────────────────────────────
      console.log('\n── STEP 3: Click Search on formula row ──────────────────');
      const { mlsBoard, state, county } = excelData.yFormula;
      await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
      await yFormulaPage.waitForLoadingSpinnerToHide(30000);
      await opinionPage.wait(3000);
      console.log('  ✓ Properties page loaded');

      // ── STEP 4: Navigate to property page ─────────────────────────────────
      console.log(`\n── STEP 4: Open property ${propertyId} ──────────────────`);
      await opinionPage.gotoPropertyAndWaitForLoad(propertyUrl);
      const propertyAddress = await opinionPage.readPropertyAddress();
      console.log(`  Property Address : ${propertyAddress}`);
      await opinionPage.page.screenshot({ path: 'screenshots/adm001-property-page.png' }).catch(() => {});
      console.log(`  ✓ Property page opened: ${opinionPage.page.url()}`);

      // ── STEP 5: Read Original Opinion Total ────────────────────────────────
      console.log('\n── STEP 5: Read Original Opinion Total ──────────────────');
      const originalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
      const originalYTotal       = await opinionPage.readOriginalYTotal();
      console.log(`  Original Opinion Total : ${originalOpinionTotal}`);
      console.log(`  Original Y Total       : ${originalYTotal}`);
      expect(originalOpinionTotal, 'Original Opinion Total must be readable').not.toBeNull();

      // ── STEP 6: Fill all 8 opinion fields ─────────────────────────────────
      console.log('\n── STEP 6: Fill all 8 opinion fields ────────────────────');
      const { viewData: adminViewData, ratioData: adminRatioData } =
        await opinionPage.fillAndRecordFactorFields(FACTOR_NAMES, ADMIN_LABEL, ADMIN_OPINION_VALUES, originalOpinionTotal);
      await opinionPage.page.screenshot({ path: 'screenshots/adm001-fields-filled.png' }).catch(() => {});

      // ── STEP 7: Log summary ────────────────────────────────────────────────
      console.log(`\n── STEP 7: Admin View & Ratio Summary ───────────────────`);
      console.log(`  ${'Field'.padEnd(22)} | Admin View | Admin Ratio`);
      console.log(`  ${'-'.repeat(54)}`);
      for (const name of FACTOR_NAMES) {
        const label = ADMIN_LABEL[name];
        console.log(`  ${label.padEnd(22)} | ${String(adminViewData[label]).padEnd(10)} | ${adminRatioData[`${label} ratio`]}`);
      }

      // ── STEP 8: Assert Opinion Total before Save ───────────────────────────
      console.log('\n── STEP 8: Assert Opinion Total before Save ─────────────');
      const sumOf8Fields = Object.values(adminViewData).reduce((s, v) => s + (v || 0), 0);
      await opinionPage.page.evaluate(() => window.scrollTo(0, 0));
      await opinionPage.wait(800);
      await opinionPage.page.screenshot({ path: 'screenshots/adm001-opinion-total-check.png' }).catch(() => {});
      const opinionTotalOnPage = await opinionPage.readOpinionTotalOnPage();
      const opinionTotalMatch  = opinionTotalOnPage !== null && Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
      console.log(`  Expected: ${sumOf8Fields}  |  Page shows: ${opinionTotalOnPage}  |  ${opinionTotalMatch ? '✓ PASS' : '✗ FAIL'}`);

      // ── STEP 9: Select Photos & Save Opinion ──────────────────────────────
      console.log('\n── STEP 9: Select Photos & Save Opinion ─────────────────');
      await opinionPage.selectRequiredPhotos();
      await opinionPage.wait(1000);
      const adminOpinionApi = await opinionPage.captureOpinionApiOnSave(() => opinionPage.saveOpinion());
      const adminOpinionId  = extractOpinionId(adminOpinionApi?.body);
      console.log(`  Admin Opinion ID : ${adminOpinionId}`);
      saveSharedOpinionData({ propertyId, propertyUrl, propertyAddress, adminOpinionId });
      await opinionPage.page.screenshot({ path: 'screenshots/adm001-after-save.png' }).catch(() => {});

      // ── STEP 10: Save result ───────────────────────────────────────────────
      saveAdminOpinionResult({
        capturedAt: new Date().toISOString(),
        propertyId, propertyUrl, propertyAddress, adminOpinionId,
        originalOpinionTotal, originalYTotal,
        sumOf8Fields, opinionTotalOnPage, opinionTotalMatch,
        ...adminViewData, ...adminRatioData,
        formula: 'admin <factor> ratio = admin <factor> / originalOpinionTotal',
      });
      console.log('  ✓ Result saved to output/admin-opinion-result.json');

      // ── STEP 11: Sign Out ──────────────────────────────────────────────────
      console.log('\n── STEP 11: Sign Out ────────────────────────────────────');
      await navPage.signOut('adm001');

      // ── Assertions ────────────────────────────────────────────────────────
      const unfilled = FACTOR_NAMES.filter(n => adminViewData[ADMIN_LABEL[n]] === null);
      expect(unfilled, `${unfilled.length} field(s) not filled: ${unfilled.join(', ')}`).toHaveLength(0);
      expect(opinionTotalOnPage, 'Opinion Total not found on property page').not.toBeNull();
      expect(Math.abs((opinionTotalOnPage ?? 0) - sumOf8Fields),
        `Opinion Total mismatch — page: ${opinionTotalOnPage}, expected: ${sumOf8Fields}`
      ).toBeLessThan(0.01);
      console.log('\n  ✓ ADM-001 COMPLETE');
    });

  // ============================================================================
  // ADM-002: Parameterised – run for each property ID in BVT Scenarios sheet
  // ============================================================================
  test('ADM-002: Admin opinion flow for each property ID in BVT Scenarios sheet',
    async ({ browser }) => {
      const propertyIds = [];
      if (PROPERTY_ID_ENV) {
        propertyIds.push(PROPERTY_ID_ENV);
      } else {
        for (const row of (excelData.bvtScenarios || [])) {
          if (row.propertyId) {
            propertyIds.push(String(row.propertyId));
          } else {
            const m = String(row.scenario || '').match(/\d{5,}/);
            if (m) propertyIds.push(m[0]);
          }
        }
      }
      if (propertyIds.length === 0) throw new Error('No property IDs found. Set PROPERTY_ID or add propertyId column to BVT Scenarios sheet.');

      test.setTimeout(propertyIds.length * 3 * 60 * 1000);
      console.log(`\n=== ADM-002: Running for ${propertyIds.length} property ID(s) ===`);
      propertyIds.forEach((id, i) => console.log(`  [${i + 1}] ${id}`));

      const { mlsBoard, state, county } = excelData.yFormula;
      const allResults = [];

      for (const propertyId of propertyIds) {
        console.log(`\n${'─'.repeat(60)}\n  Property ID: ${propertyId}`);
        const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        let originalOpinionTotal = null;

        try {
          const page          = await context.newPage();
          const loginPage     = new (await import('../pages/LoginPage.js')).LoginPage(page);
          const navPage       = new (await import('../pages/SidebarNavPage.js')).SidebarNavPage(page);
          const yFormulaPage  = new (await import('../pages/YFormulaPage.js')).YFormulaPage(page);
          const opinionPage   = new (await import('../pages/OpinionPage.js')).OpinionPage(page);

          await loginPage.navigate();
          await loginPage.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
          await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
          console.log('  ✓ Logged in');

          await navPage.goToSettingsWithRetry();
          await yFormulaPage.clickYTotalTabWithRetry();
          await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
          await yFormulaPage.waitForLoadingSpinnerToHide(30000);
          await opinionPage.wait(3000);
          console.log('  ✓ Properties page loaded');

          await opinionPage.gotoPropertyAndWaitForLoad(propertyUrl);
          originalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
          console.log(`  Original Opinion Total: ${originalOpinionTotal}`);

          const { viewData, ratioData } = await opinionPage.fillAndRecordFactorFields(
            FACTOR_NAMES, ADMIN_LABEL, ADMIN_OPINION_VALUES, originalOpinionTotal
          );

          const sumOf8Fields = Object.values(viewData).reduce((s, v) => s + (v || 0), 0);
          await page.evaluate(() => window.scrollTo(0, 0));
          await opinionPage.wait(800);
          const opinionTotalOnPage = await opinionPage.readOpinionTotalOnPage();
          const opinionTotalMatch  = opinionTotalOnPage !== null && Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
          console.log(`  Opinion Total on page: ${opinionTotalOnPage}  |  Expected: ${sumOf8Fields}  |  ${opinionTotalMatch ? '✓ PASS' : '✗ FAIL'}`);

          await opinionPage.selectRequiredPhotos();
          await opinionPage.wait(1000);
          await opinionPage.saveOpinion();

          await navPage.signOut('adm002');

          const allFilled = FACTOR_NAMES.every(n => viewData[ADMIN_LABEL[n]] !== null);
          allResults.push({
            propertyId, propertyUrl, originalOpinionTotal,
            sumOf8Fields, opinionTotalOnPage, opinionTotalMatch,
            ...viewData, ...ratioData,
            passed: allFilled && opinionTotalMatch,
          });
        } finally {
          await context.close();
        }
      }

      saveJson('output/admin-opinion-all-results.json', {
        capturedAt: new Date().toISOString(),
        formula: 'admin <factor> ratio = admin <factor> / originalOpinionTotal',
        results: allResults,
      });

      console.log(`\n${'═'.repeat(60)}\n=== ADM-002 SUMMARY ===`);
      const failed = allResults.filter(r => !r.passed);
      allResults.forEach(r => console.log(`  ${r.passed ? '✓ PASS' : '✗ FAIL'}  Property ${r.propertyId}`));
      console.log(`\n  ${allResults.length - failed.length} / ${allResults.length} properties passed.`);
      expect(failed, `${failed.length} property/ies failed: ${failed.map(r => r.propertyId).join(', ')}`).toHaveLength(0);
    });

  // ============================================================================
  // AFM-001: Affiliate Manager fills, saves and verifies opinion fields
  // ============================================================================
  test('AFM-001: Affiliate Manager fills, saves and verifies opinion fields, then signs out',
    async ({ loginPage, navPage, yFormulaPage, opinionPage }) => {
      test.setTimeout(3 * 60 * 1000);
      await opinionPage.page.setViewportSize({ width: 1440, height: 900 });

      const propertyId = resolvePropertyId(excelData);
      if (!propertyId) throw new Error('Property ID not set. Provide PROPERTY_ID env var or add propertyId column to BVT Scenarios sheet.');
      const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
      console.log(`\n  Property ID  : ${propertyId}\n  Property URL : ${propertyUrl}`);

      // ── STEP 1: Login (Affiliate Manager) ─────────────────────────────────
      console.log('\n── STEP 1: Login (Affiliate Manager) ────────────────────');
      await loginPage.navigate();
      await loginPage.login(AFM_CREDENTIALS.email, AFM_CREDENTIALS.password);
      await loginPage.page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
      console.log(`  ✓ Logged in — URL: ${loginPage.page.url()}`);

      // ── STEP 2: Settings → Y-Total ─────────────────────────────────────────
      console.log('\n── STEP 2: Settings → Y-Total ───────────────────────────');
      await navPage.goToSettingsWithRetry();
      await yFormulaPage.clickYTotalTabWithRetry();
      console.log('  ✓ On Y-Total tab');

      // ── STEP 3: Click Search on formula row ────────────────────────────────
      const { mlsBoard, state, county } = excelData.yFormula;
      await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
      await yFormulaPage.waitForLoadingSpinnerToHide(30000);
      await opinionPage.wait(3000);
      console.log('  ✓ Properties page loaded');

      // ── STEP 3.5: Open opinion URL → assert admin pre-fill ─────────────────
      console.log('\n── STEP 3.5: Open admin opinion URL — assert pre-fill ───');
      const shared = readSharedOpinionData();
      const adminOpinionId = shared.adminOpinionId;
      const afmAlreadyFilled = !!shared.afmOpinionId;
      const propertyAddress = shared.propertyAddress || '';
      if (adminOpinionId) {
        const encodedName = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
        const opinionUrl  = `${propertyUrl}?name=${encodedName}&type=opinion&opinionId=${adminOpinionId}`;
        console.log(`  Admin Opinion ID : ${adminOpinionId}\n  Opinion URL      : ${opinionUrl}`);
        await opinionPage.gotoOpinionUrlAndScroll(opinionUrl);
        await opinionPage.page.screenshot({ path: 'screenshots/afm001-opinion-url-opened.png' }).catch(() => {});
        console.log('\n── AFM-001 PRE-FILL ASSERTION: Admin values visible in AFM account');
        await opinionPage.assertFactorPrefills(FACTOR_NAMES, ADMIN_OPINION_VALUES, afmAlreadyFilled, 'admin');
      } else {
        console.log('  ⚠  No admin opinion ID — skipping pre-fill check (run ADM-001 first)');
      }

      // ── STEP 4: Navigate to property for filling ───────────────────────────
      console.log(`\n── STEP 4: Open property ${propertyId} for filling ──────`);
      await opinionPage.gotoPropertyAndWaitForLoad(propertyUrl);
      await opinionPage.page.screenshot({ path: 'screenshots/afm001-property-page.png' }).catch(() => {});

      // ── STEP 5: Read Original Opinion Total ────────────────────────────────
      const originalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
      const originalYTotal       = await opinionPage.readOriginalYTotal();
      console.log(`  Original Opinion Total : ${originalOpinionTotal}`);
      expect(originalOpinionTotal).not.toBeNull();

      // ── STEP 6: Fill all 8 fields ──────────────────────────────────────────
      console.log('\n── STEP 6: Fill all 8 opinion fields ────────────────────');
      const { viewData: afmViewData, ratioData: afmRatioData } =
        await opinionPage.fillAndRecordFactorFields(FACTOR_NAMES, AFM_LABEL, AFM_OPINION_VALUES, originalOpinionTotal);
      await opinionPage.page.screenshot({ path: 'screenshots/afm001-fields-filled.png' }).catch(() => {});

      // ── STEP 7: Log summary ────────────────────────────────────────────────
      console.log(`\n  ${'Field'.padEnd(34)} | Value | Ratio`);
      console.log(`  ${'-'.repeat(60)}`);
      for (const name of FACTOR_NAMES) {
        const label = AFM_LABEL[name];
        console.log(`  ${label.padEnd(34)} | ${String(afmViewData[label]).padEnd(5)} | ${afmRatioData[`${label} ratio`]}`);
      }

      // ── STEP 8: Assert Opinion Total before Save ───────────────────────────
      const sumOf8Fields = Object.values(afmViewData).reduce((s, v) => s + (v || 0), 0);
      await opinionPage.page.evaluate(() => window.scrollTo(0, 0));
      await opinionPage.wait(800);
      await opinionPage.page.screenshot({ path: 'screenshots/afm001-opinion-total-check.png' }).catch(() => {});
      const opinionTotalOnPage = await opinionPage.readOpinionTotalOnPage();
      const opinionTotalMatch  = opinionTotalOnPage !== null && Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
      console.log(`  Expected: ${sumOf8Fields}  |  Page shows: ${opinionTotalOnPage}  |  ${opinionTotalMatch ? '✓ PASS' : '✗ FAIL'}`);

      // ── STEP 9: Select Photos & Save Opinion ──────────────────────────────
      console.log('\n── STEP 9: Select Photos & Save Opinion ─────────────────');
      await opinionPage.selectRequiredPhotos();
      await opinionPage.wait(1000);
      const afmOpinionApi = await opinionPage.captureOpinionApiOnSave(() => opinionPage.saveOpinion());
      const afmOpinionId  = extractOpinionId(afmOpinionApi?.body);
      console.log(`  AFM Opinion ID : ${afmOpinionId}`);
      if (afmOpinionId) saveSharedOpinionData({ afmOpinionId });
      await opinionPage.page.screenshot({ path: 'screenshots/afm001-after-save.png' }).catch(() => {});

      // ── STEP 10: Save result ───────────────────────────────────────────────
      saveAfmOpinionResult({
        capturedAt: new Date().toISOString(),
        propertyId, propertyUrl, afmOpinionId,
        originalOpinionTotal, originalYTotal,
        sumOf8Fields, opinionTotalOnPage, opinionTotalMatch,
        ...afmViewData, ...afmRatioData,
        formula: 'Affiliate manager <factor> ratio = Affiliate manager <factor> / originalOpinionTotal',
      });
      console.log('  ✓ Result saved to output/affiliate-manager-opinion-result.json');

      // ── STEP 11: Sign Out ──────────────────────────────────────────────────
      console.log('\n── STEP 11: Sign Out ────────────────────────────────────');
      await navPage.signOut('afm001');

      // ── Assertions ────────────────────────────────────────────────────────
      const unfilled = FACTOR_NAMES.filter(n => afmViewData[AFM_LABEL[n]] === null);
      expect(unfilled, `${unfilled.length} field(s) not filled`).toHaveLength(0);
      expect(opinionTotalOnPage).not.toBeNull();
      expect(Math.abs((opinionTotalOnPage ?? 0) - sumOf8Fields)).toBeLessThan(0.01);
      console.log('\n  ✓ AFM-001 COMPLETE');
    });

  // ============================================================================
  // AFM-002: Parameterised – Affiliate Manager for each property in BVT sheet
  // ============================================================================
  test('AFM-002: Affiliate Manager opinion flow for each property ID in BVT Scenarios sheet',
    async ({ browser }) => {
      const propertyIds = [];
      if (PROPERTY_ID_ENV) {
        propertyIds.push(PROPERTY_ID_ENV);
      } else {
        for (const row of (excelData.bvtScenarios || [])) {
          if (row.propertyId) propertyIds.push(String(row.propertyId));
          else {
            const m = String(row.scenario || '').match(/\d{5,}/);
            if (m) propertyIds.push(m[0]);
          }
        }
      }
      if (propertyIds.length === 0) throw new Error('No property IDs found.');
      test.setTimeout(propertyIds.length * 3 * 60 * 1000);

      const { mlsBoard, state, county } = excelData.yFormula;
      const allResults = [];

      for (const propertyId of propertyIds) {
        const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const page         = await context.newPage();
          const loginPage    = new (await import('../pages/LoginPage.js')).LoginPage(page);
          const navPage      = new (await import('../pages/SidebarNavPage.js')).SidebarNavPage(page);
          const yFormulaPage = new (await import('../pages/YFormulaPage.js')).YFormulaPage(page);
          const opinionPage  = new (await import('../pages/OpinionPage.js')).OpinionPage(page);

          await loginPage.navigate();
          await loginPage.login(AFM_CREDENTIALS.email, AFM_CREDENTIALS.password);
          await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });

          await navPage.goToSettingsWithRetry();
          await yFormulaPage.clickYTotalTabWithRetry();
          await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
          await yFormulaPage.waitForLoadingSpinnerToHide(30000);
          await opinionPage.wait(3000);

          await opinionPage.gotoPropertyAndWaitForLoad(propertyUrl);
          const originalOpinionTotal = await opinionPage.readOriginalOpinionTotal();

          const { viewData, ratioData } = await opinionPage.fillAndRecordFactorFields(
            FACTOR_NAMES, AFM_LABEL, AFM_OPINION_VALUES, originalOpinionTotal
          );

          const sumOf8Fields      = Object.values(viewData).reduce((s, v) => s + (v || 0), 0);
          await page.evaluate(() => window.scrollTo(0, 0));
          await opinionPage.wait(800);
          const opinionTotalOnPage = await opinionPage.readOpinionTotalOnPage();
          const opinionTotalMatch  = opinionTotalOnPage !== null && Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;

          await opinionPage.selectRequiredPhotos();
          await opinionPage.wait(1000);
          await opinionPage.saveOpinion();
          await navPage.signOut('afm002');

          allResults.push({
            propertyId, propertyUrl, originalOpinionTotal,
            sumOf8Fields, opinionTotalOnPage, opinionTotalMatch,
            ...viewData, ...ratioData,
            passed: FACTOR_NAMES.every(n => viewData[AFM_LABEL[n]] !== null) && opinionTotalMatch,
          });
        } finally {
          await context.close();
        }
      }

      saveJson('output/affiliate-manager-opinion-all-results.json', {
        capturedAt: new Date().toISOString(),
        formula: 'Affiliate manager <factor> ratio = Affiliate manager <factor> / originalOpinionTotal',
        results: allResults,
      });

      const failed = allResults.filter(r => !r.passed);
      expect(failed, `${failed.length} property/ies failed`).toHaveLength(0);
    });

  // ============================================================================
  // SA-001: Sub Agent fills, saves and verifies opinion fields, then signs out
  // ============================================================================
  test('SA-001: Sub Agent fills, saves and verifies opinion fields, then signs out',
    async ({ loginPage, navPage, yFormulaPage, opinionPage }) => {
      test.setTimeout(4 * 60 * 1000);
      await opinionPage.page.setViewportSize({ width: 1440, height: 900 });

      const propertyId = resolvePropertyId(excelData);
      if (!propertyId) throw new Error('Property ID not set.');
      const propertyUrl = `${BASE_URL}/properties/${propertyId}`;

      // ── STEP 1: Login (Sub Agent) ──────────────────────────────────────────
      console.log('\n── STEP 1: Login (Sub Agent) ────────────────────────────');
      await loginPage.navigate();
      await loginPage.login(SA_CREDENTIALS.email, SA_CREDENTIALS.password);
      await loginPage.page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
      console.log(`  ✓ Logged in — URL: ${loginPage.page.url()}`);

      // ── STEP 2: Settings → Y-Total ─────────────────────────────────────────
      await navPage.goToSettingsWithRetry();
      await yFormulaPage.clickYTotalTabWithRetry();

      // ── STEP 3: Click Search on formula row ────────────────────────────────
      const { mlsBoard, state, county } = excelData.yFormula;
      await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
      await yFormulaPage.waitForLoadingSpinnerToHide(30000);
      await opinionPage.wait(3000);
      console.log('  ✓ Properties page loaded');

      // ── STEP 4: Open AFM opinion URL → assert AFM pre-fill ─────────────────
      console.log('\n── STEP 4: Open AFM opinion URL — assert pre-fill ───────');
      const shared = readSharedOpinionData();
      const afmOpinionId   = shared.afmOpinionId;
      const saAlreadyFilled = !!shared.saOpinionId;
      const propertyAddress = shared.propertyAddress || '';
      const afmPreFillAssertions = [];
      if (afmOpinionId) {
        const encodedName  = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
        const opinionUrlSa = `${propertyUrl}?name=${encodedName}&type=opinion&opinionId=${afmOpinionId}`;
        console.log(`  AFM Opinion ID : ${afmOpinionId}\n  Opinion URL    : ${opinionUrlSa}`);
        await opinionPage.gotoOpinionUrlAndScroll(opinionUrlSa);
        await opinionPage.page.screenshot({ path: 'screenshots/sa001-opinion-url-opened.png' }).catch(() => {});
        console.log('\n── SA-001 PRE-FILL ASSERTION: AFM values visible in Sub Agent account');
        const results = await opinionPage.assertFactorPrefills(FACTOR_NAMES, AFM_OPINION_VALUES, saAlreadyFilled, 'AFM');
        afmPreFillAssertions.push(...results);
      } else {
        console.log('  ⚠  No AFM opinion ID — skipping pre-fill check (run AFM-001 first)');
      }

      // ── STEP 7: Back to property page ─────────────────────────────────────
      console.log(`\n── STEP 7: Back to property ${propertyId} ───────────────`);
      await opinionPage.gotoPropertyAndWaitForLoad(propertyUrl);

      // ── STEP 8: Read Original Opinion Total ────────────────────────────────
      const originalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
      const originalYTotal       = await opinionPage.readOriginalYTotal();
      expect(originalOpinionTotal).not.toBeNull();

      // ── STEP 9: Fill sub agent values (assert admin values NOT visible) ─────
      console.log('\n── STEP 9: Fill sub agent values ────────────────────────');
      const { viewData: saViewData, ratioData: saRatioData } =
        await opinionPage.fillAndRecordFactorFields(
          FACTOR_NAMES, SA_LABEL, SA_OPINION_VALUES, originalOpinionTotal,
          { forbiddenValues: ADMIN_OPINION_VALUES }
        );
      await opinionPage.page.screenshot({ path: 'screenshots/sa001-fields-filled.png' }).catch(() => {});

      // ── STEP 10: Log summary ───────────────────────────────────────────────
      console.log(`\n  ${'Field'.padEnd(26)} | Value | Ratio`);
      console.log(`  ${'-'.repeat(55)}`);
      for (const name of FACTOR_NAMES) {
        const label = SA_LABEL[name];
        console.log(`  ${label.padEnd(26)} | ${String(saViewData[label]).padEnd(5)} | ${saRatioData[`${label} ratio`]}`);
      }

      // ── STEP 11: Assert Opinion Total before Save ──────────────────────────
      const sumOf8Fields = Object.values(saViewData).reduce((s, v) => s + (v || 0), 0);
      await opinionPage.page.evaluate(() => window.scrollTo(0, 0));
      await opinionPage.wait(800);
      await opinionPage.page.screenshot({ path: 'screenshots/sa001-opinion-total-check.png' }).catch(() => {});
      const opinionTotalOnPage = await opinionPage.readOpinionTotalOnPage();
      const opinionTotalMatch  = opinionTotalOnPage !== null && Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
      console.log(`  Expected: ${sumOf8Fields}  |  Page shows: ${opinionTotalOnPage}  |  ${opinionTotalMatch ? '✓ PASS' : '✗ FAIL'}`);

      // ── STEP 12: Select Photos & Save Opinion ─────────────────────────────
      console.log('\n── STEP 12: Select Photos & Save Opinion ────────────────');
      await opinionPage.selectRequiredPhotos();
      await opinionPage.wait(1000);
      await opinionPage.page.screenshot({ path: 'screenshots/sa001-before-save.png' }).catch(() => {});
      const saOpinionApi = await opinionPage.captureOpinionApiOnSave(() => opinionPage.saveOpinion());
      const saOpinionId  = extractOpinionId(saOpinionApi?.body);
      if (saOpinionId) {
        saveSharedOpinionData({ saOpinionId });
        console.log('  ✓ SA opinion ID saved to shared-opinion-data.json');
      }

      // ── STEP 13: Re-open property → verify Opinion Total after Save ─────────
      console.log('\n── STEP 13: Verify Opinion Total after Save ─────────────');
      await opinionPage.gotoPropertyAndWaitForLoad(propertyUrl);
      await opinionPage.page.evaluate(() => window.scrollTo(0, 0));
      await opinionPage.wait(1500);
      await opinionPage.page.screenshot({ path: 'screenshots/sa001-post-save-property.png' }).catch(() => {});
      const opinionTotalAfterSave = await opinionPage.readOpinionTotalOnPage();
      const postSaveMatch = opinionTotalAfterSave !== null && Math.abs(opinionTotalAfterSave - sumOf8Fields) < 0.01;
      console.log(`  Sum of 8 fields: ${sumOf8Fields}  |  Page after save: ${opinionTotalAfterSave}  |  ${postSaveMatch ? '✓ PASS' : '✗ FAIL'}`);
      await opinionPage.page.screenshot({ path: 'screenshots/sa001-opinion-total-post-save.png' }).catch(() => {});

      // ── STEP 14: Save result ───────────────────────────────────────────────
      saveSubAgentOpinionResult({
        capturedAt: new Date().toISOString(),
        propertyId, propertyUrl, originalOpinionTotal, originalYTotal,
        afmPreFillCheck: afmPreFillAssertions,
        sumOf8Fields, opinionTotalOnPage, opinionTotalMatch,
        opinionTotalAfterSave, postSaveMatch,
        ...saViewData, ...saRatioData,
        formula: 'sub agent <factor> ratio = sub agent <factor> / originalOpinionTotal',
      });
      console.log('  ✓ Result saved to output/sub-agent-opinion-result.json');

      // ── STEP 15: Open average opinion URL & assert ─────────────────────────
      console.log('\n── STEP 15: Open average opinion URL ────────────────────');
      const sharedForAvg  = readSharedOpinionData();
      const afmIdForAvg   = sharedForAvg.afmOpinionId;
      const avgOpinionId  = afmIdForAvg ? afmIdForAvg + 1 : null;
      const avgPropertyId = sharedForAvg.propertyId || propertyId;
      const avgUrl = `${BASE_URL}/properties/${avgPropertyId}?name=2291+Nicolle+Avenue&type=average&opinionId=${avgOpinionId}`;
      console.log(`  Average URL: ${avgUrl}`);
      await opinionPage.gotoOpinionUrlAndScroll(avgUrl);
      await opinionPage.page.screenshot({ path: 'screenshots/sa001-average-opinion-url.png' }).catch(() => {});
      expect(opinionPage.page.url(), `Average URL should contain property ID ${avgPropertyId}`).toContain(String(avgPropertyId));
      console.log('  ✓ Average opinion URL opened and verified');

      // Assert average factor values
      let adminResult = {}; let afmResult = {};
      try { adminResult = loadJson('output/admin-opinion-result.json'); } catch { /* ok */ }
      try { afmResult   = loadJson('output/affiliate-manager-opinion-result.json'); } catch { /* ok */ }

      console.log('\n── SA-001 AVERAGE URL ASSERTION: (Admin + AFM + SA) / 3 per factor');
      console.log(`  ${'Factor'.padEnd(12)} | Admin | AFM | SA | Expected Avg | Page Value | Result`);
      console.log(`  ${'-'.repeat(80)}`);

      for (const name of FACTOR_NAMES) {
        const adminVal = adminResult[ADMIN_LABEL[name]] ?? null;
        const afmVal   = afmResult[AFM_LABEL[name]] ?? null;
        const saVal    = saViewData[SA_LABEL[name]] ?? null;
        if (adminVal === null || afmVal === null || saVal === null) {
          console.log(`  ${name.padEnd(12)} | missing values — skipping`);
          continue;
        }
        const expectedAvg = parseFloat(((adminVal + afmVal + saVal) / 3).toFixed(4));
        const input     = opinionPage._factorInput(name);
        await input.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await opinionPage.wait(400);
        const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
        let pageVal = null;
        if (isVisible) {
          const raw = await input.inputValue().catch(() => null);
          pageVal = raw !== null ? parseFloat(raw) : null;
        }
        const isMatch     = pageVal !== null && Math.abs(pageVal - expectedAvg) < 0.01;
        const resultLabel = isMatch ? '✓ PASS' : (pageVal === null ? '⚠ NOT FOUND' : '✗ FAIL');
        console.log(`  ${name.padEnd(12)} | ${String(adminVal).padEnd(5)} | ${String(afmVal).padEnd(3)} | ${String(saVal).padEnd(2)} | ${String(expectedAvg).padEnd(12)} | ${String(pageVal ?? '(empty)').padEnd(10)} | ${resultLabel}`);
        expect.soft(pageVal, `${name} avg mismatch — expected ${expectedAvg}, got ${pageVal}`).toBeCloseTo(expectedAvg, 2);
      }

      // ── STEP 16: Sign Out ──────────────────────────────────────────────────
      console.log('\n── STEP 16: Sign Out ────────────────────────────────────');
      await navPage.signOut('sa001');

      // ── Assertions ────────────────────────────────────────────────────────
      const unfilled = FACTOR_NAMES.filter(n => saViewData[SA_LABEL[n]] === null);
      expect(unfilled, `${unfilled.length} field(s) not filled`).toHaveLength(0);
      expect(opinionTotalOnPage).not.toBeNull();
      expect(Math.abs((opinionTotalOnPage ?? 0) - sumOf8Fields)).toBeLessThan(0.01);
      expect(opinionTotalAfterSave).not.toBeNull();
      expect(Math.abs((opinionTotalAfterSave ?? 0) - sumOf8Fields)).toBeLessThan(0.01);
      console.log('\n  ✓ SA-001 COMPLETE');
    });

  // ============================================================================
  // ADM-003: Update Y-formula base value → verify admin opinion field values updated
  // ============================================================================
  test('ADM-003: Update Y-formula base value → verify admin opinion field values updated → save opinion → sign out',
    async ({ loginPage, navPage, yFormulaPage, opinionPage }) => {
      test.setTimeout(5 * 60 * 1000);
      await opinionPage.page.setViewportSize({ width: 1440, height: 900 });

      const shared          = readSharedOpinionData();
      const propertyId      = shared.propertyId || PROPERTY_ID_ENV;
      const propertyAddress = shared.propertyAddress || '';
      const adminOpinionId  = shared.adminOpinionId;
      if (!propertyId)     throw new Error('No propertyId in shared-opinion-data.json — run ADM-001 first');
      if (!adminOpinionId) throw new Error('No adminOpinionId in shared-opinion-data.json — run ADM-001 first');

      let savedAdminResult = {};
      try { savedAdminResult = loadJson('output/admin-opinion-result.json'); } catch { /* ok */ }

      const propertyUrl  = `${BASE_URL}/properties/${propertyId}`;
      const newBaseValue = process.env.NEW_BASE_VALUE || '120';
      console.log(`\n  Property ID: ${propertyId}  |  Admin Opinion ID: ${adminOpinionId}  |  New Base Value: ${newBaseValue}`);

      // ── STEP 1: Login ──────────────────────────────────────────────────────
      await loginPage.navigate();
      await loginPage.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await loginPage.page.waitForURL('**/affiliate-managers', { timeout: 15000 });
      console.log('  ✓ Logged in');

      // ── STEP 2: Settings → Y-Total ─────────────────────────────────────────
      await navPage.goToSettingsWithRetry();
      await yFormulaPage.clickYTotalTab();
      await opinionPage.wait(2000);

      // ── STEP 3: Click Edit icon on formula row ─────────────────────────────
      console.log('\n── STEP 3: Click Edit icon on formula row ───────────────');
      const { mlsBoard, state, county } = excelData.yFormula;
      await yFormulaPage.clickRowEditButton(mlsBoard, state, county);
      await opinionPage.page.screenshot({ path: 'screenshots/adm003-edit-dialog-opened.png' }).catch(() => {});
      console.log('  ✓ Edit dialog opened');

      // ── STEP 4 & 5: Update Base Value and Save ─────────────────────────────
      console.log(`\n── STEP 4: Update Base Value to ${newBaseValue} ──────────`);
      await yFormulaPage.updateBaseValueAndSave(newBaseValue);
      await yFormulaPage.waitForLoadingSpinnerToHide(15000);
      await opinionPage.wait(2000);
      await opinionPage.page.screenshot({ path: 'screenshots/adm003-after-dialog-save.png' }).catch(() => {});

      // ── STEP 6: Click Search icon ──────────────────────────────────────────
      console.log('\n── STEP 6: Click Search on formula row ──────────────────');
      await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
      await yFormulaPage.waitForLoadingSpinnerToHide(30000);
      await opinionPage.wait(3000);
      console.log('  ✓ Properties page loaded');

      // ── STEP 7: Open admin opinion URL ────────────────────────────────────
      console.log('\n── STEP 7: Open admin opinion URL ───────────────────────');
      const encodedAddress  = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
      const adminOpinionUrl = `${propertyUrl}?name=${encodedAddress}&type=opinion&opinionId=${adminOpinionId}`;
      console.log(`  Admin Opinion URL: ${adminOpinionUrl}`);
      await opinionPage.gotoOpinionUrlAndScroll(adminOpinionUrl);
      await opinionPage.page.screenshot({ path: 'screenshots/adm003-opinion-url-opened.png' }).catch(() => {});

      // ── STEP 8: Read new Original Opinion Total ───────────────────────────
      console.log('\n── STEP 8: Read new Original Opinion Total ──────────────');
      await opinionPage.page.evaluate(() => window.scrollTo(0, 0));
      await opinionPage.wait(500);
      const newOriginalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
      console.log(`  New Original Opinion Total: ${newOriginalOpinionTotal}`);

      // ── STEP 9: Assert factor fields match saved ratio × new total ─────────
      console.log('\n── STEP 9: Assert all factor field values ────────────────────────────');
      console.log('  ADM-003: UPDATED Y-FORMULA OPINION FIELD ASSERTION');
      const { updatedViewData, updatedRatioData, allPass } =
        await opinionPage.assertFactorRatioUpdate(FACTOR_NAMES, ADMIN_LABEL, savedAdminResult, newOriginalOpinionTotal);
      console.log(`  Overall Result: ${allPass ? '✓ ALL FACTORS UPDATED CORRECTLY' : '✗ SOME FACTORS NOT UPDATING'}`);
      await opinionPage.page.screenshot({ path: 'screenshots/adm003-factor-assertions.png' }).catch(() => {});

      // ── STEP 10: Update admin-opinion-result.json ─────────────────────────
      saveAdminOpinionResult({
        ...savedAdminResult,
        capturedAt: new Date().toISOString(),
        newBaseValue, newOriginalOpinionTotal,
        ...updatedViewData, ...updatedRatioData,
        formulaUpdateNote: `Base value updated to ${newBaseValue}; values recalculated from ratios × ${newOriginalOpinionTotal}`,
      });
      console.log('  ✓ admin-opinion-result.json updated');

      // ── STEP 11: Save Opinion ──────────────────────────────────────────────
      console.log('\n── STEP 11: Save Opinion ────────────────────────────────');
      await opinionPage.selectRequiredPhotos();
      await opinionPage.wait(1000);
      await opinionPage.saveOpinion();
      await opinionPage.page.screenshot({ path: 'screenshots/adm003-after-save.png' }).catch(() => {});

      // ── STEP 12: Sign Out ──────────────────────────────────────────────────
      console.log('\n── STEP 12: Sign Out ────────────────────────────────────');
      await navPage.signOut('adm003');

      expect(allPass, 'One or more factor field values did not match admin ratio × new original opinion total').toBe(true);
      console.log('\n  ✓ ADM-003 COMPLETE');
    });

  // ============================================================================
  // AFM-003: Verify affiliate manager opinion fields reflect updated Y-formula
  // ============================================================================
  test('AFM-003: Verify affiliate manager opinion field values reflect updated Y-formula (login → settings search → opinion URL → assert)',
    async ({ loginPage, navPage, yFormulaPage, opinionPage }) => {
      test.setTimeout(5 * 60 * 1000);
      await opinionPage.page.setViewportSize({ width: 1440, height: 900 });

      const shared          = readSharedOpinionData();
      const propertyId      = shared.propertyId || PROPERTY_ID_ENV;
      const propertyAddress = shared.propertyAddress || '';
      const afmOpinionId    = shared.afmOpinionId;
      if (!propertyId)   throw new Error('No propertyId — run AFM-001 first');
      if (!afmOpinionId) throw new Error('No afmOpinionId — run AFM-001 first');

      let savedAfmResult = {};
      try { savedAfmResult = loadJson('output/affiliate-manager-opinion-result.json'); } catch { /* ok */ }

      const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
      console.log(`\n  Property ID: ${propertyId}  |  AFM Opinion ID: ${afmOpinionId}`);

      // ── STEP 1: Login (Affiliate Manager) ─────────────────────────────────
      await loginPage.navigate();
      await loginPage.login(AFM_CREDENTIALS.email, AFM_CREDENTIALS.password);
      await loginPage.page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
      console.log(`  ✓ Logged in — URL: ${loginPage.page.url()}`);

      // ── STEP 2: Settings → Y-Total ─────────────────────────────────────────
      await navPage.goToSettingsWithRetry();
      await yFormulaPage.clickYTotalTabWithRetry();

      // ── STEP 3: Click Search on formula row ────────────────────────────────
      const { mlsBoard, state, county } = excelData.yFormula;
      await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
      await yFormulaPage.waitForLoadingSpinnerToHide(30000);
      await opinionPage.wait(3000);
      console.log('  ✓ Properties page loaded');

      // ── STEP 4: Open AFM opinion URL ──────────────────────────────────────
      const encodedAddress = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
      const afmOpinionUrl  = `${propertyUrl}?name=${encodedAddress}&type=opinion&opinionId=${afmOpinionId}`;
      console.log(`\n── STEP 4: Open AFM opinion URL → ${afmOpinionUrl}`);
      await opinionPage.gotoOpinionUrlAndScroll(afmOpinionUrl);
      await opinionPage.page.screenshot({ path: 'screenshots/afm003-opinion-url-opened.png' }).catch(() => {});

      // ── STEP 5: Read new Original Opinion Total ───────────────────────────
      await opinionPage.page.evaluate(() => window.scrollTo(0, 0));
      await opinionPage.wait(500);
      const newOriginalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
      console.log(`  New Original Opinion Total: ${newOriginalOpinionTotal}`);

      // ── STEP 6: Assert factor fields = afmRatio × newTotal ────────────────
      console.log('\n── STEP 6: Assert all factor field values (AFM) ────────────────────');
      console.log('  AFM-003: UPDATED Y-FORMULA OPINION FIELD ASSERTION (Affiliate Manager)');
      const { updatedViewData, updatedRatioData, allPass } =
        await opinionPage.assertFactorRatioUpdate(FACTOR_NAMES, AFM_LABEL, savedAfmResult, newOriginalOpinionTotal);
      console.log(`  Overall Result: ${allPass ? '✓ ALL FACTORS UPDATED CORRECTLY' : '✗ SOME FACTORS NOT UPDATING'}`);
      await opinionPage.page.screenshot({ path: 'screenshots/afm003-factor-assertions.png' }).catch(() => {});

      // ── STEP 7: Update affiliate-manager-opinion-result.json ──────────────
      saveAfmOpinionResult({
        ...savedAfmResult,
        capturedAt: new Date().toISOString(),
        newOriginalOpinionTotal,
        ...updatedViewData, ...updatedRatioData,
        formulaUpdateNote: `Values recalculated from ratios × newOriginalOpinionTotal (${newOriginalOpinionTotal})`,
      });
      console.log('  ✓ affiliate-manager-opinion-result.json updated');

      // ── STEP 8: Sign Out ───────────────────────────────────────────────────
      console.log('\n── STEP 8: Sign Out ─────────────────────────────────────');
      await navPage.signOut('afm003');

      expect(allPass, 'One or more afm factor field values did not match afm ratio × new total').toBe(true);
      console.log('\n  ✓ AFM-003 COMPLETE');
    });

  // ============================================================================
  // SA-003: Verify sub agent opinion fields reflect updated Y-formula
  // ============================================================================
  test('SA-003: Verify sub agent opinion field values reflect updated Y-formula (login → settings search → opinion URL → assert)',
    async ({ loginPage, navPage, yFormulaPage, opinionPage }) => {
      test.setTimeout(5 * 60 * 1000);
      await opinionPage.page.setViewportSize({ width: 1440, height: 900 });

      const shared          = readSharedOpinionData();
      const propertyId      = shared.propertyId || PROPERTY_ID_ENV;
      const propertyAddress = shared.propertyAddress || '';
      const saOpinionIdVal  = shared.saOpinionId;
      if (!propertyId)     throw new Error('No propertyId — run SA-001 first');
      if (!saOpinionIdVal) throw new Error('No saOpinionId — run SA-001 first');

      let savedSaResult = {};
      try { savedSaResult = loadJson('output/sub-agent-opinion-result.json'); } catch { /* ok */ }

      const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
      console.log(`\n  Property ID: ${propertyId}  |  SA Opinion ID: ${saOpinionIdVal}`);

      // ── STEP 1: Login (Sub Agent) ──────────────────────────────────────────
      await loginPage.navigate();
      await loginPage.login(SA_CREDENTIALS.email, SA_CREDENTIALS.password);
      await loginPage.page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
      console.log(`  ✓ Logged in — URL: ${loginPage.page.url()}`);

      // ── STEP 2: Settings → Y-Total ─────────────────────────────────────────
      await navPage.goToSettingsWithRetry();
      await yFormulaPage.clickYTotalTabWithRetry();

      // ── STEP 3: Click Search on formula row ────────────────────────────────
      const { mlsBoard, state, county } = excelData.yFormula;
      await yFormulaPage.clickRowSearchButton(mlsBoard, state, county);
      await yFormulaPage.waitForLoadingSpinnerToHide(30000);
      await opinionPage.wait(3000);
      console.log('  ✓ Properties page loaded');

      // ── STEP 4: Open Sub Agent opinion URL ────────────────────────────────
      const encodedAddress = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
      const saOpinionUrl   = `${propertyUrl}?name=${encodedAddress}&type=opinion&opinionId=${saOpinionIdVal}`;
      console.log(`\n── STEP 4: Open SA opinion URL → ${saOpinionUrl}`);
      await opinionPage.gotoOpinionUrlAndScroll(saOpinionUrl);
      await opinionPage.page.screenshot({ path: 'screenshots/sa003-opinion-url-opened.png' }).catch(() => {});

      // ── STEP 5: Read new Original Opinion Total ───────────────────────────
      await opinionPage.page.evaluate(() => window.scrollTo(0, 0));
      await opinionPage.wait(500);
      const newOriginalOpinionTotal = await opinionPage.readOriginalOpinionTotal();
      console.log(`  New Original Opinion Total: ${newOriginalOpinionTotal}`);

      // ── STEP 6: Assert factor fields = saRatio × newTotal ─────────────────
      console.log('\n── STEP 6: Assert all factor field values (SA) ──────────────────────');
      console.log('  SA-003: UPDATED Y-FORMULA OPINION FIELD ASSERTION (Sub Agent)');
      const { updatedViewData, updatedRatioData, allPass } =
        await opinionPage.assertFactorRatioUpdate(FACTOR_NAMES, SA_LABEL, savedSaResult, newOriginalOpinionTotal);
      console.log(`  Overall Result: ${allPass ? '✓ ALL FACTORS UPDATED CORRECTLY' : '✗ SOME FACTORS NOT UPDATING'}`);
      await opinionPage.page.screenshot({ path: 'screenshots/sa003-factor-assertions.png' }).catch(() => {});

      // ── STEP 7: Update sub-agent-opinion-result.json ──────────────────────
      saveSubAgentOpinionResult({
        ...savedSaResult,
        capturedAt: new Date().toISOString(),
        newOriginalOpinionTotal,
        ...updatedViewData, ...updatedRatioData,
        formulaUpdateNote: `Values recalculated from ratios × newOriginalOpinionTotal (${newOriginalOpinionTotal})`,
      });
      console.log('  ✓ sub-agent-opinion-result.json updated');

      // ── STEP 8: Sign Out ───────────────────────────────────────────────────
      console.log('\n── STEP 8: Sign Out ─────────────────────────────────────');
      await navPage.signOut('sa003');

      expect(allPass, 'One or more SA factor field values did not match sa ratio × new total').toBe(true);
      console.log('\n  ✓ SA-003 COMPLETE');
    });

});
