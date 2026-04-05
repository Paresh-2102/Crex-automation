// ============================================================
// File  : test-admin-opinion.spec.js
// Suite : Admin Opinion Flow
//
// Flow per test:
//   1. Login as admin
//   2. Settings â†’ Y-Total â†’ click Search icon (opens Properties page)
//   3. Navigate directly to property URL:
//      BASE_URL/properties/{PROPERTY_ID}
//   4. Fill all 8 opinion factor fields
//   5. Save each field value named: 'admin view', 'admin condition', etc.
//   6. Calculate & save ratios: 'admin view ratio', 'admin condition ratio', etc.
//      ratio = admin <factor> / Original Opinion Total
//   7. Select required photos (if prompted) then click Save Opinion
//   8. Navigate back to Properties chart via sidebar nav
//   9. Hover on the property dot â†’ check right-panel OPINION value
//      Assert: panel OPINION === sum of all 8 filled fields (e.g. 5Ã—8 = 40)
//  10. Click profile icon â†’ Sign Out
// ============================================================

import { test, expect } from '@playwright/test';
import { getLocator as getLoginLocator } from '../locators/login-page.locators.js';
import { getLocator as getNavLocator }    from '../locators/sidebar-nav.locators.js';
import { getLocator as getYFormulaLocator } from '../locators/yformula-creation.locators.js';
import { readExcelData } from '../test-data/read-excel-data.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// â”€â”€ Admin credentials / URLs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EMAIL    = process.env.TEST_EMAIL    || 'zaid.m@simformsolutions.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Test@123';
const BASE_URL = process.env.BASE_URL      || 'https://stage.crexagent.com';

// â”€â”€ Affiliate Manager credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AFM_EMAIL    = process.env.AFM_EMAIL    || 'johnyandy@yopmail.com';
const AFM_PASSWORD = process.env.AFM_PASSWORD || 'Test@123';

// Property ID: pass via env var PROPERTY_ID, or it will be resolved from Excel
const PROPERTY_ID_ENV = process.env.PROPERTY_ID || null;

// â”€â”€ Factor field definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FACTOR_NAMES = ['View', 'Condition', 'Quality', 'Amenities', 'Access', 'Appeal', 'Elevation', 'Economic'];

// â”€â”€ Admin factor labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Display label used as the JSON key for each factor's saved value
const ADMIN_LABEL = {
  View:       'admin view',
  Condition:  'admin condition',
  Quality:    'admin quality',
  Amenities:  'admin amenities',
  Access:     'admin access',
  Appeal:     'admin appeal',
  Elevation:  'admin elevation',
  Economic:   'admin economic',
};

// â”€â”€ Admin opinion values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Opinion values to fill for each factor (can be overridden via env vars)
const OPINION_VALUES = {
  View:       process.env.OPINION_VIEW       || '5',
  Condition:  process.env.OPINION_CONDITION  || '5',
  Quality:    process.env.OPINION_QUALITY    || '5',
  Amenities:  process.env.OPINION_AMENITIES  || '5',
  Access:     process.env.OPINION_ACCESS     || '5',
  Appeal:     process.env.OPINION_APPEAL     || '5',
  Elevation:  process.env.OPINION_ELEVATION  || '5',
  Economic:   process.env.OPINION_ECONOMIC   || '5',
};

// â”€â”€ Affiliate Manager factor labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AFM_LABEL = {
  View:       'Affiliate manager view',
  Condition:  'Affiliate manager condition',
  Quality:    'Affiliate manager quality',
  Amenities:  'Affiliate manager amenities',
  Access:     'Affiliate manager access',
  Appeal:     'Affiliate manager appeal',
  Elevation:  'Affiliate manager elevation',
  Economic:   'Affiliate manager economic',
};

// â”€â”€ Affiliate Manager opinion values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AFM_OPINION_VALUES = {
  View:       process.env.AFM_OPINION_VIEW       || '6',
  Condition:  process.env.AFM_OPINION_CONDITION  || '6',
  Quality:    process.env.AFM_OPINION_QUALITY    || '6',
  Amenities:  process.env.AFM_OPINION_AMENITIES  || '6',
  Access:     process.env.AFM_OPINION_ACCESS     || '6',
  Appeal:     process.env.AFM_OPINION_APPEAL     || '6',
  Elevation:  process.env.AFM_OPINION_ELEVATION  || '6',
  Economic:   process.env.AFM_OPINION_ECONOMIC   || '6',
};

// â”€â”€ Sub Agent credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SA_EMAIL    = process.env.SA_EMAIL    || 'Subjohny@yopmail.com';
const SA_PASSWORD = process.env.SA_PASSWORD || 'Test@123';

// â”€â”€ Sub Agent factor labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SA_LABEL = {
  View:       'sub agent view',
  Condition:  'sub agent condition',
  Quality:    'sub agent quality',
  Amenities:  'sub agent amenities',
  Access:     'sub agent access',
  Appeal:     'sub agent appeal',
  Elevation:  'sub agent elevation',
  Economic:   'sub agent economic',
};

// â”€â”€ Sub Agent opinion values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SA_OPINION_VALUES = {
  View:       process.env.SA_OPINION_VIEW       || '7',
  Condition:  process.env.SA_OPINION_CONDITION  || '7',
  Quality:    process.env.SA_OPINION_QUALITY    || '7',
  Amenities:  process.env.SA_OPINION_AMENITIES  || '7',
  Access:     process.env.SA_OPINION_ACCESS     || '7',
  Appeal:     process.env.SA_OPINION_APPEAL     || '7',
  Elevation:  process.env.SA_OPINION_ELEVATION  || '7',
  Economic:   process.env.SA_OPINION_ECONOMIC   || '7',
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Navigate to a URL while capturing all JSON API responses whose URL contains
 * the given urlFragment (e.g. a property ID or endpoint keyword).
 *
 * Returns an array of { url, status, body } objects for every matching response
 * received during the navigation.
 *
 * Usage:
 *   const responses = await gotoWithApiCapture(page, propertyUrl, propertyId);
 */
async function gotoWithApiCapture(page, targetUrl, urlFragment, gotoOptions = {}) {
  const captured = [];

  const handler = async (response) => {
    const url = response.url();
    if (!url.includes(urlFragment)) return;
    const contentType = response.headers()['content-type'] || '';
    if (!contentType.includes('json')) return;
    try {
      const body = await response.json().catch(() => null);
      captured.push({ url, status: response.status(), body });
    } catch { /* ignore parse errors */ }
  };

  page.on('response', handler);
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000, ...gotoOptions });
  } finally {
    page.off('response', handler);
  }

  return captured;
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Remove Vuetify overlay scrims that block clicks. */
async function removeScrim(page) {
  await page.evaluate(() =>
    document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove())
  );
}

/** Find a numeric value adjacent to a label on the page. */
async function readValueNearLabel(page, labelPattern) {
  return page.evaluate((src) => {
    const regex = new RegExp(src, 'i');
    const all   = [...document.querySelectorAll('*')];
    const label = all.find(el =>
      regex.test(el.innerText?.trim()) &&
      el.children.length < 4 &&
      el.tagName !== 'BODY' && el.tagName !== 'HTML'
    );
    if (!label) return null;
    const parent = label.parentElement;
    if (parent) {
      const siblings = [...parent.children];
      const idx = siblings.indexOf(label);
      for (let i = idx + 1; i < siblings.length; i++) {
        const t = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
        if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
      }
      const next = parent.nextElementSibling;
      if (next) {
        const t = next.innerText?.trim().replace(/[$,\s]/g, '');
        if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
      }
    }
    return null;
  }, labelPattern.source ?? labelPattern);
}

/** Locate matching formula row by MLS Board, State, County. */
function matchingFormulaRow(page, mls, state, county) {
  return page.locator('table tbody tr')
    .filter({ has: page.locator('td', { hasText: mls }) })
    .filter({ has: page.locator('td', { hasText: state }) })
    .filter({ has: page.locator('td', { hasText: county }) })
    .first();
}

/** Scroll property page to reveal all 8 factor fields. */
async function scrollPropertyPage(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(400);
  for (const y of [300, 600, 900, 1200, 1500]) {
    await page.evaluate((offset) => window.scrollBy(0, offset), y);
    await wait(500);
  }
}

/** Save admin opinion results JSON to output/ folder. */
function saveAdminOpinionResult(data) {
  const outputDir = path.join(__dirname, '..', 'output');
  mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'admin-opinion-result.json');
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

/** Save affiliate manager opinion results JSON to output/ folder. */
function saveAfmOpinionResult(data) {
  const outputDir = path.join(__dirname, '..', 'output');
  mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'affiliate-manager-opinion-result.json');
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

/** Save sub agent opinion results JSON to output/ folder. */
function saveSubAgentOpinionResult(data) {
  const outputDir = path.join(__dirname, '..', 'output');
  mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'sub-agent-opinion-result.json');
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

/**
 * Intercepts the first POST/PUT/PATCH response to any URL containing 'opinion'
 * while clickFn is executed.  Returns { url, status, method, body } or null.
 */
async function captureOpinionApiOnSave(page, clickFn) {
  let captured = null;
  const handler = async (response) => {
    if (captured) return;
    const url    = response.url();
    const method = response.request().method();
    if (!/opinion/i.test(url) || !['POST', 'PUT', 'PATCH'].includes(method)) return;
    const ct = response.headers()['content-type'] || '';
    if (!ct.includes('json')) return;
    try {
      const body = await response.json().catch(() => null);
      if (body) captured = { url, status: response.status(), method, body };
    } catch { /* ignore */ }
  };
  page.on('response', handler);
  await clickFn();
  await wait(3000); // give response time to arrive
  page.off('response', handler);
  return captured;
}

/** Extract the opinion ID from an opinion save API response body. */
function extractOpinionId(body) {
  if (!body) return null;
  return body.id ?? body.data?.id ?? body.opinion?.id ?? body.opinionId ?? null;
}

/** Read the property street address from the current page. */
async function readPropertyAddress(page) {
  return page.evaluate(() => {
    const selectors = ['h1', 'h2', '[class*="address"]', '[class*="property-title"]', '[class*="property-name"]'];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const t = el.innerText?.trim();
        // Must contain a digit (house number) and be a reasonable length
        if (t && /\d/.test(t) && t.length > 5 && t.length < 150) return t;
      }
    }
    return null;
  });
}

/** Save (merge) shared opinion data used across ADM â†’ AFM â†’ SA tests. */
function saveSharedOpinionData(data) {
  const outputDir = path.join(__dirname, '..', 'output');
  mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'shared-opinion-data.json');
  let existing = {};
  try { existing = JSON.parse(readFileSync(filePath, 'utf8')); } catch { /* first write */ }
  writeFileSync(filePath, JSON.stringify({ ...existing, ...data, updatedAt: new Date().toISOString() }, null, 2));
  return filePath;
}

/** Read shared opinion data written by previous tests. */
function readSharedOpinionData() {
  try {
    return JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'shared-opinion-data.json'), 'utf8'));
  } catch { return {}; }
}

/**
 * Click the "Select Photos" button, handle the "Select Primary Photos" modal:
 * for each factor row click "+ Select Photo", pick the first available photo,
 * then click Confirm.
 */
async function selectRequiredPhotos(page) {
  const selectPhotosBtn = page.locator(
    'button:has-text("Select Photos"), .v-btn:has-text("Select Photos")'
  ).first();
  const btnVisible = await selectPhotosBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!btnVisible) {
    console.log('  âš   "Select Photos" button not found â€” skipping photo selection');
    return false;
  }
  await selectPhotosBtn.scrollIntoViewIfNeeded().catch(() => {});
  await selectPhotosBtn.click({ force: true });
  await wait(2000);
  await page.screenshot({ path: 'screenshots/adm001-select-photos-modal.png' });

  // "Select Primary Photos" modal is now open
  // Repeatedly click the first visible "+ Select Photo" button and pick a photo
  let photosSelected = 0;
  for (let i = 0; i < 8; i++) {
    // Re-locate every iteration â€” DOM updates after each selection
    const selectPhotoBtn = page.locator(
      '.v-dialog:visible button:has-text("Select Photo"), ' +
      '[role="dialog"] button:has-text("Select Photo")'
    ).first();
    const isVisible = await selectPhotoBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) break;

    await selectPhotoBtn.click({ force: true });
    await wait(2000);
    await page.screenshot({ path: `screenshots/adm001-photo-picker-${i}.png` });

    // Inner photo picker: click the first available image/thumbnail
    const photoItem = page.locator(
      '.v-dialog:last-of-type img, ' +
      '[role="dialog"] img, ' +
      '.v-dialog:last-of-type [class*="photo"], ' +
      '.v-dialog:last-of-type [class*="image"], ' +
      '.v-dialog:last-of-type .v-card, ' +
      '.v-dialog:last-of-type .v-img'
    ).first();
    const photoVisible = await photoItem.isVisible({ timeout: 5000 }).catch(() => false);
    if (photoVisible) {
      await photoItem.click({ force: true });
      await wait(1000);
      // If the inner picker has its own Confirm/Select/OK button, click it
      const innerConfirm = page.locator(
        '.v-dialog:last-of-type button:has-text("Confirm"), ' +
        '.v-dialog:last-of-type button:has-text("Select"), ' +
        '.v-dialog:last-of-type button:has-text("OK")'
      ).first();
      if (await innerConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await innerConfirm.click({ force: true });
        await wait(1000);
      }
      photosSelected++;
      console.log(`  â†³ Photo ${photosSelected} selected`);
    } else {
      console.log(`  âš   No photo items found in picker ${i} â€” pressing Escape`);
      await page.keyboard.press('Escape');
      await wait(800);
    }
  }

  await page.screenshot({ path: 'screenshots/adm001-photos-selected.png' });
  console.log(`  âœ“ Photos selected for ${photosSelected} factor(s)`);

  // Click Confirm in the Select Primary Photos modal
  const confirmBtn = page.locator(
    '.v-dialog:visible button:has-text("Confirm"), ' +
    '[role="dialog"] button:has-text("Confirm")'
  ).first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.click({ force: true });
    await wait(2000);
    console.log('  âœ“ Photo selection confirmed');
    return true;
  }
  // Modal might have auto-closed; close via Escape if still open
  await page.keyboard.press('Escape').catch(() => {});
  await wait(800);
  return photosSelected > 0;
}

/** Click the "Save Opinion" button on the property page and wait for completion. */
async function clickSaveOpinion(page) {
  const saveBtn = page.locator(
    'button:has-text("Save Opinion"), .v-btn:has-text("Save Opinion")'
  ).first();
  const isVisible = await saveBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (isVisible) {
    await saveBtn.scrollIntoViewIfNeeded().catch(() => {});
    await saveBtn.click({ force: true });
    console.log('  âœ“ Save Opinion clicked');
    await wait(2000);
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 15000 });
    } catch { /* no spinner */ }
    await wait(1500);
    return true;
  }
  console.log('  âš   Save Opinion button not found');
  return false;
}

/**
 * Navigate to the Properties chart via the sidebar nav, hover on a property dot
 * at the chart centre-left (35% x, 70% y), and return the OPINION value shown
 * in the right-side card panel.  Returns null if the panel could not be read.
 */
/**
 * Navigate to the Properties chart via the sidebar nav, then locate the exact
 * dot for propertyId using three strategies in order:
 *
 *  1. Chart.js internal API â€” tries canvas.__chartjs_chart__ (v3+) and
 *     canvas._chart (v2), then Chart.instances registry as a last API option.
 *     Searches every dataset for a point whose id / propertyId / property_id /
 *     mlsId / listingId / listingKey matches propertyId.
 *     Also checks the "Opinion Property" dataset (per-label) by ID, since the
 *     property switches to that dataset after an opinion is set.
 *     Returns full diagnostics (dataset labels, first-point keys) so any
 *     field-name mismatch is visible in the Playwright log.
 *
 *  2. Grid scan â€” moves across a 9Ã—9 grid; stops at the first position where
 *     the right panel shows both "OPINION" and the exact expectedOpinionValue
 *     (e.g. "$40").  Using the opinion value rather than the raw ID is more
 *     reliable because the panel text shows dollar amounts, not database IDs.
 *
 *  3. Fixed-position fallback â€” 35 % / 70 % of the chart card, the position
 *     that worked previously, used only when strategies 1 & 2 both fail.
 *
 * Returns the OPINION numeric value from the right panel, or null.
 */
