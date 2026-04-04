/**
 * extract-ytotal-row-buttons.js
 * Finds the Y-Total table row action buttons and captures their
 * aria-labels, titles, tooltip text, classes, and SVG path data.
 * Run: node extract-ytotal-row-buttons.js
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL    = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page    = await browser.newPage();

  // ── Login ──
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/affiliate-managers', { timeout: 20000 });

  // ── Navigate to Settings > Y-Total ──
  await page.getByText('Settings').first().click({ force: true });
  await page.waitForURL('**/settings**', { timeout: 15000 });
  await wait(1500);
  await page.getByText('Y-Total').first().click({ force: true });
  await wait(2000);

  // ── Extract all buttons in every table row's action cell ──
  const rowButtons = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const result = [];

    rows.forEach((row, rowIdx) => {
      // Last cell = action cell
      const cells = row.querySelectorAll('td');
      if (!cells.length) return;
      const actionCell = cells[cells.length - 1];
      const buttons    = actionCell.querySelectorAll('button');

      buttons.forEach((btn, btnIdx) => {
        // Collect tooltip: check title, aria-label, data-tooltip, or nearby tooltip element
        const svgPaths = [...btn.querySelectorAll('path')].map(p => p.getAttribute('d') || '').join('|');

        result.push({
          rowIdx,
          btnIdx,
          ariaLabel: btn.getAttribute('aria-label') || '',
          title:     btn.getAttribute('title') || '',
          tooltip:   btn.getAttribute('data-tooltip') || '',
          classes:   btn.className,
          iconClasses: [...btn.querySelectorAll('i')].map(i => i.className).join(' | '),
          svgViewBox: btn.querySelector('svg')?.getAttribute('viewBox') || '',
          svgPaths: svgPaths.slice(0, 200),
        });
      });
    });

    return result;
  });

  // ── Also check for tooltip elements after hovering btn 0 of row 0 ──
  const allBtns = page.locator('table tbody tr:first-child td:last-child button');
  const btnCount = await allBtns.count();
  const tooltips = [];

  for (let i = 0; i < btnCount; i++) {
    await allBtns.nth(i).hover();
    await wait(800);
    const tooltip = await page.locator('[role="tooltip"], .v-tooltip__content, .tippy-box, [data-tippy-content]').allInnerTexts();
    tooltips.push({ btnIdx: i, tooltip: tooltip.join(' | ') });
  }

  console.log('\n=== Row Action Buttons ===\n');
  console.log(JSON.stringify(rowButtons.slice(0, 8), null, 2));

  console.log('\n=== Button Tooltips (row 0) ===\n');
  console.log(JSON.stringify(tooltips, null, 2));

  await browser.close();
})();
