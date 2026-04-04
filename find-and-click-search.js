/**
 * find-and-click-search.js
 *
 * 1. Login → Settings > Y-Total
 * 2. Pause on the Y-Total table and dynamically find the search button on the first row
 * 3. Print the discovered locator details
 * 4. If search button found → click it → wait for Properties page + map to load
 *
 * Run: node find-and-click-search.js
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL    = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Known SVG path fragments for each button type in the action cell
const SVG_SIGNATURES = {
  edit:   'm16.862 4.487',           // pencil
  view:   'M1.696 10.269',           // eye
  search: 'M9 3.5a5.5 5.5 0 1 0',   // magnifying glass
  delete: 'm14.74 9',                // trash
};

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // ── Step 1: Login ─────────────────────────────────────────────────────────
  console.log('\n[1] Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/affiliate-managers', { timeout: 20000 });
  console.log('    ✔ Logged in');

  // ── Step 2: Navigate to Settings > Y-Total ────────────────────────────────
  console.log('\n[2] Navigating to Settings > Y-Total...');
  await page.evaluate(() => {
    document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove());
  });
  await page.getByText('Settings').first().click({ force: true });
  await page.waitForURL('**/settings**', { timeout: 15000 });
  await wait(1500);
  await page.getByText('Y-Total').first().click({ force: true });
  await wait(2000);

  // Wait for the table to be visible
  await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
  console.log('    ✔ Y-Total table visible');

  // ── Step 3: Find search button dynamically on first row ───────────────────
  console.log('\n[3] Scanning first row action buttons for search icon...');

  const buttonInfo = await page.evaluate((signatures) => {
    const rows = document.querySelectorAll('table tbody tr');
    if (!rows.length) return { error: 'No table rows found' };

    const firstRow = rows[0];
    const cells    = firstRow.querySelectorAll('td');
    if (!cells.length) return { error: 'No cells in first row' };

    const actionCell = cells[cells.length - 1];
    const buttons    = actionCell.querySelectorAll('button');

    const found = [];
    buttons.forEach((btn, idx) => {
      const svgPaths = [...btn.querySelectorAll('path')]
        .map(p => p.getAttribute('d') || '')
        .join('|');

      let type = 'unknown';
      for (const [name, sig] of Object.entries(signatures)) {
        if (svgPaths.includes(sig)) { type = name; break; }
      }

      const rect = btn.getBoundingClientRect();
      found.push({
        index:   idx,
        type,
        classes: btn.className,
        rect:    { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        svgSnippet: svgPaths.slice(0, 80),
      });
    });

    return { buttons: found, totalRows: rows.length };
  }, SVG_SIGNATURES);

  if (buttonInfo.error) {
    console.error('    ✘ Error:', buttonInfo.error);
    await browser.close();
    return;
  }

  console.log(`\n    Rows in table: ${buttonInfo.totalRows}`);
  console.log('    First row action buttons:');
  buttonInfo.buttons.forEach(b => {
    const marker = b.type === 'search' ? '  ← SEARCH BUTTON ✔' : '';
    console.log(`    [btn ${b.index}] type=${b.type}  rect=(${b.rect.x},${b.rect.y}) size=${b.rect.w}x${b.rect.h}${marker}`);
  });

  const searchBtn = buttonInfo.buttons.find(b => b.type === 'search');

  if (!searchBtn) {
    console.error('\n    ✘ Search button NOT found. Dumping all SVG snippets:');
    buttonInfo.buttons.forEach(b => console.log(`    [btn ${b.index}]`, b.svgSnippet));
    await browser.close();
    return;
  }

  // ── Step 4: Build a reliable locator and click the search button ──────────
  // Locate by SVG path fragment — most stable, doesn't rely on DOM index.
  const searchBtnLocator = page.locator(
    `table tbody tr:first-child td:last-child button:nth-child(${searchBtn.index + 1})`
  );

  console.log(`\n[4] Search button found at index ${searchBtn.index}`);
  console.log(`    Locator: table tbody tr:first-child td:last-child button:nth-child(${searchBtn.index + 1})`);
  console.log('    Clicking search button...\n');

  await searchBtnLocator.waitFor({ state: 'visible', timeout: 10000 });
  await searchBtnLocator.click({ force: true });

  // ── Step 5: Wait for Properties page + map to fully load ──────────────────
  console.log('[5] Waiting for Properties page navigation...');
  await page.waitForURL('**/properties**', { timeout: 30000 });
  console.log('    ✔ Navigated to Properties page:', page.url());

  console.log('[5] Waiting for map/plot to finish loading...');
  try {
    await page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
      .first()
      .waitFor({ state: 'hidden', timeout: 60000 });
  } catch { /* spinner may not appear if data loads fast */ }

  await wait(3000); // Allow map tiles to render

  const mapVisible = await page.locator('.leaflet-container, #map, [class*="map"]').first().isVisible();
  if (mapVisible) {
    console.log('    ✔ Map/plot is fully loaded and visible!');
  } else {
    console.log('    ⚠ Map container not detected — checking page for any canvas/svg...');
    const hasAnyMap = await page.locator('canvas, svg.leaflet-zoom-animated').first().isVisible();
    console.log('    Map alternative visible:', hasAnyMap);
  }

  console.log('\n✅ All steps completed successfully.');
  console.log('   (Browser stays open — close manually to exit)');

  // Keep browser open so user can inspect
  await page.waitForTimeout(30000);
  await browser.close();
})();