async function hoverOnChartAndReadPanelOpinion(page, propertyId, expectedOpinionValue, screenshotPrefix = 'adm001') {
  // â”€â”€ Navigate to Properties list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await getNavLocator(page, 'propertiesNav').first().click({ force: true });
  await page.waitForURL('**/properties**', { timeout: 20000 });
  await wait(3000);
  try {
    await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
      .first().waitFor({ state: 'hidden', timeout: 20000 });
  } catch { /* already loaded */ }
  await wait(4000);
  await page.screenshot({ path: `screenshots/${screenshotPrefix}-properties-chart.png` });

  // â”€â”€ STRATEGY 1: Chart.js internal data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Returns { x, y, dataset, index, strategy, diag } on success, or
  // { notFound: true, diag } on failure (diag is always array of strings).
  const chartResult = await page.evaluate((id) => {
    const diag = [];

    // Helper: get viewport pixel position for dataset[d].data[i]
    const getPos = (chart, canvas, d, i) => {
      const meta = chart.getDatasetMeta(d);
      const el   = meta?.data?.[i];
      if (!el) return null;
      const pos  = el.getCenterPoint ? el.getCenterPoint() : { x: el.x, y: el.y };
      const rect = canvas.getBoundingClientRect();
      return { x: Math.round(rect.x + pos.x), y: Math.round(rect.y + pos.y) };
    };

    // Helper: retrieve Chart.js instance from a canvas element
    const getChart = (canvas) =>
      canvas.__chartjs_chart__                                          // v3+
      || canvas._chart                                                  // v2
      || (typeof Chart !== 'undefined'
          ? Object.values(Chart.instances ?? {}).find(c => c.canvas === canvas)
          : null);

    const canvases = document.querySelectorAll('canvas');
    diag.push(`canvases found: ${canvases.length}`);

    for (const canvas of canvases) {
      const chart = getChart(canvas);
      if (!chart) {
        diag.push(`  canvas(${canvas.width}Ã—${canvas.height}) â€” no Chart.js instance`);
        continue;
      }

      const datasets = chart.data?.datasets ?? [];
      diag.push(`  Chart.js found: ${datasets.length} dataset(s)`);
      datasets.forEach((ds, idx) => {
        const pt0Keys = Object.keys(ds.data?.[0] ?? {}).join(',') || '(empty)';
        diag.push(`    [${idx}] "${ds.label}" â€” ${ds.data?.length} pts, keys: ${pt0Keys}`);
      });

      // Approach A: find by property ID in any dataset (broad field-name search)
      for (let d = 0; d < datasets.length; d++) {
        const points = datasets[d].data ?? [];
        for (let i = 0; i < points.length; i++) {
          const pt   = points[i] ?? {};
          const ptId = (
            pt.id ?? pt.propertyId ?? pt.property_id ??
            pt.mlsId ?? pt.listingId ?? pt.listingKey ?? pt.mlsListingId ?? ''
          ).toString();
          if (ptId === id.toString()) {
            const pos = getPos(chart, canvas, d, i);
            if (pos) {
              diag.push(`  âœ“ Approach A: dataset[${d}] index ${i}`);
              return { ...pos, dataset: d, index: i, strategy: 'byId', diag };
            }
          }
        }
      }

      // Approach B: search inside "Opinion Property" dataset by ID
      // After setting opinion the property moves to this dataset.
      for (let d = 0; d < datasets.length; d++) {
        const label = (datasets[d].label ?? '').toLowerCase();
        if (label.includes('opinion') && !label.includes('average')) {
          const points = datasets[d].data ?? [];
          for (let i = 0; i < points.length; i++) {
            const pt   = points[i] ?? {};
            const ptId = (pt.id ?? pt.propertyId ?? pt.property_id ?? '').toString();
            if (ptId === id.toString()) {
              const pos = getPos(chart, canvas, d, i);
              if (pos) {
                diag.push(`  âœ“ Approach B: opinion dataset[${d}] index ${i}`);
                return { ...pos, dataset: d, index: i, strategy: 'opinionDataset_byId', diag };
              }
            }
          }
        }
      }

      diag.push('  property ID not found in any dataset');
      return { notFound: true, diag };
    }

    return { notFound: true, diag };
  }, propertyId);

  // Always surface diagnostics so mismatched field names are visible in the log
  console.log(`  [Chart.js] ${chartResult.notFound ? 'property not located' : `found via "${chartResult.strategy}"`}`);
  (chartResult.diag ?? []).forEach(d => console.log(`    ${d}`));

  // â”€â”€ Get chart card rect (needed for strategies 2 & 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const chartRect = await page.evaluate(() => {
    const el = document.querySelector('.chart-card') || document.querySelector('[class*="chart-card"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });

  if (!chartRect) {
    console.log('  âš   Chart card not found on Properties page');
    return null;
  }

  if (!chartResult.notFound && chartResult.x !== undefined) {
    // Strategy 1 succeeded â€” hover on the exact pixel
    console.log(`  âœ“ [Strategy 1] Property ${propertyId} at (${chartResult.x}, ${chartResult.y})`);
    await page.mouse.move(chartResult.x, chartResult.y);
    await wait(1500);
    await page.mouse.click(chartResult.x, chartResult.y);
    await wait(2000);

  } else {
    // â”€â”€ STRATEGY 2: Grid scan matching opinion value â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // The panel shows "OPINION $<value>".  We match both the "OPINION" label
    // and the dollar-amount we just saved, which is more reliable than
    // looking for the numeric property ID (never shown in the panel UI).
    console.log(`  â†³ [Strategy 2] Scanning 9Ã—9 grid â€” looking for panel with OPINION $${expectedOpinionValue}`);
    let found = false;

    scan: for (let row = 1; row <= 9; row++) {
      for (let col = 1; col <= 9; col++) {
        const sx = Math.round(chartRect.x + chartRect.width  * (col / 10));
        const sy = Math.round(chartRect.y + chartRect.height * (row / 10));
        await page.mouse.move(sx, sy);
        await wait(400);
        const txt = await page.locator('.card-panel, [class*="card-panel"]')
          .first().innerText().catch(() => '');
        // Match panel that shows OPINION with the exact value we just saved
        if (
          txt &&
          /opinion/i.test(txt) &&
          typeof expectedOpinionValue === 'number' &&
          txt.includes(`$${expectedOpinionValue}`)
        ) {
          console.log(`  âœ“ [Strategy 2] Property found at grid (col ${col}, row ${row}) â†’ (${sx}, ${sy})`);
          await page.mouse.click(sx, sy);
          await wait(1500);
          found = true;
          break scan;
        }
      }
    }

    if (!found) {
      // â”€â”€ STRATEGY 3: Fixed-position fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      console.log(`  âš   [Strategy 3] Grid scan unsuccessful â€” using default 35 %/70 % chart position`);
      const hx = Math.round(chartRect.x + chartRect.width  * 0.35);
      const hy = Math.round(chartRect.y + chartRect.height * 0.70);
      await page.mouse.move(hx, hy);
      await wait(1500);
      await page.mouse.click(hx, hy);
      await wait(2000);
    }
  }

  await page.screenshot({ path: `screenshots/${screenshotPrefix}-panel-after-hover.png` });

  // Read right-panel text and extract the OPINION dollar value
  const panelText = await page.locator('.card-panel, [class*="card-panel"]')
    .first().innerText().catch(() => '');
  console.log(`  Panel text: "${panelText.replace(/\n/g, ' | ')}"`);

  const opinionMatch = panelText.match(/OPINION\s*\n?\s*\$?([\d,.-]+)/i);
  if (opinionMatch) {
    return parseFloat(opinionMatch[1].replace(/,/g, ''));
  }
  console.log('  âš   OPINION value not found in panel text');
  return null;
}

// â”€â”€ Excel data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let excelData;
test.beforeAll(async () => {
  excelData = await readExcelData();
});

test.describe('Admin Opinion Flow', () => {

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ADM-001 : Login â†’ Navigate to property â†’ Fill 8 opinion fields
  //           â†’ Save (named 'admin view', 'admin condition', etc.)
  //           â†’ Click Save button â†’ Re-open property â†’ Verify opinion reflected
  //           â†’ Sign Out â†’ Record PASS/FAIL
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('ADM-001: Admin fills, saves and verifies opinion fields, then signs out', async ({ page }) => {
    test.setTimeout(3 * 60 * 1000); // 3 minutes â€” photo selection adds extra time
    await page.setViewportSize({ width: 1440, height: 900 });

    // â”€â”€ Resolve property ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let propertyId = PROPERTY_ID_ENV;
    if (!propertyId) {
      const firstScenario = excelData.bvtScenarios?.[0];
      if (firstScenario?.propertyId) {
        propertyId = String(firstScenario.propertyId);
      } else if (firstScenario?.scenario) {
        const match = String(firstScenario.scenario).match(/\d{5,}/);
        if (match) propertyId = match[0];
      }
    }
    if (!propertyId) {
      throw new Error(
        'Property ID not set. Provide it via env var PROPERTY_ID=<id> ' +
        'or add a propertyId column to the BVT Scenarios Excel sheet.'
      );
    }
    const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
    console.log(`\n  Property ID  : ${propertyId}`);
    console.log(`  Property URL : ${propertyUrl}`);

    // â”€â”€ STEP 1: Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 1: Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.goto(`${BASE_URL}/login`);
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
    console.log('  âœ“ Logged in');

    // â”€â”€ STEP 2: Navigate to Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 2: Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await removeScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    await page.waitForURL('**/settings**', { timeout: 15000 });
    await wait(2000);
    await getYFormulaLocator(page, 'yTotalTab').first().click({ force: true });
    await wait(2000);
    console.log('  âœ“ On Settings â†’ Y-Total tab');

    // â”€â”€ STEP 3: Click Search icon on matching formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 3: Click Search icon on formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const row       = matchingFormulaRow(page, mls, state, county);
    const searchBtn = await row.count() > 0
      ? row.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no visible spinner */ }
    await wait(3000);
    console.log('  âœ“ Properties page loaded');

    // â”€â”€ STEP 4: Navigate directly to property URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log(`\nâ”€â”€ STEP 4: Open property ${propertyId} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`);
    await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(4000);
    await scrollPropertyPage(page);
    // Read the property address for use in AFM/SA opinion URL
    const propertyAddress = await readPropertyAddress(page);
    console.log(`  Property Address : ${propertyAddress}`);
    await page.screenshot({ path: 'screenshots/adm001-property-page.png' });
    console.log(`  âœ“ Property page opened: ${page.url()}`);

    // â”€â”€ STEP 5: Read Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 5: Read Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const originalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
    const originalYTotal       = await readValueNearLabel(page, /^original\s+y\s+total$/i);
    console.log(`  Original Opinion Total : ${originalOpinionTotal}`);
    console.log(`  Original Y Total       : ${originalYTotal}`);
    expect(originalOpinionTotal,
      'Original Opinion Total must be readable on the property page'
    ).not.toBeNull();

    // â”€â”€ STEP 6: Fill all 8 opinion fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 6: Fill all 8 opinion fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    // Saved with named keys: 'admin view', 'admin condition', etc.
    const adminViewData  = {};   // 'admin view' â†’ numeric value
    const adminRatioData = {};   // 'admin view ratio' â†’ ratio value

    for (const name of FACTOR_NAMES) {
      const label      = ADMIN_LABEL[name];         // e.g. 'admin view'
      const ratioLabel = `${label} ratio`;          // e.g. 'admin view ratio'
      const value      = OPINION_VALUES[name];
      const input      = page.locator(`input[placeholder*="${name}" i]`).first();

      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(200);

      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.log(`  âš   [${label}] input not visible â€” skipping`);
        adminViewData[label]      = null;
        adminRatioData[ratioLabel] = null;
        continue;
      }

      await input.click({ force: true });
      await wait(200);
      await input.fill('');
      await wait(100);
      await input.fill(value);
      await wait(300);

      const filled = await input.inputValue().catch(() => null);
      adminViewData[label] = filled !== null ? parseFloat(filled) : null;

      const ratio = adminViewData[label] !== null && originalOpinionTotal && originalOpinionTotal !== 0
        ? (adminViewData[label] / originalOpinionTotal)
        : null;
      adminRatioData[ratioLabel] = ratio;

      console.log(`  [${label}] â†’ value: "${filled}" | ratio: ${ratio}`);
    }

    await page.screenshot({ path: 'screenshots/adm001-fields-filled.png' });

    // â”€â”€ STEP 7: Display admin view + ratio summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 7: Admin View & Ratio Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log(`\n  ${'Field'.padEnd(22)} | Admin View | Admin Ratio`);
    console.log(`  ${'-'.repeat(54)}`);
    for (const name of FACTOR_NAMES) {
      const label      = ADMIN_LABEL[name];
      const ratioLabel = `${label} ratio`;
      console.log(`  ${label.padEnd(22)} | ${String(adminViewData[label]).padEnd(10)} | ${adminRatioData[ratioLabel]}`);
    }
    console.log(`  ${'-'.repeat(54)}`);

    // â”€â”€ STEP 8: Assert Opinion Total on property page = sum of 8 filled fields â”€â”€
    // The "Opinion Total" stat card updates reactively as fields are filled.
    // This asserts correctness BEFORE clicking Save Opinion.
    console.log('\nâ”€â”€ STEP 8: Assert Opinion Total on property page â”€â”€â”€â”€');
    const sumOf8Fields = Object.values(adminViewData).reduce((s, v) => s + (v || 0), 0);
    console.log(`  Expected Opinion Total (sum of 8 fields): ${sumOf8Fields}`);

    // Scroll back to top so the stat cards are visible
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(800);
    await page.screenshot({ path: 'screenshots/adm001-opinion-total-check.png' });

    // Read the "Opinion Total" stat card â€” regex anchored to avoid matching "Original Opinion Total"
    const opinionTotalOnPage = await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const label = all.find(el =>
        /^opinion\s+total$/i.test(el.innerText?.trim()) &&
        el.children.length < 4 &&
        el.tagName !== 'BODY' && el.tagName !== 'HTML'
      );
      if (!label) return null;
      const parent = label.parentElement;
      if (parent) {
        const siblings = [...parent.children];
        const idx = siblings.indexOf(label);
        for (let i = idx + 1; i < siblings.length; i++) {
          const t = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
        const next = parent.nextElementSibling;
        if (next) {
          const t = next.innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
      }
      return null;
    });

    console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('  ADM-001: OPINION TOTAL ASSERTION (before Save Opinion)');
    console.log(`  Expected (sum of 8 fields)   : ${sumOf8Fields}`);
    console.log(`  Page 'Opinion Total' shows   : ${opinionTotalOnPage}`);
    const opinionTotalMatch = opinionTotalOnPage !== null &&
      Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
    console.log(`  Result                       : ${opinionTotalMatch ? 'âœ“ PASS' : 'âœ— FAIL'}`);
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');

    // â”€â”€ STEP 9: Select required photos, then Save the opinion (capture opinion ID) â”€
    console.log('\nâ”€â”€ STEP 9: Select Photos & Save Opinion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await selectRequiredPhotos(page);
    await wait(1000);
    // Listen for the opinion API response to capture the admin opinion ID
    const adminOpinionApi = await captureOpinionApiOnSave(page, () => clickSaveOpinion(page));
    const adminOpinionId  = extractOpinionId(adminOpinionApi?.body);
    console.log(`  Opinion API  : ${JSON.stringify(adminOpinionApi?.body ?? 'no response').slice(0, 300)}`);
    console.log(`  Admin Opinion ID : ${adminOpinionId}`);
    // Persist shared data so AFM-001 and SA-001 can build the opinion URL
    const sharedPath = saveSharedOpinionData({ propertyId, propertyUrl, propertyAddress, adminOpinionId });
    console.log(`  âœ“ Shared opinion data saved â†’ ${sharedPath}`);
    await page.screenshot({ path: 'screenshots/adm001-after-save.png' });

    // â”€â”€ STEP 10: Save result to output/admin-opinion-result.json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const result = {
      capturedAt: new Date().toISOString(),
      propertyId,
      propertyUrl,
      propertyAddress,
      adminOpinionId,
      originalOpinionTotal,
      originalYTotal,
      sumOf8Fields,
      opinionTotalOnPage,
      opinionTotalMatch,
      ...adminViewData,
      ...adminRatioData,
      formula: 'admin <factor> ratio = admin <factor> / originalOpinionTotal',
    };
    const savedPath = saveAdminOpinionResult(result);
    console.log(`\n  âœ“ Result saved to: ${savedPath}`);

    // â”€â”€ STEP 11: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 11: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const profileIcon = getNavLocator(page, 'userProfileDropdown');
    await expect(profileIcon).toBeVisible({ timeout: 10000 });
    await profileIcon.click({ force: true });
    await wait(1500);
    await page.screenshot({ path: 'screenshots/adm001-profile-menu.png' });

    const signOutBtn = page.locator(
      'button:has-text("Sign Out"), ' +
      'a:has-text("Sign Out"), ' +
      '.v-list-item:has-text("Sign Out"), ' +
      '[role="menuitem"]:has-text("Sign Out")'
    ).first();

    const signOutVisible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) {
      const logoutBtn = page.locator(
        'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
      ).first();
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click({ force: true });
      } else {
        console.log('  âš   Sign Out button not found â€” screenshot taken');
        await page.screenshot({ path: 'screenshots/adm001-signout-not-found.png' });
      }
    } else {
      await signOutBtn.click({ force: true });
    }

    await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
    await wait(1000);
    await page.screenshot({ path: 'screenshots/adm001-signed-out.png' });
    console.log(`  âœ“ Signed out â€” current URL: ${page.url()}`);

    // â”€â”€ PASS / FAIL assertions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const unfilled = FACTOR_NAMES.filter(n => adminViewData[ADMIN_LABEL[n]] === null);
    expect(unfilled,
      `${unfilled.length} factor field(s) could not be filled: ${unfilled.join(', ')}`
    ).toHaveLength(0);

    expect(opinionTotalOnPage,
      'Opinion Total not found on property page â€” check the stat card is visible'
    ).not.toBeNull();

    expect(Math.abs((opinionTotalOnPage ?? 0) - sumOf8Fields),
      `Opinion Total mismatch â€” page shows ${opinionTotalOnPage} but expected ${sumOf8Fields} (sum of 8 fields)`
    ).toBeLessThan(0.01);

    console.log('\n  âœ“ ADM-001 COMPLETE');
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ADM-002 : Parameterised â€” run once per property ID from BVT Scenarios sheet
  //           Each property: fill 8 fields â†’ assert Opinion Total on page = sum of 8 fields
  //           â†’ save opinion â†’ sign out
  //           Saves all results to output/admin-opinion-all-results.json
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('ADM-002: Admin opinion flow for each property ID in BVT Scenarios sheet', async ({ browser }) => {
    const propertyIds = [];

    if (PROPERTY_ID_ENV) {
      propertyIds.push(PROPERTY_ID_ENV);
    } else {
      for (const row of (excelData.bvtScenarios || [])) {
        if (row.propertyId) {
          propertyIds.push(String(row.propertyId));
        } else {
          const match = String(row.scenario || '').match(/\d{5,}/);
          if (match) propertyIds.push(match[0]);
        }
      }
    }

    if (propertyIds.length === 0) {
      throw new Error(
        'No property IDs found. Set PROPERTY_ID env var or add a "propertyId" column in the BVT Scenarios Excel sheet.'
      );
    }

    const MS_PER_PROPERTY = 3 * 60 * 1000;
    test.setTimeout(propertyIds.length * MS_PER_PROPERTY);

    console.log(`\n=== ADM-002: Running for ${propertyIds.length} property ID(s) ===`);
    propertyIds.forEach((id, i) => console.log(`  [${i + 1}] ${id}`));

    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const allResults = [];

    for (const propertyId of propertyIds) {
      console.log(`\n${'â”€'.repeat(60)}`);
      console.log(`  Property ID: ${propertyId}`);
      const propertyUrl = `${BASE_URL}/properties/${propertyId}`;

      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const adminViewData  = {};
      const adminRatioData = {};
      let originalOpinionTotal = null;

      try {
        const page = await context.newPage();

        // Login
        await page.goto(`${BASE_URL}/login`);
        await getLoginLocator(page, 'emailInput').fill(EMAIL);
        await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
        await getLoginLocator(page, 'signInButton').click();
        await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
        console.log('  âœ“ Logged in');

        // Settings â†’ Y-Total â†’ Search
        await removeScrim(page);
        await getNavLocator(page, 'settingsNav').first().click({ force: true });
        await page.waitForURL('**/settings**', { timeout: 15000 });
        await page.waitForLoadState('domcontentloaded');
        await wait(2000);

        const yTotalTabLocator = getYFormulaLocator(page, 'yTotalTab').first();
        await yTotalTabLocator.waitFor({ state: 'visible', timeout: 10000 });
        await yTotalTabLocator.click({ force: true });
        await wait(2000);
        const row = matchingFormulaRow(page, mls, state, county);
        const searchBtn = await row.count() > 0
          ? row.locator('td:last-child button:nth-child(3)')
          : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
        await expect(searchBtn).toBeVisible({ timeout: 10000 });
        await searchBtn.click({ force: true });
        await page.waitForURL('**/properties**', { timeout: 30000 });
        await wait(3000);
        console.log('  âœ“ Properties page loaded');

        // Navigate to property
        await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        try {
          await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
            .first().waitFor({ state: 'hidden', timeout: 30000 });
        } catch { /* no spinner */ }
        await wait(4000);
        await scrollPropertyPage(page);
        console.log(`  âœ“ Opened: ${propertyUrl}`);

        // Read Original Opinion Total
        originalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
        console.log(`  Original Opinion Total: ${originalOpinionTotal}`);

        // Fill 8 opinion fields â€” save as 'admin view', 'admin condition', etc.
        for (const name of FACTOR_NAMES) {
          const label      = ADMIN_LABEL[name];
          const ratioLabel = `${label} ratio`;
          const value      = OPINION_VALUES[name];
          const input      = page.locator(`input[placeholder*="${name}" i]`).first();
          await input.scrollIntoViewIfNeeded().catch(() => {});
          await wait(200);
          const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
          if (!isVisible) {
            adminViewData[label]       = null;
            adminRatioData[ratioLabel] = null;
            continue;
          }
          await input.click({ force: true });
          await input.fill('');
          await input.fill(value);
          await wait(300);
          const filled = await input.inputValue().catch(() => null);
          adminViewData[label] = filled !== null ? parseFloat(filled) : null;
          const ratio = adminViewData[label] !== null && originalOpinionTotal && originalOpinionTotal !== 0
            ? (adminViewData[label] / originalOpinionTotal)
            : null;
          adminRatioData[ratioLabel] = ratio;
        }

        // Display summary
        console.log(`\n  ${'Field'.padEnd(22)} | Admin View | Admin Ratio`);
        console.log(`  ${'-'.repeat(54)}`);
        for (const name of FACTOR_NAMES) {
          const label      = ADMIN_LABEL[name];
          const ratioLabel = `${label} ratio`;
          console.log(`  ${label.padEnd(22)} | ${String(adminViewData[label]).padEnd(10)} | ${adminRatioData[ratioLabel]}`);
        }

        // Assert Opinion Total on property page = sum of 8 fields (before Save Opinion)
        const sumOf8Fields = Object.values(adminViewData).reduce((s, v) => s + (v || 0), 0);
        await page.evaluate(() => window.scrollTo(0, 0));
        await wait(800);
        const opinionTotalOnPage = await page.evaluate(() => {
          const all = [...document.querySelectorAll('*')];
          const label = all.find(el =>
            /^opinion\s+total$/i.test(el.innerText?.trim()) &&
            el.children.length < 4 &&
            el.tagName !== 'BODY' && el.tagName !== 'HTML'
          );
          if (!label) return null;
          const parent = label.parentElement;
          if (parent) {
            const siblings = [...parent.children];
            const idx = siblings.indexOf(label);
            for (let i = idx + 1; i < siblings.length; i++) {
              const t = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
              if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
            }
            const next = parent.nextElementSibling;
            if (next) {
              const t = next.innerText?.trim().replace(/[$,\s]/g, '');
              if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
            }
          }
          return null;
        });
        const opinionTotalMatch = opinionTotalOnPage !== null &&
          Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
        console.log(`  Opinion Total on page: ${opinionTotalOnPage}  |  Expected: ${sumOf8Fields}  |  ${opinionTotalMatch ? '\u2713 PASS' : '\u2717 FAIL'}`);

        // Select required photos, then save opinion
        await selectRequiredPhotos(page);
        await wait(1000);
        await clickSaveOpinion(page);

        // Sign Out
        const profileIcon = getNavLocator(page, 'userProfileDropdown');
        if (await profileIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
          await profileIcon.click({ force: true });
          await wait(1500);
          const signOutBtn = page.locator(
            'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
            '.v-list-item:has-text("Sign Out"), button:has-text("Logout"), ' +
            'a:has-text("Logout"), .v-list-item:has-text("Logout")'
          ).first();
          if (await signOutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await signOutBtn.click({ force: true });
            await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
            console.log('  âœ“ Signed out');
          } else {
            console.log('  âš   Sign Out button not found in menu');
          }
        }

        const allFilled = FACTOR_NAMES.every(n => adminViewData[ADMIN_LABEL[n]] !== null);

        allResults.push({
          propertyId,
          propertyUrl,
          originalOpinionTotal,
          sumOf8Fields,
          opinionTotalOnPage,
          opinionTotalMatch,
          ...adminViewData,
          ...adminRatioData,
          passed: allFilled && opinionTotalMatch,
        });

      } finally {
        await context.close();
      }
    }

    // Save all results
    const outputDir = path.join(__dirname, '..', 'output');
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      path.join(outputDir, 'admin-opinion-all-results.json'),
      JSON.stringify({
        capturedAt: new Date().toISOString(),
        formula: 'admin <factor> ratio = admin <factor> / originalOpinionTotal',
        results: allResults,
      }, null, 2)
    );

    // Summary
    console.log(`\n${'â•'.repeat(60)}`);
    console.log('=== ADM-002 SUMMARY ===');
    for (const r of allResults) {
      console.log(`  ${r.passed ? 'âœ“ PASS' : 'âœ— FAIL'}  Property ${r.propertyId}`);
      if (!r.passed) {
        if (!FACTOR_NAMES.every(n => r[ADMIN_LABEL[n]] !== null)) {
          const missing = FACTOR_NAMES.filter(n => r[ADMIN_LABEL[n]] === null);
          missing.forEach(n => console.log(`         â†³ ${ADMIN_LABEL[n]}: field not filled`));
        }
        if (!r.opinionTotalMatch) {
          console.log(`         \u21b3 Opinion Total on page: ${r.opinionTotalOnPage} (expected ${r.sumOf8Fields})`);
        }
      }
    }
    const totalPass = allResults.filter(r => r.passed).length;
    console.log(`\n  ${totalPass} / ${allResults.length} properties passed.`);

    const failed = allResults.filter(r => !r.passed);
    expect(failed,
      `${failed.length} property/ies failed: ${failed.map(r => r.propertyId).join(', ')}`
    ).toHaveLength(0);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // AFM-001 : Login as Affiliate Manager â†’ Settings â†’ Y-Total â†’ Search
  //           â†’ Navigate to property URL â†’ Fill 8 opinion fields
  //           â†’ Save as 'Affiliate manager view', 'Affiliate manager condition', etc.
  //           â†’ Assert Opinion Total on page = sum of 8 fields (before save)
  //           â†’ Save opinion â†’ Sign Out â†’ Record PASS/FAIL
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('AFM-001: Affiliate Manager fills, saves and verifies opinion fields, then signs out', async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // â”€â”€ Resolve property ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let propertyId = PROPERTY_ID_ENV;
    if (!propertyId) {
      const firstScenario = excelData.bvtScenarios?.[0];
      if (firstScenario?.propertyId) {
        propertyId = String(firstScenario.propertyId);
      } else if (firstScenario?.scenario) {
        const match = String(firstScenario.scenario).match(/\d{5,}/);
        if (match) propertyId = match[0];
      }
    }
    if (!propertyId) {
      throw new Error(
        'Property ID not set. Provide it via env var PROPERTY_ID=<id> ' +
        'or add a propertyId column to the BVT Scenarios Excel sheet.'
      );
    }
    const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
    console.log(`\n  Property ID  : ${propertyId}`);
    console.log(`  Property URL : ${propertyUrl}`);

    // â”€â”€ STEP 1: Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 1: Login (Affiliate Manager) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.goto(`${BASE_URL}/login`);
    await getLoginLocator(page, 'emailInput').fill(AFM_EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(AFM_PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
    console.log(`  âœ“ Logged in â€” URL: ${page.url()}`);

    // â”€â”€ STEP 2: Navigate to Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 2: Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await removeScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    // If not redirected to settings within 8s, reload and try clicking again
    try {
      await page.waitForURL('**/settings**', { timeout: 8000 });
    } catch {
      console.log('  âš  Not redirected to settings â€” reloading and retrying...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await removeScrim(page);
      await getNavLocator(page, 'settingsNav').first().click({ force: true });
      await page.waitForURL('**/settings**', { timeout: 15000 });
    }
    await page.waitForLoadState('domcontentloaded');
    // If Y-Total tab not visible within 3s after URL change, reload the settings page
    const yTotalTabAfm = getYFormulaLocator(page, 'yTotalTab').first();
    try {
      await yTotalTabAfm.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      console.log('  âš  Y-Total tab not found â€” reloading settings page...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await yTotalTabAfm.waitFor({ state: 'visible', timeout: 10000 });
    }
    await yTotalTabAfm.click({ force: true });
    await wait(2000);
    console.log('  âœ“ On Settings â†’ Y-Total tab');

    // â”€â”€ STEP 3: Click Search icon on matching formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 3: Click Search icon on formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const row       = matchingFormulaRow(page, mls, state, county);
    const searchBtn = await row.count() > 0
      ? row.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(3000);
    console.log('  âœ“ Properties page loaded');

    // â”€â”€ STEP 3.5: Open opinion URL (admin opinion ID) â†’ assert admin values prefilled â”€
    console.log('\nâ”€â”€ STEP 3.5: Open opinion URL (admin opinion ID) â”€â”€â”€â”€');
    const sharedDataAfm      = readSharedOpinionData();
    const adminOpinionIdAfm  = sharedDataAfm.adminOpinionId;
    const afmAlreadyFilled   = !!sharedDataAfm.afmOpinionId;
    const propertyAddressAfm = sharedDataAfm.propertyAddress || '';
    if (adminOpinionIdAfm) {
      const encodedNameAfm = encodeURIComponent(propertyAddressAfm).replace(/%20/g, '+');
      const opinionUrlAfm  = `${propertyUrl}?name=${encodedNameAfm}&type=opinion&opinionId=${adminOpinionIdAfm}`;
      console.log(`  Admin Opinion ID : ${adminOpinionIdAfm}`);
      console.log(`  Opinion URL      : ${opinionUrlAfm}`);
      await page.goto(opinionUrlAfm, { waitUntil: 'domcontentloaded', timeout: 30000 });
      try {
        await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
          .first().waitFor({ state: 'hidden', timeout: 20000 });
      } catch { /* no spinner */ }
      await wait(3000);
      await scrollPropertyPage(page);
      await page.screenshot({ path: 'screenshots/afm001-opinion-url-opened.png' });
      console.log('  âœ“ Opinion URL opened â€” asserting admin pre-filled values in Affiliate Manager account');

      // â”€â”€ Assert each factor field shows the admin's value â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Since the Affiliate Manager hasn't provided an opinion yet, opening
      // the opinion URL (with adminOpinionId) should pre-fill the admin's values.
      console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
      console.log('  AFM-001 PRE-FILL ASSERTION: Admin values visible in AFM account');
      console.log(`  ${'Factor'.padEnd(12)} | Admin Value | AFM Pre-fill | Result`);
      console.log(`  ${'-'.repeat(58)}`);

      for (const name of FACTOR_NAMES) {
        const input     = page.locator(`input[placeholder*="${name}" i]`).first();
        const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
        if (!isVisible) {
          console.log(`  âš   [${name}] input not visible â€” skipping assertion`);
          continue;
        }
        const val         = await input.inputValue().catch(() => null);
        const adminValue  = OPINION_VALUES[name];           // e.g. '5'
        const parsed      = parseFloat(val ?? 'NaN');
        const expected    = parseFloat(adminValue);
        const isMatch     = !isNaN(parsed) && Math.abs(parsed - expected) < 0.01;
        const resultLabel = isMatch
          ? 'âœ“ PASS'
          : 'âœ— FAIL';

        console.log(`  ${name.padEnd(12)} | ${String(adminValue).padEnd(11)} | ${String(val ?? '(empty)').padEnd(12)} | ${resultLabel}`);

        if (!afmAlreadyFilled) {
          expect.soft(
            parsed,
            `admin ${name.toLowerCase()} value is matching in the affiliate manager account ` +
            `due to affiliate manager hasn't provided a opinion yet ` +
            `(expected ${adminValue}, got ${val})`
          ).toBeCloseTo(expected, 2);
        }
      }

      console.log(`  ${'-'.repeat(58)}`);
      console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');
      console.log('  âœ“ Admin value pre-fill assertion done in Affiliate Manager account');
    } else {
      console.log('  âš   No admin opinion ID in shared data â€” skipping opinion URL step (run ADM-001 first)');
    }

    // â”€â”€ STEP 4: Navigate to property URL (for filling AFM opinion) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log(`\nâ”€â”€ STEP 4: Open property ${propertyId} (for filling) â”€â”€â”€â”€â”€`);
    await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(4000);
    await scrollPropertyPage(page);
    await page.screenshot({ path: 'screenshots/afm001-property-page.png' });
    console.log(`  âœ“ Property page opened: ${page.url()}`);

    // â”€â”€ STEP 5: Read Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 5: Read Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const originalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
    const originalYTotal       = await readValueNearLabel(page, /^original\s+y\s+total$/i);
    console.log(`  Original Opinion Total : ${originalOpinionTotal}`);
    console.log(`  Original Y Total       : ${originalYTotal}`);
    expect(originalOpinionTotal,
      'Original Opinion Total must be readable on the property page'
    ).not.toBeNull();

    // â”€â”€ STEP 6: Fill all 8 opinion fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 6: Fill all 8 opinion fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const afmViewData  = {};
    const afmRatioData = {};

    for (const name of FACTOR_NAMES) {
      const label      = AFM_LABEL[name];
      const ratioLabel = `${label} ratio`;
      const value      = AFM_OPINION_VALUES[name];
      const input      = page.locator(`input[placeholder*="${name}" i]`).first();

      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(200);

      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.log(`  âš   [${label}] input not visible â€” skipping`);
        afmViewData[label]       = null;
        afmRatioData[ratioLabel] = null;
        continue;
      }

      await input.click({ force: true });
      await wait(200);
      await input.fill('');
      await wait(100);
      await input.fill(value);
      await wait(300);

      const filled = await input.inputValue().catch(() => null);
      afmViewData[label] = filled !== null ? parseFloat(filled) : null;

      const ratio = afmViewData[label] !== null && originalOpinionTotal && originalOpinionTotal !== 0
        ? (afmViewData[label] / originalOpinionTotal)
        : null;
      afmRatioData[ratioLabel] = ratio;

      console.log(`  [${label}] â†’ value: "${filled}" | ratio: ${ratio}`);
    }

    await page.screenshot({ path: 'screenshots/afm001-fields-filled.png' });

    // â”€â”€ STEP 7: Display AFM view + ratio summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 7: Affiliate Manager View & Ratio Summary â”€â”€â”€');
    console.log(`\n  ${'Field'.padEnd(34)} | Value | Ratio`);
    console.log(`  ${'-'.repeat(60)}`);
    for (const name of FACTOR_NAMES) {
      const label      = AFM_LABEL[name];
      const ratioLabel = `${label} ratio`;
      console.log(`  ${label.padEnd(34)} | ${String(afmViewData[label]).padEnd(5)} | ${afmRatioData[ratioLabel]}`);
    }
    console.log(`  ${'-'.repeat(60)}`);

    // â”€â”€ STEP 8: Assert Opinion Total on property page = sum of 8 fields â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 8: Assert Opinion Total on property page â”€â”€â”€â”€');
    const sumOf8Fields = Object.values(afmViewData).reduce((s, v) => s + (v || 0), 0);
    console.log(`  Expected Opinion Total (sum of 8 fields): ${sumOf8Fields}`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(800);
    await page.screenshot({ path: 'screenshots/afm001-opinion-total-check.png' });

    const opinionTotalOnPage = await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const label = all.find(el =>
        /^opinion\s+total$/i.test(el.innerText?.trim()) &&
        el.children.length < 4 &&
        el.tagName !== 'BODY' && el.tagName !== 'HTML'
      );
      if (!label) return null;
      const parent = label.parentElement;
      if (parent) {
        const siblings = [...parent.children];
        const idx = siblings.indexOf(label);
        for (let i = idx + 1; i < siblings.length; i++) {
          const t = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
        const next = parent.nextElementSibling;
        if (next) {
          const t = next.innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
      }
      return null;
    });

    console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('  AFM-001: OPINION TOTAL ASSERTION (before Save Opinion)');
    console.log(`  Expected (sum of 8 fields)   : ${sumOf8Fields}`);
    console.log(`  Page 'Opinion Total' shows   : ${opinionTotalOnPage}`);
    const opinionTotalMatch = opinionTotalOnPage !== null &&
      Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
    console.log(`  Result                       : ${opinionTotalMatch ? 'âœ“ PASS' : 'âœ— FAIL'}`);
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');

    // â”€â”€ STEP 9: Select required photos, then Save the opinion (capture AFM opinion ID) â”€
    console.log('\nâ”€â”€ STEP 9: Select Photos & Save Opinion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await selectRequiredPhotos(page);
    await wait(1000);
    const afmOpinionApi = await captureOpinionApiOnSave(page, () => clickSaveOpinion(page));
    const afmOpinionId  = extractOpinionId(afmOpinionApi?.body);
    console.log(`  Opinion API    : ${JSON.stringify(afmOpinionApi?.body ?? 'no response').slice(0, 300)}`);
    console.log(`  AFM Opinion ID : ${afmOpinionId}`);
    if (afmOpinionId) {
      saveSharedOpinionData({ afmOpinionId });
      console.log('  âœ“ AFM opinion ID saved to shared-opinion-data.json');
    }
    await page.screenshot({ path: 'screenshots/afm001-after-save.png' });

    // â”€â”€ STEP 10: Save result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const result = {
      capturedAt: new Date().toISOString(),
      propertyId,
      propertyUrl,
      afmOpinionId,
      originalOpinionTotal,
      originalYTotal,
      sumOf8Fields,
      opinionTotalOnPage,
      opinionTotalMatch,
      ...afmViewData,
      ...afmRatioData,
      formula: 'Affiliate manager <factor> ratio = Affiliate manager <factor> / originalOpinionTotal',
    };
    const savedPath = saveAfmOpinionResult(result);
    console.log(`\n  âœ“ Result saved to: ${savedPath}`);

    // â”€â”€ STEP 11: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 11: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const profileIcon = getNavLocator(page, 'userProfileDropdown');
    await expect(profileIcon).toBeVisible({ timeout: 10000 });
    await profileIcon.click({ force: true });
    await wait(1500);
    await page.screenshot({ path: 'screenshots/afm001-profile-menu.png' });

    const signOutBtn = page.locator(
      'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
      '.v-list-item:has-text("Sign Out"), [role="menuitem"]:has-text("Sign Out")'
    ).first();
    const signOutVisible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) {
      const logoutBtn = page.locator(
        'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
      ).first();
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click({ force: true });
      } else {
        console.log('  âš   Sign Out button not found â€” screenshot taken');
        await page.screenshot({ path: 'screenshots/afm001-signout-not-found.png' });
      }
    } else {
      await signOutBtn.click({ force: true });
    }

    await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
    await wait(1000);
    await page.screenshot({ path: 'screenshots/afm001-signed-out.png' });
    console.log(`  âœ“ Signed out â€” current URL: ${page.url()}`);

    // â”€â”€ PASS / FAIL assertions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const unfilled = FACTOR_NAMES.filter(n => afmViewData[AFM_LABEL[n]] === null);
    expect(unfilled,
      `${unfilled.length} factor field(s) could not be filled: ${unfilled.join(', ')}`
    ).toHaveLength(0);

    expect(opinionTotalOnPage,
      'Opinion Total not found on property page â€” check the stat card is visible'
    ).not.toBeNull();

    expect(Math.abs((opinionTotalOnPage ?? 0) - sumOf8Fields),
      `Opinion Total mismatch â€” page shows ${opinionTotalOnPage} but expected ${sumOf8Fields} (sum of 8 fields)`
    ).toBeLessThan(0.01);

    console.log('\n  âœ“ AFM-001 COMPLETE');
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // AFM-002 : Parameterised â€” run once per property ID from BVT Scenarios sheet
  //           Each property: fill 8 fields â†’ assert Opinion Total on page
  //           â†’ save opinion â†’ sign out
  //           Saves all results to output/affiliate-manager-opinion-all-results.json
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('AFM-002: Affiliate Manager opinion flow for each property ID in BVT Scenarios sheet', async ({ browser }) => {
    const propertyIds = [];

    if (PROPERTY_ID_ENV) {
      propertyIds.push(PROPERTY_ID_ENV);
    } else {
      for (const row of (excelData.bvtScenarios || [])) {
        if (row.propertyId) {
          propertyIds.push(String(row.propertyId));
        } else {
          const match = String(row.scenario || '').match(/\d{5,}/);
          if (match) propertyIds.push(match[0]);
        }
      }
    }

    if (propertyIds.length === 0) {
      throw new Error(
        'No property IDs found. Set PROPERTY_ID env var or add a "propertyId" column in the BVT Scenarios Excel sheet.'
      );
    }

    const MS_PER_PROPERTY = 3 * 60 * 1000;
    test.setTimeout(propertyIds.length * MS_PER_PROPERTY);

    console.log(`\n=== AFM-002: Running for ${propertyIds.length} property ID(s) ===`);
    propertyIds.forEach((id, i) => console.log(`  [${i + 1}] ${id}`));

    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const allResults = [];

    for (const propertyId of propertyIds) {
      console.log(`\n${'â”€'.repeat(60)}`);
      console.log(`  Property ID: ${propertyId}`);
      const propertyUrl = `${BASE_URL}/properties/${propertyId}`;

      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const afmViewData  = {};
      const afmRatioData = {};
      let originalOpinionTotal = null;

      try {
        const page = await context.newPage();

        // Login
        await page.goto(`${BASE_URL}/login`);
        await getLoginLocator(page, 'emailInput').fill(AFM_EMAIL);
        await getLoginLocator(page, 'passwordInput').fill(AFM_PASSWORD);
        await getLoginLocator(page, 'signInButton').click();
        await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
        console.log(`  âœ“ Logged in â€” URL: ${page.url()}`);

        // Settings â†’ Y-Total â†’ Search
        await removeScrim(page);
        await getNavLocator(page, 'settingsNav').first().click({ force: true });
        // If not redirected to settings within 8s, reload and try clicking again
        try {
          await page.waitForURL('**/settings**', { timeout: 8000 });
        } catch {
          console.log('  âš  Not redirected to settings â€” reloading and retrying...');
          await page.reload({ waitUntil: 'domcontentloaded' });
          await wait(2000);
          await removeScrim(page);
          await getNavLocator(page, 'settingsNav').first().click({ force: true });
          await page.waitForURL('**/settings**', { timeout: 15000 });
        }
        await page.waitForLoadState('domcontentloaded');
        // If Y-Total tab not visible within 3s after URL change, reload the settings page
        const yTotalTabLocator = getYFormulaLocator(page, 'yTotalTab').first();
        try {
          await yTotalTabLocator.waitFor({ state: 'visible', timeout: 3000 });
        } catch {
          console.log('  âš  Y-Total tab not found â€” reloading settings page...');
          await page.reload({ waitUntil: 'domcontentloaded' });
          await wait(2000);
          await yTotalTabLocator.waitFor({ state: 'visible', timeout: 10000 });
        }
        await yTotalTabLocator.click({ force: true });
        await wait(2000);
        const row = matchingFormulaRow(page, mls, state, county);
        const searchBtn = await row.count() > 0
          ? row.locator('td:last-child button:nth-child(3)')
          : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
        await expect(searchBtn).toBeVisible({ timeout: 10000 });
        await searchBtn.click({ force: true });
        await page.waitForURL('**/properties**', { timeout: 30000 });
        await wait(3000);
        console.log('  âœ“ Properties page loaded');

        // Navigate to property
        await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        try {
          await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
            .first().waitFor({ state: 'hidden', timeout: 30000 });
        } catch { /* no spinner */ }
        await wait(4000);
        await scrollPropertyPage(page);
        console.log(`  âœ“ Opened: ${propertyUrl}`);

        // Read Original Opinion Total
        originalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
        console.log(`  Original Opinion Total: ${originalOpinionTotal}`);

        // Fill 8 opinion fields
        for (const name of FACTOR_NAMES) {
          const label      = AFM_LABEL[name];
          const ratioLabel = `${label} ratio`;
          const value      = AFM_OPINION_VALUES[name];
          const input      = page.locator(`input[placeholder*="${name}" i]`).first();
          await input.scrollIntoViewIfNeeded().catch(() => {});
          await wait(200);
          const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
          if (!isVisible) {
            afmViewData[label]       = null;
            afmRatioData[ratioLabel] = null;
            continue;
          }
          await input.click({ force: true });
          await input.fill('');
          await input.fill(value);
          await wait(300);
          const filled = await input.inputValue().catch(() => null);
          afmViewData[label] = filled !== null ? parseFloat(filled) : null;
          const ratio = afmViewData[label] !== null && originalOpinionTotal && originalOpinionTotal !== 0
            ? (afmViewData[label] / originalOpinionTotal)
            : null;
          afmRatioData[ratioLabel] = ratio;
        }

        // Display summary
        console.log(`\n  ${'Field'.padEnd(34)} | Value | Ratio`);
        console.log(`  ${'-'.repeat(60)}`);
        for (const name of FACTOR_NAMES) {
          const label      = AFM_LABEL[name];
          const ratioLabel = `${label} ratio`;
          console.log(`  ${label.padEnd(34)} | ${String(afmViewData[label]).padEnd(5)} | ${afmRatioData[ratioLabel]}`);
        }

        // Assert Opinion Total on property page = sum of 8 fields
        const sumOf8Fields = Object.values(afmViewData).reduce((s, v) => s + (v || 0), 0);
        await page.evaluate(() => window.scrollTo(0, 0));
        await wait(800);
        const opinionTotalOnPage = await page.evaluate(() => {
          const all = [...document.querySelectorAll('*')];
          const label = all.find(el =>
            /^opinion\s+total$/i.test(el.innerText?.trim()) &&
            el.children.length < 4 &&
            el.tagName !== 'BODY' && el.tagName !== 'HTML'
          );
          if (!label) return null;
          const parent = label.parentElement;
          if (parent) {
            const siblings = [...parent.children];
            const idx = siblings.indexOf(label);
            for (let i = idx + 1; i < siblings.length; i++) {
              const t = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
              if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
            }
            const next = parent.nextElementSibling;
            if (next) {
              const t = next.innerText?.trim().replace(/[$,\s]/g, '');
              if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
            }
          }
          return null;
        });
        const opinionTotalMatch = opinionTotalOnPage !== null &&
          Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
        console.log(`  Opinion Total on page: ${opinionTotalOnPage}  |  Expected: ${sumOf8Fields}  |  ${opinionTotalMatch ? 'âœ“ PASS' : 'âœ— FAIL'}`);

        // Select required photos, then save opinion
        await selectRequiredPhotos(page);
        await wait(1000);
        await clickSaveOpinion(page);

        // Sign Out
        const profileIcon = getNavLocator(page, 'userProfileDropdown');
        if (await profileIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
          await profileIcon.click({ force: true });
          await wait(1500);
          const signOutBtn = page.locator(
            'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
            '.v-list-item:has-text("Sign Out"), button:has-text("Logout"), ' +
            'a:has-text("Logout"), .v-list-item:has-text("Logout")'
          ).first();
          if (await signOutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await signOutBtn.click({ force: true });
            await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
            console.log('  âœ“ Signed out');
          } else {
            console.log('  âš   Sign Out button not found in menu');
          }
        }

        const allFilled = FACTOR_NAMES.every(n => afmViewData[AFM_LABEL[n]] !== null);

        allResults.push({
          propertyId,
          propertyUrl,
          originalOpinionTotal,
          sumOf8Fields,
          opinionTotalOnPage,
          opinionTotalMatch,
          ...afmViewData,
          ...afmRatioData,
          passed: allFilled && opinionTotalMatch,
        });

      } finally {
        await context.close();
      }
    }

    // Save all results
    const outputDir = path.join(__dirname, '..', 'output');
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      path.join(outputDir, 'affiliate-manager-opinion-all-results.json'),
      JSON.stringify({
        capturedAt: new Date().toISOString(),
        formula: 'Affiliate manager <factor> ratio = Affiliate manager <factor> / originalOpinionTotal',
        results: allResults,
      }, null, 2)
    );

    // Summary
    console.log(`\n${'â•'.repeat(60)}`);
    console.log('=== AFM-002 SUMMARY ===');
    for (const r of allResults) {
      console.log(`  ${r.passed ? 'âœ“ PASS' : 'âœ— FAIL'}  Property ${r.propertyId}`);
      if (!r.passed) {
        if (!FACTOR_NAMES.every(n => r[AFM_LABEL[n]] !== null)) {
          const missing = FACTOR_NAMES.filter(n => r[AFM_LABEL[n]] === null);
          missing.forEach(n => console.log(`         â†³ ${AFM_LABEL[n]}: field not filled`));
        }
        if (!r.opinionTotalMatch) {
          console.log(`         â†³ Opinion Total on page: ${r.opinionTotalOnPage} (expected ${r.sumOf8Fields})`);
        }
      }
    }
    const totalPass = allResults.filter(r => r.passed).length;
    console.log(`\n  ${totalPass} / ${allResults.length} properties passed.`);

    const failedAfm = allResults.filter(r => !r.passed);
    expect(failedAfm,
      `${failedAfm.length} property/ies failed: ${failedAfm.map(r => r.propertyId).join(', ')}`
    ).toHaveLength(0);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // SA-001 : Login as Sub Agent â†’ Settings â†’ Y-Total â†’ Search icon
  //          â†’ Open property â†’ Click Edit icon on opinion section
  //          â†’ Assert AFM values (6) pre-filled in all 8 fields
  //          â†’ Go back to property â†’ Assert admin values (5) NOT visible
  //          â†’ Fill all 8 fields with sub agent values (7)
  //          â†’ Calculate ratios (sub agent <factor> / originalOpinionTotal)
  //          â†’ Assert Opinion Total on page = sum of 8 fields
  //          â†’ Save opinion â†’ Navigate to chart â†’ Assert OPINION on panel = sum
  //          â†’ Save result â†’ Sign Out
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('SA-001: Sub Agent fills, saves and verifies opinion fields, then signs out', async ({ page }) => {
    test.setTimeout(4 * 60 * 1000); // 4 minutes
    await page.setViewportSize({ width: 1440, height: 900 });

    // â”€â”€ Resolve property ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let propertyId = PROPERTY_ID_ENV;
    if (!propertyId) {
      const firstScenario = excelData.bvtScenarios?.[0];
      if (firstScenario?.propertyId) {
        propertyId = String(firstScenario.propertyId);
      } else if (firstScenario?.scenario) {
        const match = String(firstScenario.scenario).match(/\d{5,}/);
        if (match) propertyId = match[0];
      }
    }
    if (!propertyId) {
      throw new Error(
        'Property ID not set. Provide it via env var PROPERTY_ID=<id> ' +
        'or add a propertyId column to the BVT Scenarios Excel sheet.'
      );
    }
    const propertyUrl = `${BASE_URL}/properties/${propertyId}`;
    console.log(`\n  Property ID  : ${propertyId}`);
    console.log(`  Property URL : ${propertyUrl}`);

    // â”€â”€ STEP 1: Login (Sub Agent) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 1: Login (Sub Agent) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.goto(`${BASE_URL}/login`);
    await getLoginLocator(page, 'emailInput').fill(SA_EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(SA_PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
    console.log(`  âœ“ Logged in â€” URL: ${page.url()}`);

    // â”€â”€ STEP 2: Navigate to Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 2: Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await removeScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    // If not redirected to settings within 8s, reload and try clicking again
    try {
      await page.waitForURL('**/settings**', { timeout: 8000 });
    } catch {
      console.log('  âš  Not redirected to settings â€” reloading and retrying...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await removeScrim(page);
      await getNavLocator(page, 'settingsNav').first().click({ force: true });
      await page.waitForURL('**/settings**', { timeout: 15000 });
    }
    await page.waitForLoadState('domcontentloaded');
    // If Y-Total tab not visible within 3s after URL change, reload the settings page
    const yTotalTabSa = getYFormulaLocator(page, 'yTotalTab').first();
    try {
      await yTotalTabSa.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      console.log('  âš  Y-Total tab not found â€” reloading settings page...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await yTotalTabSa.waitFor({ state: 'visible', timeout: 10000 });
    }
    await yTotalTabSa.click({ force: true });
    await wait(2000);
    console.log('  âœ“ On Settings â†’ Y-Total tab');

    // â”€â”€ STEP 3: Click Search icon on matching formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 3: Click Search icon on formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const formulaRow = matchingFormulaRow(page, mls, state, county);
    const searchBtnSa = await formulaRow.count() > 0
      ? formulaRow.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
    await expect(searchBtnSa).toBeVisible({ timeout: 10000 });
    await searchBtnSa.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(3000);
    console.log('  âœ“ Properties page loaded');

    // â”€â”€ STEP 4: Open opinion URL (AFM opinion ID) â†’ assert AFM values prefilled â”€
    console.log('\nâ”€â”€ STEP 4: Open opinion URL (AFM opinion ID) â”€â”€â”€â”€â”€â”€â”€â”€');
    const sharedDataSa       = readSharedOpinionData();
    const afmOpinionIdForUrl = sharedDataSa.afmOpinionId;
    const saAlreadyFilled    = !!sharedDataSa.saOpinionId;
    const propertyAddressSa  = sharedDataSa.propertyAddress || '';
    const afmPreFillAssertions = [];
    if (afmOpinionIdForUrl) {
      const encodedSaName = encodeURIComponent(propertyAddressSa).replace(/%20/g, '+');
      const opinionUrlSa  = `${propertyUrl}?name=${encodedSaName}&type=opinion&opinionId=${afmOpinionIdForUrl}`;
      console.log(`  AFM Opinion ID : ${afmOpinionIdForUrl}`);
      console.log(`  Opinion URL    : ${opinionUrlSa}`);
      await page.goto(opinionUrlSa, { waitUntil: 'domcontentloaded', timeout: 30000 });
      try {
        await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
          .first().waitFor({ state: 'hidden', timeout: 20000 });
      } catch { /* no spinner */ }
      await wait(3000);
      await scrollPropertyPage(page);
      await page.screenshot({ path: 'screenshots/sa001-opinion-url-opened.png' });
      console.log('  âœ“ Opinion URL opened â€” asserting AFM pre-filled values in Sub Agent account');

      // â”€â”€ Assert each factor field shows the Affiliate Manager's value â”€â”€â”€â”€â”€â”€
      // Since the Sub Agent hasn't provided an opinion yet, opening the opinion
      // URL (with afmOpinionId) should pre-fill the Affiliate Manager's values.
      console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
      console.log('  SA-001 PRE-FILL ASSERTION: AFM values visible in Sub Agent account');
      console.log(`  ${'Factor'.padEnd(12)} | AFM Value | SA Pre-fill  | Result`);
      console.log(`  ${'-'.repeat(58)}`);

      for (const name of FACTOR_NAMES) {
        const input     = page.locator(`input[placeholder*="${name}" i]`).first();
        const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
        if (!isVisible) {
          afmPreFillAssertions.push({ name, found: false, value: null, pass: false });
          console.log(`  âš   [${name}] input not visible â€” skipping assertion`);
          continue;
        }
        const val      = await input.inputValue().catch(() => null);
        const numVal   = val !== null ? parseFloat(val) : NaN;
        const expected = parseFloat(AFM_OPINION_VALUES[name]);
        const pass     = !isNaN(numVal) && Math.abs(numVal - expected) < 0.01;
        const resultLabel = pass ? 'âœ“ PASS' : 'âœ— FAIL';

        afmPreFillAssertions.push({ name, found: true, value: numVal, pass });
        console.log(`  ${name.padEnd(12)} | ${String(AFM_OPINION_VALUES[name]).padEnd(9)} | ${String(val ?? '(empty)').padEnd(12)} | ${resultLabel}`);

        if (!saAlreadyFilled) {
          expect.soft(
            numVal,
            `Affiliate manager ${name.toLowerCase()} value is matching in the sub agent account ` +
            `due to sub agent hasn't provided a opinion yet ` +
            `(expected ${expected}, got ${val})`
          ).toBeCloseTo(expected, 2);
        }
      }

      console.log(`  ${'-'.repeat(58)}`);
      console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');
      console.log('  âœ“ AFM value pre-fill assertion done in Sub Agent account');
    } else {
      console.log('  âš   No AFM opinion ID in shared data â€” skipping opinion URL step (run AFM-001 first)');
    }

    // â”€â”€ STEP 7: Go back to property page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 7: Go back to property page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(4000);
    await scrollPropertyPage(page);
    console.log(`  âœ“ Back on property page: ${page.url()}`);

    // â”€â”€ STEP 8: Read Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 8: Read Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const originalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
    const originalYTotal       = await readValueNearLabel(page, /^original\s+y\s+total$/i);
    console.log(`  Original Opinion Total : ${originalOpinionTotal}`);
    console.log(`  Original Y Total       : ${originalYTotal}`);
    expect(originalOpinionTotal,
      'Original Opinion Total must be readable on the property page'
    ).not.toBeNull();

    // â”€â”€ STEP 9: Assert admin values NOT visible + Fill sub agent values â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 9: Verify admin values not visible â†’ Fill sub agent values â”€');
    // Click edit icon again if needed (fresh page load may close it)
    const editOpinionBtn2 = page.locator(
      '[class*="opinion"] button:has(.mdi-pencil), ' +
      '[class*="opinion"] button:has(.mdi-pencil-outline), ' +
      '[class*="opinion"] .mdi-pencil, ' +
      'button:has(.mdi-pencil-outline), ' +
      'button:has(.mdi-pencil)'
    ).first();
    const editBtnVisible2 = await editOpinionBtn2.isVisible({ timeout: 5000 }).catch(() => false);
    if (editBtnVisible2) {
      await editOpinionBtn2.scrollIntoViewIfNeeded().catch(() => {});
      await editOpinionBtn2.click({ force: true });
      await wait(2000);
      console.log('  âœ“ Edit icon clicked again for fresh form');
    }

    const saViewData  = {};
    const saRatioData = {};

    for (const name of FACTOR_NAMES) {
      const label      = SA_LABEL[name];
      const ratioLabel = `${label} ratio`;
      const value      = SA_OPINION_VALUES[name];
      const input      = page.locator(`input[placeholder*="${name}" i]`).first();

      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(200);

      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.log(`  âš   [${label}] input not visible â€” skipping`);
        saViewData[label]       = null;
        saRatioData[ratioLabel] = null;
        continue;
      }

      // Assert admin value ('5') is NOT the current pre-filled value
      const preFillVal = await input.inputValue().catch(() => null);
      const adminValueStr = OPINION_VALUES[name]; // e.g. '5'
      if (preFillVal === adminValueStr) {
        console.log(`  âš   [${name}] shows admin value '${adminValueStr}' â€” admin opinion should NOT be visible to sub agent`);
      } else {
        console.log(`  âœ“  [${name}] pre-fill: '${preFillVal}' (not admin value '${adminValueStr}') â€” OK`);
      }
      expect.soft(preFillVal,
        `[${name}] admin value '${adminValueStr}' should NOT be visible to sub agent`
      ).not.toBe(adminValueStr);

      // Now fill sub agent value
      await input.click({ force: true });
      await wait(200);
      await input.fill('');
      await wait(100);
      await input.fill(value);
      await wait(300);

      const filled = await input.inputValue().catch(() => null);
      saViewData[label] = filled !== null ? parseFloat(filled) : null;

      const ratio = saViewData[label] !== null && originalOpinionTotal && originalOpinionTotal !== 0
        ? (saViewData[label] / originalOpinionTotal)
        : null;
      saRatioData[ratioLabel] = ratio;

      console.log(`  [${label}] â†’ value: "${filled}" | ratio: ${ratio}`);
    }

    await page.screenshot({ path: 'screenshots/sa001-fields-filled.png' });

    // â”€â”€ STEP 10: Sub Agent View & Ratio summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 10: Sub Agent View & Ratio Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log(`\n  ${'Field'.padEnd(26)} | Value | Ratio`);
    console.log(`  ${'-'.repeat(55)}`);
    for (const name of FACTOR_NAMES) {
      const label      = SA_LABEL[name];
      const ratioLabel = `${label} ratio`;
      console.log(`  ${label.padEnd(26)} | ${String(saViewData[label]).padEnd(5)} | ${saRatioData[ratioLabel]}`);
    }
    console.log(`  ${'-'.repeat(55)}`);

    // â”€â”€ STEP 11: Assert Opinion Total on property page = sum of 8 fields â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 11: Assert Opinion Total on property page â”€â”€â”€');
    const sumOf8Fields = Object.values(saViewData).reduce((s, v) => s + (v || 0), 0);
    console.log(`  Expected Opinion Total (sum of 8 fields): ${sumOf8Fields}`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(800);
    await page.screenshot({ path: 'screenshots/sa001-opinion-total-check.png' });

    const opinionTotalOnPage = await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const label = all.find(el =>
        /^opinion\s+total$/i.test(el.innerText?.trim()) &&
        el.children.length < 4 &&
        el.tagName !== 'BODY' && el.tagName !== 'HTML'
      );
      if (!label) return null;
      const parent = label.parentElement;
      if (parent) {
        const siblings = [...parent.children];
        const idx = siblings.indexOf(label);
        for (let i = idx + 1; i < siblings.length; i++) {
          const t = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
        const next = parent.nextElementSibling;
        if (next) {
          const t = next.innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
      }
      return null;
    });

    console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('  SA-001: OPINION TOTAL ASSERTION (before Save Opinion)');
    console.log(`  Expected (sum of 8 fields)   : ${sumOf8Fields}`);
    console.log(`  Page 'Opinion Total' shows   : ${opinionTotalOnPage}`);
    const opinionTotalMatch = opinionTotalOnPage !== null &&
      Math.abs(opinionTotalOnPage - sumOf8Fields) < 0.01;
    console.log(`  Result                       : ${opinionTotalMatch ? 'âœ“ PASS' : 'âœ— FAIL'}`);
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');

    // â”€â”€ STEP 12: Select Photos & Save Opinion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 12: Select Photos & Save Opinion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await selectRequiredPhotos(page);
    await wait(1000);
    await page.screenshot({ path: 'screenshots/sa001-before-save.png' });

    // Save sub agent opinion ID to shared data — must capture BEFORE clicking save
    const saOpinionApi = await captureOpinionApiOnSave(page, () => clickSaveOpinion(page));
    const saOpinionId = extractOpinionId(saOpinionApi?.body); // Or however you extract it elsewhere
    if (saOpinionId) {
      saveSharedOpinionData({ saOpinionId });
      console.log('  âœ“ SA opinion ID saved to shared-opinion-data.json');
    }

    // â”€â”€ STEP 13: Re-open property page â†’ assert Opinion Total = sum of 8 fields â”€
    // Instead of finding the property on the chart/plot, we navigate back to
    // the property page and read the "Opinion Total" stat card directly.
    console.log('\nâ”€â”€ STEP 13: Verify Opinion Total after Save â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(4000);
    await scrollPropertyPage(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(1500);
    await page.screenshot({ path: 'screenshots/sa001-post-save-property.png' });

    const opinionTotalAfterSave = await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const label = all.find(el =>
        /^opinion\s+total$/i.test(el.innerText?.trim()) &&
        el.children.length < 4 &&
        el.tagName !== 'BODY' && el.tagName !== 'HTML'
      );
      if (!label) return null;
      const parent = label.parentElement;
      if (parent) {
        const siblings = [...parent.children];
        const idx = siblings.indexOf(label);
        for (let i = idx + 1; i < siblings.length; i++) {
          const t = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
        const next = parent.nextElementSibling;
        if (next) {
          const t = next.innerText?.trim().replace(/[$,\s]/g, '');
          if (t && /^-?[\d.]+$/.test(t)) return parseFloat(t);
        }
      }
      return null;
    });

    console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('  SA-001: POST-SAVE OPINION TOTAL ASSERTION');
    console.log(`  Sum of 8 filled fields       : ${sumOf8Fields}`);
    console.log(`  Page 'Opinion Total' shows   : ${opinionTotalAfterSave}`);
    const postSaveMatch = opinionTotalAfterSave !== null &&
      Math.abs(opinionTotalAfterSave - sumOf8Fields) < 0.01;
    console.log(`  Result                       : ${postSaveMatch ? 'âœ“ PASS' : 'âœ— FAIL'}`);
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');
    await page.screenshot({ path: 'screenshots/sa001-opinion-total-post-save.png' });

    // â”€â”€ STEP 14: Save result to output/sub-agent-opinion-result.json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const result = {
      capturedAt: new Date().toISOString(),
      propertyId,
      propertyUrl,
      originalOpinionTotal,
      originalYTotal,
      afmPreFillCheck: afmPreFillAssertions,
      sumOf8Fields,
      opinionTotalOnPage,
      opinionTotalMatch,
      opinionTotalAfterSave,
      postSaveMatch,
      ...saViewData,
      ...saRatioData,
      formula: 'sub agent <factor> ratio = sub agent <factor> / originalOpinionTotal',
    };
    const savedPath = saveSubAgentOpinionResult(result);
    console.log(`\n  âœ“ Result saved to: ${savedPath}`);

    // â”€â”€ STEP 15: Open average opinion URL (afmOpinionId + 1) & assert â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 15: Open average opinion URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const sharedForAvg    = readSharedOpinionData();
    const afmIdForAvg     = sharedForAvg.afmOpinionId;
    const avgOpinionId    = afmIdForAvg ? afmIdForAvg + 1 : null;
    const avgPropertyId   = sharedForAvg.propertyId || propertyId;
    const avgUrl = `${BASE_URL}/properties/${avgPropertyId}?name=2291+Nicolle+Avenue&type=average&opinionId=${avgOpinionId}`;
    console.log(`  AFM Opinion ID     : ${afmIdForAvg}`);
    console.log(`  Average Opinion ID : ${avgOpinionId}`);
    console.log(`  Average URL        : ${avgUrl}`);

    await page.goto(avgUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 20000 });
    } catch { /* no spinner */ }
    await wait(3000);

    // Scroll down to reveal all content
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(400);
    for (const y of [300, 600, 900, 1200, 1500]) {
      await page.evaluate((offset) => window.scrollBy(0, offset), y);
      await wait(500);
    }
    await page.screenshot({ path: 'screenshots/sa001-average-opinion-url.png' });

    // Assert the page loaded (URL contains the property ID)
    const avgCurrentUrl = page.url();
    console.log(`  Current URL : ${avgCurrentUrl}`);
    expect(
      avgCurrentUrl,
      `Average opinion URL should contain property ID ${avgPropertyId}`
    ).toContain(String(avgPropertyId));
    console.log('  âœ“ Average opinion URL opened and verified');

    // â”€â”€ Read admin & AFM saved result files to get per-factor values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let adminResult = {};
    let afmResult   = {};
    try {
      adminResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'admin-opinion-result.json'), 'utf8'));
    } catch { console.log('  âš   admin-opinion-result.json not found â€” skipping average assertion'); }
    try {
      afmResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'affiliate-manager-opinion-result.json'), 'utf8'));
    } catch { console.log('  âš   affiliate-manager-opinion-result.json not found â€” skipping average assertion'); }

    // â”€â”€ Assert average factor values on the page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('  SA-001 AVERAGE URL ASSERTION: (Admin + AFM + Sub Agent) / 3 per factor');
    console.log(`  ${'Factor'.padEnd(12)} | Admin | AFM | SA | Expected Avg | Page Value | Result`);
    console.log(`  ${'-'.repeat(80)}`);

    for (const name of FACTOR_NAMES) {
      const adminVal = adminResult[ADMIN_LABEL[name]] ?? null;
      const afmVal   = afmResult[AFM_LABEL[name]]    ?? null;
      const saVal    = saViewData[SA_LABEL[name]]     ?? null;

      if (adminVal === null || afmVal === null || saVal === null) {
        console.log(`  ${name.padEnd(12)} | ${adminVal} | ${afmVal} | ${saVal} | âš   missing values â€” skipping`);
        continue;
      }

      const expectedAvg = parseFloat(((adminVal + afmVal + saVal) / 3).toFixed(4));
      const calcStr     = `(${adminVal} + ${afmVal} + ${saVal}) / 3 = ${expectedAvg}`;

      // Scroll the factor input into view, then read its value
      const input     = page.locator(`input[placeholder*="${name}" i]`).first();
      await input.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      await wait(400);
      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      let pageVal = null;
      if (isVisible) {
        const raw = await input.inputValue().catch(() => null);
        pageVal = raw !== null ? parseFloat(raw) : null;
      }

      const isMatch     = pageVal !== null && Math.abs(pageVal - expectedAvg) < 0.01;
      const resultLabel = isMatch ? 'âœ“ PASS' : (pageVal === null ? 'âš  NOT FOUND' : 'âœ— FAIL');

      console.log(`  ${name.padEnd(12)} | ${String(adminVal).padEnd(5)} | ${String(afmVal).padEnd(3)} | ${String(saVal).padEnd(2)} | ${String(expectedAvg).padEnd(12)} | ${String(pageVal ?? '(empty)').padEnd(10)} | ${resultLabel}`);
      console.log(`              Calculation: ${calcStr}`);

      expect.soft(
        pageVal,
        `${name} average value mismatch â€” expected ${expectedAvg} (${calcStr}) but page shows ${pageVal}`
      ).toBeCloseTo(expectedAvg, 2);
    }

    console.log(`  ${'-'.repeat(80)}`);
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');

    // â”€â”€ STEP 16: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 16: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const profileIcon = getNavLocator(page, 'userProfileDropdown');
    await expect(profileIcon).toBeVisible({ timeout: 10000 });
    await profileIcon.click({ force: true });
    await wait(1500);
    await page.screenshot({ path: 'screenshots/sa001-profile-menu.png' });

    const signOutBtn = page.locator(
      'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
      '.v-list-item:has-text("Sign Out"), [role="menuitem"]:has-text("Sign Out")'
    ).first();
    const signOutVisible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) {
      const logoutBtn = page.locator(
        'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
      ).first();
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click({ force: true });
      } else {
        console.log('  âš   Sign Out button not found â€” screenshot taken');
        await page.screenshot({ path: 'screenshots/sa001-signout-not-found.png' });
      }
    } else {
      await signOutBtn.click({ force: true });
    }

    await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
    await wait(1000);
    await page.screenshot({ path: 'screenshots/sa001-signed-out.png' });
    console.log(`  âœ“ Signed out â€” current URL: ${page.url()}`);

    // â”€â”€ PASS / FAIL hard assertions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const unfilled = FACTOR_NAMES.filter(n => saViewData[SA_LABEL[n]] === null);
    expect(unfilled,
      `${unfilled.length} factor field(s) could not be filled: ${unfilled.join(', ')}`
    ).toHaveLength(0);

    expect(opinionTotalOnPage,
      'Opinion Total not found on property page â€” check the stat card is visible'
    ).not.toBeNull();

    expect(Math.abs((opinionTotalOnPage ?? 0) - sumOf8Fields),
      `Opinion Total mismatch (before save) â€” page shows ${opinionTotalOnPage} but expected ${sumOf8Fields} (sum of 8 fields)`
    ).toBeLessThan(0.01);

    expect(opinionTotalAfterSave,
      'Opinion Total not found on property page after saving â€” check the stat card is visible'
    ).not.toBeNull();

    expect(Math.abs((opinionTotalAfterSave ?? 0) - sumOf8Fields),
      `Opinion Total mismatch (after save) â€” page shows ${opinionTotalAfterSave} but expected ${sumOf8Fields} (sum of 8 fields)`
    ).toBeLessThan(0.01);

    console.log('\n  âœ“ SA-001 COMPLETE');
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ADM-003 : Login as Admin â†’ Settings â†’ Y-Total â†’ click Edit icon on formula row
  //           â†’ update Base Value â†’ save dialog
  //           â†’ click Search icon â†’ open admin opinion URL â†’ scroll page
  //           â†’ assert each factor field = adminRatio Ã— newOriginalOpinionTotal
  //             PASS: show calculation in log
  //             FAIL: show it is not updating
  //           â†’ update saved admin values in admin-opinion-result.json
  //           â†’ Save Opinion â†’ Sign Out
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('ADM-003: Update Y-formula base value â†’ verify admin opinion field values updated â†’ save opinion â†’ sign out', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // â”€â”€ Read shared data (propertyId, propertyAddress, adminOpinionId) â”€â”€â”€â”€â”€â”€â”€â”€
    const shared         = readSharedOpinionData();
    const propertyId     = shared.propertyId || PROPERTY_ID_ENV;
    const propertyAddress = shared.propertyAddress || '';
    const adminOpinionId = shared.adminOpinionId;

    if (!propertyId)     throw new Error('No propertyId in shared-opinion-data.json â€” run ADM-001 first');
    if (!adminOpinionId) throw new Error('No adminOpinionId in shared-opinion-data.json â€” run ADM-001 first');

    // â”€â”€ Read previously saved admin ratio values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let savedAdminResult = {};
    try {
      savedAdminResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'admin-opinion-result.json'), 'utf8'));
    } catch { console.log('  âš   admin-opinion-result.json not found â€” ratios will be null'); }

    const propertyUrl  = `${BASE_URL}/properties/${propertyId}`;
    const newBaseValue = process.env.NEW_BASE_VALUE || '120';

    console.log(`\n  Property ID      : ${propertyId}`);
    console.log(`  Admin Opinion ID : ${adminOpinionId}`);
    console.log(`  New Base Value   : ${newBaseValue}`);

    // â”€â”€ STEP 1: Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 1: Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.goto(`${BASE_URL}/login`);
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
    console.log('  âœ“ Logged in');

    // â”€â”€ STEP 2: Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 2: Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await removeScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    await page.waitForURL('**/settings**', { timeout: 15000 });
    await wait(2000);
    await getYFormulaLocator(page, 'yTotalTab').first().click({ force: true });
    await wait(2000);
    console.log('  âœ“ On Settings â†’ Y-Total tab');

    // â”€â”€ STEP 3: Click Edit icon on the matching formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 3: Click Edit icon on formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const formulaRow = matchingFormulaRow(page, mls, state, county);
    const editBtn = await formulaRow.count() > 0
      ? formulaRow.locator('td:last-child button:nth-child(1)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(1)');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click({ force: true });
    await wait(2000);
    await page.screenshot({ path: 'screenshots/adm003-edit-dialog-opened.png' });
    console.log('  âœ“ Edit dialog opened');

    // â”€â”€ STEP 4: Update the Base Value â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log(`\nâ”€â”€ STEP 4: Update Base Value to ${newBaseValue} â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`);
    const baseValueInput = page.locator(
      '.v-dialog:visible input[placeholder*="Base Value" i], ' +
      '.v-dialog:visible input[placeholder*="base value" i], ' +
      '.v-dialog:visible input[type="number"]'
    ).first();
    await expect(baseValueInput).toBeVisible({ timeout: 10000 });
    await baseValueInput.scrollIntoViewIfNeeded().catch(() => {});
    await baseValueInput.click({ clickCount: 3, force: true });
    await baseValueInput.fill('');
    await wait(200);
    await baseValueInput.fill(newBaseValue);
    await wait(500);
    console.log(`  âœ“ Base Value field updated to: ${newBaseValue}`);
    await page.screenshot({ path: 'screenshots/adm003-base-value-entered.png' });

    // â”€â”€ STEP 5: Save / confirm the edit dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 5: Save edit dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    // Try common save/confirm button labels in the dialog
    const saveDialogBtn = page.locator(
      '.v-dialog:visible button:has-text("Save"), ' +
      '.v-dialog:visible button:has-text("Update"), ' +
      '.v-dialog:visible button:has-text("Confirm")'
    ).first();
    const saveDialogVisible = await saveDialogBtn.isVisible({ timeout: 4000 }).catch(() => false);

    if (saveDialogVisible) {
      await saveDialogBtn.click({ force: true });
      await wait(3000);
      console.log('  âœ“ Saved via Save/Update/Confirm button');
    } else {
      // Wizard-style: navigate Next â†’ Next â†’ Add
      const nextBtn = page.locator('.v-dialog:visible button:has-text("Next")').first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click({ force: true });
        await wait(1500);
        await nextBtn.click({ force: true }).catch(() => {});
        await wait(1500);
        const addBtn = page.locator('.v-dialog:visible button:has-text("Add"), .v-dialog:visible button:has-text("Save")').last();
        if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await addBtn.click({ force: true });
          await wait(3000);
          console.log('  âœ“ Saved via wizard Next â†’ Next â†’ Add');
        } else {
          await page.keyboard.press('Escape');
          await wait(1000);
          console.log('  âš   Could not find save button â€” dialog closed via Escape');
        }
      } else {
        await page.keyboard.press('Escape');
        await wait(1000);
        console.log('  âš   Dialog closed via Escape (no Next/Save button found)');
      }
    }

    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 15000 });
    } catch { /* no spinner */ }
    await wait(2000);
    await page.screenshot({ path: 'screenshots/adm003-after-dialog-save.png' });

    // â”€â”€ STEP 6: Click Search icon on the formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 6: Click Search icon on formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const formulaRow2 = matchingFormulaRow(page, mls, state, county);
    const searchBtn = await formulaRow2.count() > 0
      ? formulaRow2.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(3000);
    console.log('  âœ“ Properties page loaded');

    // â”€â”€ STEP 7: Open admin opinion URL and scroll the page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 7: Open admin opinion URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const encodedAddress = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
    const adminOpinionUrl = `${propertyUrl}?name=${encodedAddress}&type=opinion&opinionId=${adminOpinionId}`;
    console.log(`  Admin Opinion URL: ${adminOpinionUrl}`);
    await page.goto(adminOpinionUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 20000 });
    } catch { /* no spinner */ }
    await wait(3000);
    await scrollPropertyPage(page);
    await page.screenshot({ path: 'screenshots/adm003-opinion-url-opened.png' });
    console.log('  âœ“ Admin opinion URL opened and page scrolled');

    // â”€â”€ STEP 8: Read new Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 8: Read new Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    const newOriginalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
    console.log(`  New Original Opinion Total: ${newOriginalOpinionTotal}`);

    // â”€â”€ STEP 9: Assert each factor field = adminRatio Ã— newOriginalOpinionTotal â”€
    console.log('\nâ”€â”€ STEP 9: Assert all factor field values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('  ADM-003: UPDATED Y-FORMULA OPINION FIELD ASSERTION');
    console.log(`  Formula: admin ratio Ã— new original opinion total = expected value`);
    console.log(`  ${'Factor'.padEnd(14)} | ${'Admin Ratio'.padEnd(12)} | ${'New Total'.padEnd(10)} | ${'Expected'.padEnd(10)} | ${'Page Value'.padEnd(10)} | Result`);
    console.log(`  ${'-'.repeat(82)}`);

    const updatedAdminViewData  = {};
    const updatedAdminRatioData = {};
    let allPass = true;

    for (const name of FACTOR_NAMES) {
      const label      = ADMIN_LABEL[name];
      const ratioLabel = `${label} ratio`;
      const adminRatio = savedAdminResult[ratioLabel] ?? null;
      const expected   = (adminRatio !== null && newOriginalOpinionTotal !== null)
        ? parseFloat((adminRatio * newOriginalOpinionTotal).toFixed(2))
        : null;

      const input = page.locator(`input[placeholder*="${name}" i]`).first();
      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(200);

      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.log(`  ${name.padEnd(14)} | ${String(adminRatio ?? 'N/A').padEnd(12)} | ${String(newOriginalOpinionTotal ?? 'N/A').padEnd(10)} | ${String(expected ?? 'N/A').padEnd(10)} | not visible  | âœ— FAIL`);
        console.log(`    â†’ FAIL: input field not visible on page`);
        updatedAdminViewData[label]      = null;
        updatedAdminRatioData[ratioLabel] = null;
        allPass = false;
        expect.soft(false, `[${name}] input not visible`).toBe(true);
        continue;
      }

      const pageValue = await input.inputValue().catch(() => null);
      const pageNum   = pageValue !== null ? parseFloat(pageValue) : NaN;
      const pass      = expected !== null && !isNaN(pageNum) && Math.abs(pageNum - expected) < 0.01;

      if (pass) {
        console.log(`  ${name.padEnd(14)} | ${String(adminRatio).padEnd(12)} | ${String(newOriginalOpinionTotal).padEnd(10)} | ${String(expected).padEnd(10)} | ${String(pageNum).padEnd(10)} | âœ“ PASS`);
        console.log(`    â†’ Calculation: ${adminRatio} Ã— ${newOriginalOpinionTotal} = ${expected} â€” page shows ${pageNum} âœ“ updated correctly`);
      } else {
        console.log(`  ${name.padEnd(14)} | ${String(adminRatio ?? 'N/A').padEnd(12)} | ${String(newOriginalOpinionTotal ?? 'N/A').padEnd(10)} | ${String(expected ?? 'N/A').padEnd(10)} | ${String(isNaN(pageNum) ? '(empty)' : pageNum).padEnd(10)} | âœ— FAIL`);
        console.log(`    â†’ FAIL: value is NOT updating â€” expected ${expected} (${adminRatio} Ã— ${newOriginalOpinionTotal}), page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`);
        allPass = false;
      }

      updatedAdminViewData[label]      = !isNaN(pageNum) ? pageNum : null;
      updatedAdminRatioData[ratioLabel] = (updatedAdminViewData[label] !== null && newOriginalOpinionTotal)
        ? (updatedAdminViewData[label] / newOriginalOpinionTotal)
        : null;

      expect.soft(pass, `[${name}] expected ${expected} (adminRatio ${adminRatio} Ã— newTotal ${newOriginalOpinionTotal}), page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`).toBe(true);
    }

    console.log(`  ${'-'.repeat(82)}`);
    console.log(`  Overall Result: ${allPass ? 'âœ“ ALL FACTORS UPDATED CORRECTLY' : 'âœ— SOME FACTORS NOT UPDATING'}`);
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');
    await page.screenshot({ path: 'screenshots/adm003-factor-assertions.png' });

    // â”€â”€ STEP 10: Update admin-opinion-result.json with new values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 10: Update saved admin opinion result â”€â”€â”€â”€â”€â”€â”€');
    const updatedResult = {
      ...savedAdminResult,
      capturedAt: new Date().toISOString(),
      newBaseValue,
      newOriginalOpinionTotal,
      ...updatedAdminViewData,
      ...updatedAdminRatioData,
      formulaUpdateNote: `Base value updated to ${newBaseValue}; values recalculated from ratios Ã— ${newOriginalOpinionTotal}`,
    };
    saveAdminOpinionResult(updatedResult);
    console.log('  âœ“ admin-opinion-result.json updated with new values');

    // â”€â”€ STEP 11: Save Opinion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 11: Save Opinion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await selectRequiredPhotos(page);
    await wait(1000);
    await clickSaveOpinion(page);
    await page.screenshot({ path: 'screenshots/adm003-after-save.png' });
    console.log('  âœ“ Opinion saved');

    // â”€â”€ STEP 12: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 12: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const profileIcon = getNavLocator(page, 'userProfileDropdown');
    await expect(profileIcon).toBeVisible({ timeout: 10000 });
    await profileIcon.click({ force: true });
    await wait(1500);
    await page.screenshot({ path: 'screenshots/adm003-profile-menu.png' });

    const signOutBtn = page.locator(
      'button:has-text("Sign Out"), ' +
      'a:has-text("Sign Out"), ' +
      '.v-list-item:has-text("Sign Out"), ' +
      '[role="menuitem"]:has-text("Sign Out")'
    ).first();
    const signOutVisible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) {
      const logoutBtn = page.locator(
        'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
      ).first();
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click({ force: true });
      } else {
        console.log('  âš   Sign Out button not found');
        await page.screenshot({ path: 'screenshots/adm003-signout-not-found.png' });
      }
    } else {
      await signOutBtn.click({ force: true });
    }
    await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
    await wait(1000);
    console.log(`  âœ“ Signed out â€” current URL: ${page.url()}`);

    // â”€â”€ Hard assertion: all factors must match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    expect(allPass,
      'One or more factor field values did not match admin ratio Ã— new original opinion total after base value update'
    ).toBe(true);

    console.log('\n  âœ“ ADM-003 COMPLETE');
  });

  // AFM-003 (test-5) : Login as Affiliate Manager â†’ Settings â†’ Y-Total â†’ click Search icon
  //           â†’ open AFM opinion URL â†’ scroll page
  //           â†’ assert each factor field = afmRatio Ã— newOriginalOpinionTotal
  //             PASS: show calculation in log
  //             FAIL: show it is not updating
  //           â†’ update saved AFM values in affiliate-manager-opinion-result.json
  //           â†’ Sign Out
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('AFM-003: Verify affiliate manager opinion field values reflect updated Y-formula (login â†’ settings search â†’ opinion URL â†’ assert)', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // â”€â”€ Read shared data (propertyId, propertyAddress, afmOpinionId) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const shared          = readSharedOpinionData();
    const propertyId      = shared.propertyId || PROPERTY_ID_ENV;
    const propertyAddress = shared.propertyAddress || '';
    const afmOpinionId    = shared.afmOpinionId;

    if (!propertyId)   throw new Error('No propertyId in shared-opinion-data.json â€” run AFM-001 first');
    if (!afmOpinionId) throw new Error('No afmOpinionId in shared-opinion-data.json â€” run AFM-001 first');

    // â”€â”€ Read previously saved AFM ratio values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let savedAfmResult = {};
    try {
      savedAfmResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'affiliate-manager-opinion-result.json'), 'utf8'));
    } catch { console.log('  âš   affiliate-manager-opinion-result.json not found â€” ratios will be null'); }

    const propertyUrl = `${BASE_URL}/properties/${propertyId}`;

    console.log(`\n  Property ID    : ${propertyId}`);
    console.log(`  AFM Opinion ID : ${afmOpinionId}`);

    // â”€â”€ STEP 1: Login (Affiliate Manager) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 1: Login (Affiliate Manager) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.goto(`${BASE_URL}/login`);
    await getLoginLocator(page, 'emailInput').fill(AFM_EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(AFM_PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
    console.log(`  âœ“ Logged in â€” URL: ${page.url()}`);

    // â”€â”€ STEP 2: Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 2: Settings â†’ Y-Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await removeScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    try {
      await page.waitForURL('**/settings**', { timeout: 8000 });
    } catch {
      console.log('  âš  Not redirected to settings â€” reloading and retrying...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await removeScrim(page);
      await getNavLocator(page, 'settingsNav').first().click({ force: true });
      await page.waitForURL('**/settings**', { timeout: 15000 });
    }
    await page.waitForLoadState('domcontentloaded');
    const yTotalTabAfm3 = getYFormulaLocator(page, 'yTotalTab').first();
    try {
      await yTotalTabAfm3.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      console.log('  âš  Y-Total tab not found â€” reloading settings page...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await yTotalTabAfm3.waitFor({ state: 'visible', timeout: 10000 });
    }
    await yTotalTabAfm3.click({ force: true });
    await wait(2000);
    console.log('  âœ“ On Settings â†’ Y-Total tab');

    // â”€â”€ STEP 3: Click Search icon on the matching formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 3: Click Search icon on formula row â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const formulaRow = matchingFormulaRow(page, mls, state, county);
    const searchBtn = await formulaRow.count() > 0
      ? formulaRow.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(3000);
    console.log('  âœ“ Properties page loaded');

    // â”€â”€ STEP 4: Open AFM opinion URL and scroll the page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 4: Open AFM opinion URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const encodedAddress  = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
    const afmOpinionUrl   = `${propertyUrl}?name=${encodedAddress}&type=opinion&opinionId=${afmOpinionId}`;
    console.log(`  AFM Opinion URL: ${afmOpinionUrl}`);
    await page.goto(afmOpinionUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 20000 });
    } catch { /* no spinner */ }
    await wait(3000);
    await scrollPropertyPage(page);
    await page.screenshot({ path: 'screenshots/afm003-opinion-url-opened.png' });
    console.log('  âœ“ AFM opinion URL opened and page scrolled');

    // â”€â”€ STEP 5: Read new Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 5: Read new Original Opinion Total â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    const newOriginalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
    console.log(`  New Original Opinion Total: ${newOriginalOpinionTotal}`);

    // â”€â”€ STEP 6: Assert each factor field = afmRatio Ã— newOriginalOpinionTotal â”€
    console.log('\nâ”€â”€ STEP 6: Assert all factor field values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    console.log('  AFM-003: UPDATED Y-FORMULA OPINION FIELD ASSERTION (Affiliate Manager)');
    console.log(`  Formula: afm ratio Ã— new original opinion total = expected value`);
    console.log(`  ${  'Factor'.padEnd(14)} | ${'AFM Ratio'.padEnd(12)} | ${'New Total'.padEnd(10)} | ${'Expected'.padEnd(10)} | ${'Page Value'.padEnd(10)} | Result`);
    console.log(`  ${'-'.repeat(82)}`);

    const updatedAfmViewData  = {};
    const updatedAfmRatioData = {};
    let allPass = true;

    for (const name of FACTOR_NAMES) {
      const label      = AFM_LABEL[name];
      const ratioLabel = `${label} ratio`;
      const afmRatio   = savedAfmResult[ratioLabel] ?? null;
      const expected   = (afmRatio !== null && newOriginalOpinionTotal !== null)
        ? parseFloat((afmRatio * newOriginalOpinionTotal).toFixed(2))
        : null;

      const input = page.locator(`input[placeholder*="${name}" i]`).first();
      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(200);

      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.log(`  ${name.padEnd(14)} | ${String(afmRatio ?? 'N/A').padEnd(12)} | ${String(newOriginalOpinionTotal ?? 'N/A').padEnd(10)} | ${String(expected ?? 'N/A').padEnd(10)} | not visible  | âœ— FAIL`);
        console.log(`    â†’ FAIL: input field not visible on page`);
        updatedAfmViewData[label]       = null;
        updatedAfmRatioData[ratioLabel] = null;
        allPass = false;
        expect.soft(false, `[${name}] input not visible`).toBe(true);
        continue;
      }

      const pageValue = await input.inputValue().catch(() => null);
      const pageNum   = pageValue !== null ? parseFloat(pageValue) : NaN;
      const pass      = expected !== null && !isNaN(pageNum) && Math.abs(pageNum - expected) < 0.01;

      if (pass) {
        console.log(`  ${name.padEnd(14)} | ${String(afmRatio).padEnd(12)} | ${String(newOriginalOpinionTotal).padEnd(10)} | ${String(expected).padEnd(10)} | ${String(pageNum).padEnd(10)} | âœ“ PASS`);
        console.log(`    â†’ Calculation: ${afmRatio} Ã— ${newOriginalOpinionTotal} = ${expected} â€” page shows ${pageNum} âœ“ updated correctly`);
      } else {
        console.log(`  ${name.padEnd(14)} | ${String(afmRatio ?? 'N/A').padEnd(12)} | ${String(newOriginalOpinionTotal ?? 'N/A').padEnd(10)} | ${String(expected ?? 'N/A').padEnd(10)} | ${String(isNaN(pageNum) ? '(empty)' : pageNum).padEnd(10)} | âœ— FAIL`);
        console.log(`    â†’ FAIL: value is NOT updating â€” expected ${expected} (${afmRatio} Ã— ${newOriginalOpinionTotal}), page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`);
        allPass = false;
      }

      updatedAfmViewData[label]       = !isNaN(pageNum) ? pageNum : null;
      updatedAfmRatioData[ratioLabel] = (updatedAfmViewData[label] !== null && newOriginalOpinionTotal)
        ? (updatedAfmViewData[label] / newOriginalOpinionTotal)
        : null;

      expect.soft(pass,
        `[${name}]: afmRatio ${afmRatio} Ã— newTotal ${newOriginalOpinionTotal} = expected ${expected}, but page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`
      ).toBe(true);
    }

    console.log(`  ${'-'.repeat(82)}`);
    console.log(`  Overall Result: ${allPass ? 'âœ“ ALL FACTORS UPDATED CORRECTLY' : 'âœ— SOME FACTORS NOT UPDATING'}`);
    console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n');
    await page.screenshot({ path: 'screenshots/afm003-factor-assertions.png' });

    // â”€â”€ STEP 7: Update affiliate-manager-opinion-result.json with new values â”€â”€
    console.log('\nâ”€â”€ STEP 7: Update saved AFM opinion result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const updatedResult = {
      ...savedAfmResult,
      capturedAt: new Date().toISOString(),
      newOriginalOpinionTotal,
      ...updatedAfmViewData,
      ...updatedAfmRatioData,
      formulaUpdateNote: `Values recalculated from ratios Ã— newOriginalOpinionTotal (${newOriginalOpinionTotal})`,
    };
    saveAfmOpinionResult(updatedResult);
    console.log('  âœ“ affiliate-manager-opinion-result.json updated with new values');

    // â”€â”€ STEP 8: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log('\nâ”€â”€ STEP 8: Sign Out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
    const profileIcon = getNavLocator(page, 'userProfileDropdown');
    await expect(profileIcon).toBeVisible({ timeout: 10000 });
    await profileIcon.click({ force: true });
    await wait(1500);
    await page.screenshot({ path: 'screenshots/afm003-profile-menu.png' });

    const signOutBtn = page.locator(
      'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
      '.v-list-item:has-text("Sign Out"), [role="menuitem"]:has-text("Sign Out")'
    ).first();
    const signOutVisible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) {
      const logoutBtn = page.locator(
        'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
      ).first();
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click({ force: true });
      } else {
        console.log('  âš   Sign Out button not found');
        await page.screenshot({ path: 'screenshots/afm003-signout-not-found.png' });
      }
    } else {
      await signOutBtn.click({ force: true });
    }
    await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
    await wait(1000);
    console.log(`  âœ“ Signed out â€” current URL: ${page.url()}`);

    // â”€â”€ Hard assertion: all factors must match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    expect(allPass,
      'One or more factor field values did not match afm ratio Ã— new original opinion total'
    ).toBe(true);

    console.log('\n  âœ“ AFM-003 COMPLETE');
  });


  // ────────────────────────────────────────────────────────────────────────────
  // SA-003 (test-6) : Login as Sub Agent → Settings → Y-Total → click Search icon
  //           → open Sub Agent opinion URL → scroll page
  //           → assert each factor field = saRatio × newOriginalOpinionTotal
  //             PASS: show calculation in log
  //             FAIL: show it is not updating
  //           → update saved SA values in sub-agent-opinion-result.json
  //           → Sign Out
  // ────────────────────────────────────────────────────────────────────────────
  test('SA-003: Verify sub agent opinion field values reflect updated Y-formula (login → settings search → opinion URL → assert)', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── Read shared data (propertyId, propertyAddress, saOpinionId) ──────────
    const shared          = readSharedOpinionData();
    const propertyId      = shared.propertyId || PROPERTY_ID_ENV;
    const propertyAddress = shared.propertyAddress || '';
    const saOpinionIdVal  = shared.saOpinionId;

    if (!propertyId)     throw new Error('No propertyId in shared-opinion-data.json — run SA-001 first');
    if (!saOpinionIdVal) throw new Error('No saOpinionId in shared-opinion-data.json — run SA-001 first');

    // ── Read previously saved Sub Agent ratio values ──────────────────────────
    let savedSaResult = {};
    try {
      savedSaResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'sub-agent-opinion-result.json'), 'utf8'));
    } catch { console.log('  ⚠  sub-agent-opinion-result.json not found — ratios will be null'); }

    const propertyUrl = `${BASE_URL}/properties/${propertyId}`;

    console.log(`\n  Property ID   : ${propertyId}`);
    console.log(`  SA Opinion ID : ${saOpinionIdVal}`);

    // ── STEP 1: Login (Sub Agent) ─────────────────────────────────────────────
    console.log('\n── STEP 1: Login (Sub Agent) ────────────────────────');
    await page.goto(`${BASE_URL}/login`);
    await getLoginLocator(page, 'emailInput').fill(SA_EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(SA_PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
    console.log(`  ✓ Logged in — URL: ${page.url()}`);

    // ── STEP 2: Settings → Y-Total ───────────────────────────────────────────
    console.log('\n── STEP 2: Settings → Y-Total ───────────────────────');
    await removeScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    try {
      await page.waitForURL('**/settings**', { timeout: 8000 });
    } catch {
      console.log('  ⚠ Not redirected to settings — reloading and retrying...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await removeScrim(page);
      await getNavLocator(page, 'settingsNav').first().click({ force: true });
      await page.waitForURL('**/settings**', { timeout: 15000 });
    }
    await page.waitForLoadState('domcontentloaded');
    const yTotalTabSa3 = getYFormulaLocator(page, 'yTotalTab').first();
    try {
      await yTotalTabSa3.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      console.log('  ⚠ Y-Total tab not found — reloading settings page...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await yTotalTabSa3.waitFor({ state: 'visible', timeout: 10000 });
    }
    await yTotalTabSa3.click({ force: true });
    await wait(2000);
    console.log('  ✓ On Settings → Y-Total tab');

    // ── STEP 3: Click Search icon on the matching formula row ─────────────────
    console.log('\n── STEP 3: Click Search icon on formula row ─────────');
    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const formulaRow = matchingFormulaRow(page, mls, state, county);
    const searchBtn = await formulaRow.count() > 0
      ? formulaRow.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(3000);
    console.log('  ✓ Properties page loaded');

    // ── STEP 4: Open Sub Agent opinion URL and scroll the page ───────────────
    console.log('\n── STEP 4: Open Sub Agent opinion URL ───────────────');
    const encodedAddress = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
    const saOpinionUrl   = `${propertyUrl}?name=${encodedAddress}&type=opinion&opinionId=${saOpinionIdVal}`;
    console.log(`  SA Opinion URL: ${saOpinionUrl}`);
    await page.goto(saOpinionUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 20000 });
    } catch { /* no spinner */ }
    await wait(3000);
    await scrollPropertyPage(page);
    await page.screenshot({ path: 'screenshots/sa003-opinion-url-opened.png' });
    console.log('  ✓ Sub Agent opinion URL opened and page scrolled');

    // ── STEP 5: Read new Original Opinion Total ───────────────────────────────
    console.log('\n── STEP 5: Read new Original Opinion Total ──────────');
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    const newOriginalOpinionTotal = await readValueNearLabel(page, /^original\s+opinion\s+total$/i);
    console.log(`  New Original Opinion Total: ${newOriginalOpinionTotal}`);

    // ── STEP 6: Assert each factor field = saRatio × newOriginalOpinionTotal ──
    console.log('\n── STEP 6: Assert all factor field values ─────────────────────────────');
    console.log('─────────────────────────────────────────────────────────────────────────');
    console.log('  SA-003: UPDATED Y-FORMULA OPINION FIELD ASSERTION (Sub Agent)');
    console.log(`  Formula: sub agent ratio × new original opinion total = expected value`);
    console.log(`  ${'Factor'.padEnd(14)} | ${'SA Ratio'.padEnd(12)} | ${'New Total'.padEnd(10)} | ${'Expected'.padEnd(10)} | ${'Page Value'.padEnd(10)} | Result`);
    console.log(`  ${'-'.repeat(82)}`);

    const updatedSaViewData  = {};
    const updatedSaRatioData = {};
    let allPass = true;

    for (const name of FACTOR_NAMES) {
      const label      = SA_LABEL[name];
      const ratioLabel = `${label} ratio`;
      const saRatio    = savedSaResult[ratioLabel] ?? null;
      const expected   = (saRatio !== null && newOriginalOpinionTotal !== null)
        ? parseFloat((saRatio * newOriginalOpinionTotal).toFixed(2))
        : null;

      const input = page.locator(`input[placeholder*="${name}" i]`).first();
      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(200);

      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.log(`  ${name.padEnd(14)} | ${String(saRatio ?? 'N/A').padEnd(12)} | ${String(newOriginalOpinionTotal ?? 'N/A').padEnd(10)} | ${String(expected ?? 'N/A').padEnd(10)} | not visible  | ✗ FAIL`);
        console.log(`    → FAIL: input field not visible on page`);
        updatedSaViewData[label]       = null;
        updatedSaRatioData[ratioLabel] = null;
        allPass = false;
        expect.soft(false, `[${name}] input not visible`).toBe(true);
        continue;
      }

      const pageValue = await input.inputValue().catch(() => null);
      const pageNum   = pageValue !== null ? parseFloat(pageValue) : NaN;
      const pass      = expected !== null && !isNaN(pageNum) && Math.abs(pageNum - expected) < 0.01;

      if (pass) {
        console.log(`  ${name.padEnd(14)} | ${String(saRatio).padEnd(12)} | ${String(newOriginalOpinionTotal).padEnd(10)} | ${String(expected).padEnd(10)} | ${String(pageNum).padEnd(10)} | ✓ PASS`);
        console.log(`    → Calculation: ${saRatio} × ${newOriginalOpinionTotal} = ${expected} — page shows ${pageNum} ✓ updated correctly`);
      } else {
        console.log(`  ${name.padEnd(14)} | ${String(saRatio ?? 'N/A').padEnd(12)} | ${String(newOriginalOpinionTotal ?? 'N/A').padEnd(10)} | ${String(expected ?? 'N/A').padEnd(10)} | ${String(isNaN(pageNum) ? '(empty)' : pageNum).padEnd(10)} | ✗ FAIL`);
        console.log(`    → FAIL: value is NOT updating — expected ${expected} (${saRatio} × ${newOriginalOpinionTotal}), page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`);
        allPass = false;
      }

      updatedSaViewData[label]       = !isNaN(pageNum) ? pageNum : null;
      updatedSaRatioData[ratioLabel] = (updatedSaViewData[label] !== null && newOriginalOpinionTotal)
        ? (updatedSaViewData[label] / newOriginalOpinionTotal)
        : null;

      expect.soft(pass,
        `[${name}]: saRatio ${saRatio} × newTotal ${newOriginalOpinionTotal} = expected ${expected}, but page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`
      ).toBe(true);
    }

    console.log(`  ${'-'.repeat(82)}`);
    console.log(`  Overall Result: ${allPass ? '✓ ALL FACTORS UPDATED CORRECTLY' : '✗ SOME FACTORS NOT UPDATING'}`);
    console.log('─────────────────────────────────────────────────────────────────────────\n');
    await page.screenshot({ path: 'screenshots/sa003-factor-assertions.png' });

    // ── STEP 7: Update sub-agent-opinion-result.json with new values ──────────
    console.log('\n── STEP 7: Update saved Sub Agent opinion result ────');
    const updatedResult = {
      ...savedSaResult,
      capturedAt: new Date().toISOString(),
      newOriginalOpinionTotal,
      ...updatedSaViewData,
      ...updatedSaRatioData,
      formulaUpdateNote: `Values recalculated from ratios × newOriginalOpinionTotal (${newOriginalOpinionTotal})`,
    };
    saveSubAgentOpinionResult(updatedResult);
    console.log('  ✓ sub-agent-opinion-result.json updated with new values');

    // ── STEP 8: Sign Out ──────────────────────────────────────────────────────
    console.log('\n── STEP 8: Sign Out ─────────────────────────────────');
    const profileIcon = getNavLocator(page, 'userProfileDropdown');
    await expect(profileIcon).toBeVisible({ timeout: 10000 });
    await profileIcon.click({ force: true });
    await wait(1500);
    await page.screenshot({ path: 'screenshots/sa003-profile-menu.png' });

    const signOutBtn = page.locator(
      'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
      '.v-list-item:has-text("Sign Out"), [role="menuitem"]:has-text("Sign Out")'
    ).first();
    const signOutVisible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisible) {
      const logoutBtn = page.locator(
        'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
      ).first();
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click({ force: true });
      } else {
        console.log('  ⚠  Sign Out button not found');
        await page.screenshot({ path: 'screenshots/sa003-signout-not-found.png' });
      }
    } else {
      await signOutBtn.click({ force: true });
    }
    await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
    await wait(1000);
    console.log(`  ✓ Signed out — current URL: ${page.url()}`);

    // ── Hard assertion: all factors must match ────────────────────────────────
    expect(allPass,
      'One or more factor field values did not match sub agent ratio × new original opinion total'
    ).toBe(true);

    console.log('\n  ✓ SA-003 COMPLETE');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // AVG-001 : Admin login → Settings → Y-Total → Search icon → open average
  //           opinion URL → scroll → assert each factor =
  //           (updated admin value + updated AFM value + updated SA value) / 3
  // ────────────────────────────────────────────────────────────────────────────
  test('AVG-001: Admin verifies average opinion URL: each factor = (admin + afm + sa) / 3', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── Read shared data ──────────────────────────────────────────────────────
    const shared          = readSharedOpinionData();
    const propertyId      = shared.propertyId || PROPERTY_ID_ENV;
    const propertyAddress = shared.propertyAddress || '';
    const afmOpinionId    = shared.afmOpinionId;

    if (!propertyId)   throw new Error('No propertyId in shared-opinion-data.json — run ADM-001 first');
    if (!afmOpinionId) throw new Error('No afmOpinionId in shared-opinion-data.json — run AFM-001 first');

    const avgOpinionId = afmOpinionId + 1;

    // ── Read updated values from all three result JSON files ──────────────────
    let savedAdminResult = {};
    let savedAfmResult   = {};
    let savedSaResult    = {};
    try {
      savedAdminResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'admin-opinion-result.json'), 'utf8'));
    } catch { console.log('  ⚠  admin-opinion-result.json not found'); }
    try {
      savedAfmResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'affiliate-manager-opinion-result.json'), 'utf8'));
    } catch { console.log('  ⚠  affiliate-manager-opinion-result.json not found'); }
    try {
      savedSaResult = JSON.parse(readFileSync(path.join(__dirname, '..', 'output', 'sub-agent-opinion-result.json'), 'utf8'));
    } catch { console.log('  ⚠  sub-agent-opinion-result.json not found'); }

    const propertyUrl = `${BASE_URL}/properties/${propertyId}`;

    console.log(`\n  Property ID      : ${propertyId}`);
    console.log(`  AFM Opinion ID   : ${afmOpinionId}`);
    console.log(`  Average Opinion ID: ${avgOpinionId}`);

    // ── STEP 1: Login (Admin) ─────────────────────────────────────────────────
    console.log('\n── STEP 1: Login (Admin) ────────────────────────────');
    await page.goto(`${BASE_URL}/login`);
    await getLoginLocator(page, 'emailInput').fill(EMAIL);
    await getLoginLocator(page, 'passwordInput').fill(PASSWORD);
    await getLoginLocator(page, 'signInButton').click();
    await page.waitForURL('**/affiliate-managers', { timeout: 20000 });
    console.log(`  ✓ Logged in — URL: ${page.url()}`);

    // ── STEP 2: Settings → Y-Total ───────────────────────────────────────────
    console.log('\n── STEP 2: Settings → Y-Total ───────────────────────');
    await removeScrim(page);
    await getNavLocator(page, 'settingsNav').first().click({ force: true });
    try {
      await page.waitForURL('**/settings**', { timeout: 8000 });
    } catch {
      console.log('  ⚠ Not redirected to settings — reloading and retrying...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await removeScrim(page);
      await getNavLocator(page, 'settingsNav').first().click({ force: true });
      await page.waitForURL('**/settings**', { timeout: 15000 });
    }
    await page.waitForLoadState('domcontentloaded');
    const yTotalTabAvg1 = getYFormulaLocator(page, 'yTotalTab').first();
    try {
      await yTotalTabAvg1.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      console.log('  ⚠ Y-Total tab not found — reloading settings page...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(2000);
      await yTotalTabAvg1.waitFor({ state: 'visible', timeout: 10000 });
    }
    await yTotalTabAvg1.click({ force: true });
    await wait(2000);
    console.log('  ✓ On Settings → Y-Total tab');

    // ── STEP 3: Click Search icon on the matching formula row ─────────────────
    console.log('\n── STEP 3: Click Search icon on formula row ─────────');
    const { mlsBoard: mls, state, county } = excelData.yFormula;
    const formulaRowAvg1 = matchingFormulaRow(page, mls, state, county);
    const searchBtnAvg1 = await formulaRowAvg1.count() > 0
      ? formulaRowAvg1.locator('td:last-child button:nth-child(3)')
      : page.locator('table tbody tr').first().locator('td:last-child button:nth-child(3)');
    await expect(searchBtnAvg1).toBeVisible({ timeout: 10000 });
    await searchBtnAvg1.click({ force: true });
    await page.waitForURL('**/properties**', { timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 30000 });
    } catch { /* no spinner */ }
    await wait(3000);
    console.log('  ✓ Properties page loaded');

    // ── STEP 4: Open average opinion URL and scroll the page ─────────────────
    console.log('\n── STEP 4: Open average opinion URL ─────────────────');
    const encodedAddress = encodeURIComponent(propertyAddress).replace(/%20/g, '+');
    const avgUrl = `${propertyUrl}?name=${encodedAddress}&type=average&opinionId=${avgOpinionId}`;
    console.log(`  Average URL: ${avgUrl}`);
    await page.goto(avgUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
        .first().waitFor({ state: 'hidden', timeout: 20000 });
    } catch { /* no spinner */ }
    await wait(3000);
    await scrollPropertyPage(page);
    await page.screenshot({ path: 'screenshots/avg001-average-url-opened.png' });
    console.log('  ✓ Average opinion URL opened and page scrolled');

    // ── STEP 5: Assert each factor = (admin + afm + sa) / 3 ──────────────────
    console.log('\n── STEP 5: Assert all factor field values ───────────────────────────────');
    console.log('─────────────────────────────────────────────────────────────────────────────────');
    console.log('  AVG-001: AVERAGE OPINION ASSERTION (Admin view in average URL)');
    console.log('  Formula: (updated admin value + updated AFM value + updated SA value) / 3');
    console.log(`  ${'Factor'.padEnd(12)} | ${'Admin'.padEnd(8)} | ${'AFM'.padEnd(8)} | ${'SA'.padEnd(8)} | ${'Expected Avg'.padEnd(13)} | ${'Page Value'.padEnd(11)} | Result`);
    console.log(`  ${'-'.repeat(90)}`);

    let allPassAvg = true;

    for (const name of FACTOR_NAMES) {
      const adminVal = savedAdminResult[ADMIN_LABEL[name]] ?? null;
      const afmVal   = savedAfmResult[AFM_LABEL[name]]    ?? null;
      const saVal    = savedSaResult[SA_LABEL[name]]      ?? null;

      if (adminVal === null || afmVal === null || saVal === null) {
        console.log(`  ${name.padEnd(12)} | ${'N/A'.padEnd(8)} | ${'N/A'.padEnd(8)} | ${'N/A'.padEnd(8)} | ${'N/A'.padEnd(13)} | ${'N/A'.padEnd(11)} | ⚠ SKIP (missing saved values)`);
        console.log(`    → admin: ${adminVal}, afm: ${afmVal}, sa: ${saVal}`);
        allPassAvg = false;
        expect.soft(false, `[${name}] missing saved values — admin:${adminVal} afm:${afmVal} sa:${saVal}`).toBe(true);
        continue;
      }

      const expectedAvg = parseFloat(((adminVal + afmVal + saVal) / 3).toFixed(2));
      const calcStr     = `(${adminVal} + ${afmVal} + ${saVal}) / 3 = ${expectedAvg}`;

      const input = page.locator(`input[placeholder*="${name}" i]`).first();
      await input.scrollIntoViewIfNeeded().catch(() => {});
      await wait(300);

      const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.log(`  ${name.padEnd(12)} | ${String(adminVal).padEnd(8)} | ${String(afmVal).padEnd(8)} | ${String(saVal).padEnd(8)} | ${String(expectedAvg).padEnd(13)} | ${'not visible'.padEnd(11)} | ✗ FAIL`);
        console.log(`    → FAIL: input field not visible on page`);
        allPassAvg = false;
        expect.soft(false, `[${name}] input not visible on average page`).toBe(true);
        continue;
      }

      const pageValue = await input.inputValue().catch(() => null);
      const pageNum   = pageValue !== null ? parseFloat(pageValue) : NaN;
      const pass      = !isNaN(pageNum) && Math.abs(pageNum - expectedAvg) < 0.01;

      if (pass) {
        console.log(`  ${name.padEnd(12)} | ${String(adminVal).padEnd(8)} | ${String(afmVal).padEnd(8)} | ${String(saVal).padEnd(8)} | ${String(expectedAvg).padEnd(13)} | ${String(pageNum).padEnd(11)} | ✓ PASS`);
        console.log(`    → Calculation: ${calcStr} — page shows ${pageNum} ✓`);
      } else {
        console.log(`  ${name.padEnd(12)} | ${String(adminVal).padEnd(8)} | ${String(afmVal).padEnd(8)} | ${String(saVal).padEnd(8)} | ${String(expectedAvg).padEnd(13)} | ${String(isNaN(pageNum) ? '(empty)' : pageNum).padEnd(11)} | ✗ FAIL`);
        console.log(`    → FAIL: expected ${expectedAvg} (${calcStr}), but page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`);
        allPassAvg = false;
      }

      expect.soft(pass,
        `[${name}]: expected avg ${expectedAvg} (${calcStr}), but page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`
      ).toBe(true);
    }

    console.log(`  ${'-'.repeat(90)}`);
    console.log(`  Overall Result: ${allPassAvg ? '✓ ALL FACTORS MATCH AVERAGE FORMULA' : '✗ SOME FACTORS DO NOT MATCH AVERAGE FORMULA'}`);
    console.log('─────────────────────────────────────────────────────────────────────────────────\n');
    await page.screenshot({ path: 'screenshots/avg001-factor-assertions.png' });

    // ── STEP 6: Sign Out ──────────────────────────────────────────────────────
    console.log('\n── STEP 6: Sign Out ─────────────────────────────────');
    const profileIconAvg1 = getNavLocator(page, 'userProfileDropdown');
    await expect(profileIconAvg1).toBeVisible({ timeout: 10000 });
    await profileIconAvg1.click({ force: true });
    await wait(1500);
    await page.screenshot({ path: 'screenshots/avg001-profile-menu.png' });

    const signOutBtnAvg1 = page.locator(
      'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
      '.v-list-item:has-text("Sign Out"), [role="menuitem"]:has-text("Sign Out")'
    ).first();
    const signOutVisibleAvg1 = await signOutBtnAvg1.isVisible({ timeout: 5000 }).catch(() => false);
    if (!signOutVisibleAvg1) {
      const logoutBtnAvg1 = page.locator(
        'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
      ).first();
      if (await logoutBtnAvg1.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtnAvg1.click({ force: true });
      } else {
        console.log('  ⚠  Sign Out button not found');
        await page.screenshot({ path: 'screenshots/avg001-signout-not-found.png' });
      }
    } else {
      await signOutBtnAvg1.click({ force: true });
    }
    await page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
    await wait(1000);
    console.log(`  ✓ Signed out — current URL: ${page.url()}`);

    // ── Hard assertion: all factors must match ────────────────────────────────
    expect(allPassAvg,
      'One or more average factor values did not match (admin + afm + sa) / 3'
    ).toBe(true);

    console.log('\n  ✓ AVG-001 COMPLETE');
  });

});