/**
 * extract-yformula-market-features.js
 *
 * Specifically captures:
 *  1. All field locators on the Market Features tab of the Y Formula dialog
 *  2. The scroll container structure (class, overflow style, scrollHeight vs clientHeight)
 *  3. Bounding rect of the Next/Add buttons vs viewport height
 *  4. All feature-type row locators
 *
 * Uses specific values (Northstar MLS / Minnesota / Washington) that are known to work.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL    = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

// Values confirmed to work from previous test runs
const MLS_BOARD  = 'Northstar MLS';
const STATE      = 'Minnesota';
const COUNTY     = 'Washington';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function fillDropdown(page, placeholder, value) {
  const input = page.locator(`.v-dialog input[placeholder="${placeholder}"]`).first();
  await input.click({ force: true });
  await wait(1000);
  await input.fill(value);
  await wait(2000);
  const option = page
    .locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item')
    .filter({ hasText: value })
    .first();
  if (await option.count() > 0) {
    await option.click({ force: true });
    await wait(800);
  }
}

async function run() {
  fs.mkdirSync('screenshots', { recursive: true });
  fs.mkdirSync('output', { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  // Use larger viewport so dialog footer may be visible
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // ── 1. LOGIN ───────────────────────────────────────────────────────────────
    console.log('\n1. Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/affiliate-managers', { timeout: 20000 });
    console.log('   ✓ Logged in');

    // ── 2. SETTINGS → Y-TOTAL ─────────────────────────────────────────────────
    console.log('\n2. Settings → Y-Total...');
    await page.evaluate(() =>
      document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove())
    );
    await page.locator('nav .v-list-item, nav a').filter({ hasText: 'Settings' }).first().click({ force: true });
    await page.waitForURL('**/settings**', { timeout: 15000 });
    await wait(2000);
    await page.getByText('Y-Total', { exact: true }).first().click({ force: true });
    await wait(2000);
    console.log('   ✓ On Y-Total tab');

    // ── 3. OPEN ADD NEW FORMULA DIALOG ────────────────────────────────────────
    console.log('\n3. Open Add New Formula dialog...');
    await page.getByRole('button', { name: /Add New Formula/i }).first().click({ force: true });
    await wait(2000);
    await page.screenshot({ path: 'screenshots/yf-mf-01-dialog-open.png' });
    console.log('   ✓ Dialog open — screenshot saved');

    // ── 4. FILL MARKET CONFIGURATION FIELDS ───────────────────────────────────
    console.log('\n4. Fill Market Configuration...');
    await fillDropdown(page, 'Select MLS Board', MLS_BOARD);
    console.log(`   ✓ MLS Board: ${MLS_BOARD}`);
    await wait(1500);
    await fillDropdown(page, 'Select State', STATE);
    console.log(`   ✓ State: ${STATE}`);
    await wait(1500);
    await fillDropdown(page, 'Select County', COUNTY);
    console.log(`   ✓ County: ${COUNTY}`);
    await wait(1000);

    const baseInput = page.locator('.v-dialog input[placeholder="Enter base value"]').first();
    await baseInput.fill('100');
    await baseInput.press('Tab');
    await wait(500);
    console.log('   ✓ Base Value: 100');

    // ── 5. CLICK NEXT → MARKET FEATURES TAB ──────────────────────────────────
    console.log('\n5. Click Next → Market Features...');
    const nextBtn = page.locator('.v-dialog button:has-text("Next")').first();
    console.log(`   Next button enabled: ${await nextBtn.isEnabled()}`);
    await nextBtn.click();
    await wait(3000);

    // Check if dialog is still open
    const dialogOpen = await page.locator('.v-dialog').count() > 0;
    console.log(`   Dialog still open after Next: ${dialogOpen}`);
    await page.screenshot({ path: 'screenshots/yf-mf-02-after-next.png' });

    if (!dialogOpen) {
      console.log('   ⚠ Dialog closed. Trying to reopen via edit button...');
      // Try to find and click edit on first row
      const editBtn = page.locator('button:has(i.mdi-pencil), button:has(.mdi-pencil)').first();
      if (await editBtn.count() > 0) {
        await editBtn.click({ force: true });
        await wait(2000);
      }
    }

    // ── 6. CAPTURE SCROLL CONTAINER STRUCTURE ─────────────────────────────────
    console.log('\n6. Capturing scroll container structure...');
    const scrollInfo = await page.evaluate(() => {
      const results = [];

      // Walk up from the Next button to find all ancestors with scroll capability
      const buttons = [...document.querySelectorAll('.v-dialog button')];
      const nextButton = buttons.find(b => b.textContent.trim() === 'Next');

      if (!nextButton) {
        return { error: 'Next button not found in dialog', results };
      }

      const btnRect = nextButton.getBoundingClientRect();
      const viewportH = window.innerHeight;

      const info = {
        nextButtonRect: {
          top: Math.round(btnRect.top),
          bottom: Math.round(btnRect.bottom),
          left: Math.round(btnRect.left),
          right: Math.round(btnRect.right),
          isVisible: btnRect.top >= 0 && btnRect.bottom <= viewportH,
        },
        viewportHeight: viewportH,
        scrollableAncestors: [],
      };

      // Walk up the ancestor chain looking for scrollable containers
      let el = nextButton.parentElement;
      let depth = 0;
      while (el && depth < 20) {
        const style = window.getComputedStyle(el);
        const overflow = style.overflow + ' / ' + style.overflowY + ' / ' + style.overflowX;
        const isScrollable = ['auto', 'scroll', 'overlay'].some(v =>
          style.overflowY === v || style.overflow === v
        );

        info.scrollableAncestors.push({
          depth,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          classes: el.className.substring(0, 100),
          overflow,
          isScrollable,
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          canScroll: el.scrollHeight > el.clientHeight,
          rect: {
            top: Math.round(el.getBoundingClientRect().top),
            bottom: Math.round(el.getBoundingClientRect().bottom),
            height: Math.round(el.getBoundingClientRect().height),
          },
        });

        el = el.parentElement;
        depth++;
      }

      return info;
    });

    console.log('\n   === SCROLL CONTAINER ANALYSIS ===');
    console.log(`   Next button rect:`, JSON.stringify(scrollInfo.nextButtonRect));
    console.log(`   Viewport height: ${scrollInfo.viewportHeight}`);
    console.log('\n   Scrollable ancestors:');
    (scrollInfo.scrollableAncestors || []).forEach(a => {
      if (a.canScroll || a.isScrollable) {
        console.log(`   [depth ${a.depth}] <${a.tag}> class="${a.classes.substring(0, 60)}"`);
        console.log(`           overflow: ${a.overflow}`);
        console.log(`           scrollTop/Height/ClientH: ${a.scrollTop} / ${a.scrollHeight} / ${a.clientHeight}`);
        console.log(`           rect: ${JSON.stringify(a.rect)}`);
      }
    });

    fs.writeFileSync('output/yformula-scroll-info.json', JSON.stringify(scrollInfo, null, 2));
    console.log('\n   ✓ Saved to output/yformula-scroll-info.json');

    // ── 7. CAPTURE ALL MARKET FEATURES FIELDS ────────────────────────────────
    console.log('\n7. Capturing Market Features tab fields...');
    const marketFeaturesFields = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return { error: 'no dialog' };

      // Find all feature-type rows (label + v-select pairs)
      const labels = [...dialog.querySelectorAll('label')].map(l => ({
        text: l.textContent.trim(),
        forAttr: l.getAttribute('for'),
        classes: l.className,
      }));

      // Find all inputs in the dialog
      const inputs = [...dialog.querySelectorAll('input')].map(inp => ({
        placeholder: inp.getAttribute('placeholder'),
        id: inp.id,
        disabled: inp.disabled,
        type: inp.type,
        ariaLabel: inp.getAttribute('aria-label'),
      }));

      // Find all buttons
      const buttons = [...dialog.querySelectorAll('button')].map(btn => {
        const rect = btn.getBoundingClientRect();
        return {
          text: btn.textContent.trim(),
          disabled: btn.disabled,
          classes: btn.className.substring(0, 80),
          rect: {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            isVisible: rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0,
          },
        };
      });

      // Find v-select elements (feature type dropdowns)
      const vSelects = [...dialog.querySelectorAll('.v-select, .v-autocomplete')].map((sel, i) => {
        const label = sel.querySelector('label, input')?.getAttribute('placeholder') ||
                      sel.querySelector('input')?.getAttribute('placeholder') || `v-select-${i}`;
        const input = sel.querySelector('input');
        const rect = sel.getBoundingClientRect();
        return {
          index: i,
          placeholder: input?.getAttribute('placeholder'),
          id: input?.id,
          disabled: input?.disabled,
          rect: {
            top: Math.round(rect.top),
            height: Math.round(rect.height),
            isVisible: rect.top >= 0 && rect.bottom <= window.innerHeight,
          },
        };
      });

      // Find all v-field wrappers — these are the outer containers of inputs
      const vFields = [...dialog.querySelectorAll('.v-field')].map((f, i) => {
        const inp = f.querySelector('input');
        const rect = f.getBoundingClientRect();
        return {
          index: i,
          placeholder: inp?.getAttribute('placeholder'),
          classes: f.className.substring(0, 80),
          rect: {
            top: Math.round(rect.top),
            height: Math.round(rect.height),
          },
        };
      });

      return { labels, inputs, buttons, vSelects, vFields };
    });

    fs.writeFileSync('output/yformula-market-features-fields.json', JSON.stringify(marketFeaturesFields, null, 2));
    console.log(`   ✓ Labels: ${marketFeaturesFields.labels?.length}`);
    console.log(`   ✓ Inputs: ${marketFeaturesFields.inputs?.length}`);
    console.log(`   ✓ Buttons: ${marketFeaturesFields.buttons?.length}`);
    console.log('   Buttons:');
    (marketFeaturesFields.buttons || []).forEach(b => {
      if (b.text) console.log(`     "${b.text}" visible=${b.rect.isVisible} top=${b.rect.top}`);
    });
    console.log('   v-selects in dialog:');
    (marketFeaturesFields.vSelects || []).forEach(s => {
      console.log(`     [${s.index}] "${s.placeholder}" visible=${s.rect.isVisible} top=${s.rect.top}`);
    });

    await page.screenshot({ path: 'screenshots/yf-mf-03-market-features.png' });
    console.log('\n   ✓ Screenshot: yf-mf-03-market-features.png');

    console.log('\n✅ Extraction complete!');
    console.log('   Check output/yformula-scroll-info.json for scroll container details');
    console.log('   Check output/yformula-market-features-fields.json for all field locators');

  } catch (err) {
    console.error('\n✗ Error:', err.message);
    await page.screenshot({ path: 'screenshots/yf-mf-error.png' });
  } finally {
    await wait(3000);
    await browser.close();
  }
}

run();
