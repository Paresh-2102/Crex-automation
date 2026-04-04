/**
 * extract-yformula-wizard-steps.js
 *
 * Full step-by-step probe of the Y Formula wizard:
 *   Step 1 → Market Config: fill MLS/State/County/Base Value → find Next button coords
 *   Step 2 → Market Features: list all feature-type rows + scroll to Next → find coords
 *   Step 3 → Y Factor: list all factor fields + find Add button coords
 *
 * Outputs:
 *   output/wizard-step1-next-btn.json   — Next button position after Market Config
 *   output/wizard-step2-fields.json     — All Market Features field locators
 *   output/wizard-step2-next-btn.json   — Next button position after scroll on Market Features
 *   output/wizard-step3-fields.json     — All Y Factor field locators
 *   output/wizard-step3-add-btn.json    — Add button position on Y Factor tab
 *   screenshots/wizard-step*.png        — Screenshot at every stage
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL    = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const MLS_BOARD = 'Northstar MLS';
const STATE     = 'Minnesota';
const COUNTY    = 'Washington';

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── helpers ───────────────────────────────────────────────────────────────────

async function snap(page, name) {
  const p = `screenshots/wizard-${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${p}`);
}

/** Fill a Vuetify autocomplete inside the dialog, try fill then pressSequentially */
async function fillDropdown(page, placeholder, value) {
  const input = page.locator(`.v-dialog input[placeholder="${placeholder}"]`).first();
  await input.click({ force: true });
  await wait(800);
  await input.fill(value);
  await wait(2000);

  const option = page
    .locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item')
    .filter({ hasText: value })
    .first();

  if (await option.count() > 0) {
    await option.click({ force: true });
    await wait(600);
  } else {
    // fallback: clear and type slowly
    await input.clear();
    await wait(400);
    await input.pressSequentially(value, { delay: 80 });
    await wait(2500);
    const opt2 = page
      .locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item')
      .filter({ hasText: value })
      .first();
    if (await opt2.count() > 0) {
      await opt2.click({ force: true });
      await wait(600);
    }
  }

  // Close any lingering dropdown overlay using Tab (safe — never closes the dialog)
  const overlayStillOpen = await page.locator('.v-overlay--active .v-list-item').count();
  if (overlayStillOpen > 0) {
    await page.keyboard.press('Tab');
    await wait(400);
  }
}

/**
 * Scroll every overflow container inside .v-dialog to the bottom
 * so the sticky footer (Next / Add button) becomes visible.
 * Returns the bounding rect of the button after scroll.
 * NOTE: finds the VISIBLE (non-hidden) button matching buttonText,
 *       because the wizard keeps previous-step buttons in DOM (display:none, getBCR → 0,0).
 */
async function scrollDialogToBottomAndGetButton(page, buttonText) {
  // Scroll all possible containers
  await page.evaluate(() => {
    [
      '.v-overlay__content',
      '.v-dialog',
      '.v-dialog > div',
      '.v-dialog .v-card',
      '.v-dialog .v-card-text',
      '.v-dialog .v-sheet',
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  });
  await wait(700);

  const pos = await page.evaluate((btnText) => {
    // Filter to the VISIBLE button: previous-step buttons have getBCR width=0
    const allBtns = [...document.querySelectorAll('.v-dialog button')]
      .filter(b => b.textContent.trim() === btnText);
    const btn = allBtns.find(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) || allBtns[allBtns.length - 1]; // fallback to last
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      visible: r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0,
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      classes: btn.className,
    };
  }, buttonText);

  return pos;
}

/** Capture key info from dialog: all inputs, buttons with positions */
async function captureDialogState(page, label) {
  const state = await page.evaluate(() => {
    const dialog = document.querySelector('.v-dialog');
    if (!dialog) return { error: 'no dialog' };

    const inputs = [...dialog.querySelectorAll('input')].map(el => {
      const r = el.getBoundingClientRect();
      return {
        placeholder: el.getAttribute('placeholder'),
        id: el.id || null,
        disabled: el.disabled,
        type: el.type,
        visible: r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0,
        top: Math.round(r.top),
      };
    });

    const buttons = [...dialog.querySelectorAll('button')].map(el => {
      const r = el.getBoundingClientRect();
      return {
        text: el.textContent.trim(),
        disabled: el.disabled,
        visible: r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        x: Math.round(r.left + r.width / 2),
        y: Math.round(r.top + r.height / 2),
        classes: el.className.substring(0, 80),
      };
    });

    const labels = [...dialog.querySelectorAll('label')].map(el => ({
      text: el.textContent.trim(),
      forAttr: el.getAttribute('for'),
    }));

    // v-select rows (feature type / y-factor dropdowns)
    const selects = [...dialog.querySelectorAll('.v-select, .v-autocomplete')].map((el, i) => {
      const inp = el.querySelector('input');
      const r = el.getBoundingClientRect();
      return {
        index: i,
        placeholder: inp ? inp.getAttribute('placeholder') : null,
        id: inp ? inp.id : null,
        disabled: inp ? inp.disabled : false,
        visible: r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0,
        top: Math.round(r.top),
      };
    });

    // active tab heading
    const activeTab = dialog.querySelector('h6.text-brand-700');
    const tabName = activeTab ? activeTab.textContent.trim() : null;

    return { tabName, inputs, buttons, labels, selects };
  });

  console.log(`\n  ── Dialog state [${label}] ──`);
  console.log(`  Active tab: ${state.tabName}`);
  console.log(`  Buttons:`);
  (state.buttons || []).forEach(b => {
    if (b.text) console.log(`    "${b.text}"  visible=${b.visible}  pos=(${b.x},${b.y})  disabled=${b.disabled}`);
  });
  console.log(`  Inputs (placeholder / visible / top):`);
  (state.inputs || []).filter(i => i.placeholder).forEach(i => {
    console.log(`    "${i.placeholder}"  visible=${i.visible}  top=${i.top}  disabled=${i.disabled}`);
  });
  console.log(`  Selects count: ${state.selects?.length}`);
  (state.selects || []).filter(s => s.placeholder).forEach(s => {
    console.log(`    [${s.index}] "${s.placeholder}"  visible=${s.visible}  top=${s.top}`);
  });

  return state;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
  fs.mkdirSync('screenshots', { recursive: true });
  fs.mkdirSync('output', { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page    = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // ─ 1. Login ─────────────────────────────────────────────────────────────
    console.log('\n1. Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/affiliate-managers', { timeout: 20000 });
    console.log('  ✓ Logged in');

    // ─ 2. Settings → Y-Total ────────────────────────────────────────────────
    console.log('\n2. Settings → Y-Total...');
    await page.evaluate(() =>
      document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove())
    );
    await page.locator('nav .v-list-item, nav a').filter({ hasText: 'Settings' }).first().click({ force: true });
    await page.waitForURL('**/settings**', { timeout: 15000 });
    await wait(2000);
    await page.getByText('Y-Total', { exact: true }).first().click({ force: true });
    await wait(2000);

    // ─ 3. Open dialog ───────────────────────────────────────────────────────
    console.log('\n3. Open Add New Formula dialog...');
    await page.getByRole('button', { name: /Add New Formula/i }).first().click({ force: true });
    await wait(2500);
    await snap(page, 'step1-dialog-open');

    // ─ 4. Fill Market Config ────────────────────────────────────────────────
    console.log('\n4. Fill Market Config...');
    await fillDropdown(page, 'Select MLS Board', MLS_BOARD);
    console.log('  ✓ MLS Board');
    await wait(1500);
    await fillDropdown(page, 'Select State', STATE);
    console.log('  ✓ State');
    await wait(1500);
    await fillDropdown(page, 'Select County', COUNTY);
    console.log('  ✓ County');
    await wait(1000);

    const baseInput = page.locator('.v-dialog input[placeholder="Enter base value"]').first();
    await baseInput.click();
    await wait(300);
    await baseInput.fill('100');
    await baseInput.press('Tab');
    await wait(600);
    console.log('  ✓ Base Value: 100');

    // ─ 5. Capture Next button position before clicking ───────────────────────
    console.log('\n5. Checking Next button state on Market Config tab...');
    const step1State = await captureDialogState(page, 'MarketConfig-before-Next');
    fs.writeFileSync('output/wizard-step1-state.json', JSON.stringify(step1State, null, 2));

    const step1NextBtn = step1State.buttons?.find(b => b.text === 'Next');
    console.log(`  Next button: visible=${step1NextBtn?.visible}  pos=(${step1NextBtn?.x},${step1NextBtn?.y})  disabled=${step1NextBtn?.disabled}`);
    fs.writeFileSync('output/wizard-step1-next-btn.json', JSON.stringify(step1NextBtn, null, 2));

    await snap(page, 'step1-filled');

    // ─ 6. Click Next (Market Config → Market Features) ───────────────────────
    console.log('\n6. Clicking Next (Market Config → Market Features)...');
    if (step1NextBtn?.visible && !step1NextBtn?.disabled) {
      await page.mouse.click(step1NextBtn.x, step1NextBtn.y);
    } else {
      // Fallback: re-query and try Playwright click
      const nextBtn = page.locator('.v-dialog button:has-text("Next")').first();
      await nextBtn.click();
    }
    await wait(3000);

    const dialogCount = await page.locator('.v-dialog').count();
    console.log(`  Dialog still open: ${dialogCount > 0}`);
    await snap(page, 'step2-after-first-next');

    // ─ 7. Check what happened after Next ────────────────────────────────────
    if (dialogCount === 0) {
      console.log('\n  ⚠ Dialog closed after Next — record was saved. Opening edit...');
      const editBtn = page.locator('tr:first-child button').first();
      if (await editBtn.count() > 0) {
        await editBtn.click({ force: true });
        await wait(2000);
      }
    }

    // ─ 7b. Wait for Market Features loading spinner to disappear ─────────────
    console.log('\n7b. Waiting for Market Features to finish loading...');
    try {
      await page.getByText('Loading property attributes...').waitFor({ state: 'hidden', timeout: 30000 });
      console.log('  ✓ Loading completed');
    } catch {
      console.log('  ⚠ Loading wait timed out — either already gone or never appeared');
    }
    await wait(1500);
    await snap(page, 'step2-after-loading');

    // ─ 8. Market Features tab — before scroll ────────────────────────────────
    console.log('\n7. Market Features tab — capturing state BEFORE scroll...');
    const step2StateBefore = await captureDialogState(page, 'MarketFeatures-before-scroll');
    fs.writeFileSync('output/wizard-step2-before-scroll.json', JSON.stringify(step2StateBefore, null, 2));
    await snap(page, 'step2-before-scroll');

    // ─ 9. Scroll all overflow containers to bottom ────────────────────────────
    console.log('\n8. Scrolling dialog to reveal footer...');
    const step2NextPos = await scrollDialogToBottomAndGetButton(page, 'Next');
    console.log(`  Next button after scroll: ${JSON.stringify(step2NextPos)}`);
    fs.writeFileSync('output/wizard-step2-next-btn.json', JSON.stringify(step2NextPos, null, 2));

    const step2StateAfter = await captureDialogState(page, 'MarketFeatures-after-scroll');
    fs.writeFileSync('output/wizard-step2-after-scroll.json', JSON.stringify(step2StateAfter, null, 2));
    await snap(page, 'step2-after-scroll');

    // List all Market Features field selects
    const marketFeatureSelects = (step2StateAfter.selects || [])
      .filter(s => s.placeholder === 'Select the features (optional)');
    console.log(`\n  Market Feature dropdowns found: ${marketFeatureSelects.length}`);
    // Dump ALL selects and labels for inspection
    console.log('  ALL selects in dialog:');
    (step2StateAfter.selects || []).forEach(s => {
      console.log(`    [${s.index}] placeholder="${s.placeholder}" visible=${s.visible} top=${s.top} disabled=${s.disabled}`);
    });
    console.log('  ALL labels in dialog:');
    (step2StateAfter.labels || []).slice(0, 30).forEach(l => {
      console.log(`    label: "${l.text}" for="${l.forAttr}"`);
    });
    fs.writeFileSync('output/wizard-step2-fields.json', JSON.stringify(step2StateAfter, null, 2));

    // ─ 10. Wait for Next to become enabled, then click ────────────────────────
    console.log('\n9. Waiting for Market Features Next button to become enabled...');
    if (step2NextPos?.disabled) {
      // Wait for the visible Next button to become enabled
      try {
        await page.locator('.v-dialog button:has-text("Next")').last()
          .waitFor({ state: 'visible', timeout: 5000 });
        // Wait for enabled state via polling
        for (let i = 0; i < 20; i++) {
          const isDisabled = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('.v-dialog button')]
              .filter(b => b.textContent.trim() === 'Next');
            const btn = btns.find(b => b.getBoundingClientRect().width > 0) || btns[btns.length - 1];
            return btn ? btn.disabled : true;
          });
          if (!isDisabled) { console.log('  ✓ Next button is now enabled'); break; }
          await wait(500);
          if (i === 19) console.log('  ⚠ Next button still disabled after wait');
        }
      } catch {
        console.log('  ⚠ Could not verify Next enabled state');
      }
      // Re-check position after loading
      const freshPos = await scrollDialogToBottomAndGetButton(page, 'Next');
      if (freshPos && freshPos.x > 0) {
        Object.assign(step2NextPos, freshPos);
        console.log(`  Fresh Next button pos: (${freshPos.x}, ${freshPos.y}) disabled=${freshPos.disabled}`);
      }
    }

    console.log('\n9b. Clicking Next (Market Features → Y Factor)...');
    if (step2NextPos && step2NextPos.x > 0) {
      console.log(`  Using mouse.click at (${step2NextPos.x}, ${step2NextPos.y})`);
      await page.mouse.click(step2NextPos.x, step2NextPos.y);
    } else {
      console.log('  ⚠ Next button coords still 0,0 — trying Playwright click on last Next button');
      const lastNext = page.locator('.v-dialog button:has-text("Next")').last();
      await lastNext.click({ force: true });
    }
    await wait(3000);
    await snap(page, 'step3-after-second-next');

    // ─ 11. Y Factor tab — capture all fields and Add button ──────────────────
    console.log('\n10. Y Factor tab — capturing fields and Add button...');
    const step3State = await captureDialogState(page, 'YFactor');
    fs.writeFileSync('output/wizard-step3-fields.json', JSON.stringify(step3State, null, 2));
    await snap(page, 'step3-yfactor');

    const addBtn = step3State.buttons?.find(b => b.text === 'Add' || b.text.toLowerCase().includes('add'));
    const saveBtn = step3State.buttons?.find(b => ['Save', 'Create', 'Submit'].some(t => b.text.includes(t)));
    console.log(`\n  Add/Save button: ${JSON.stringify(addBtn || saveBtn)}`);
    console.log(`  All buttons on Y Factor tab:`);
    (step3State.buttons || []).filter(b => b.text).forEach(b => {
      console.log(`    "${b.text}"  visible=${b.visible}  pos=(${b.x},${b.y})  disabled=${b.disabled}`);
    });

    fs.writeFileSync('output/wizard-step3-add-btn.json', JSON.stringify(addBtn || saveBtn, null, 2));

    // ─ 12. Scroll Y Factor to reveal Add button ───────────────────────────────
    const submitBtnText = addBtn?.text || saveBtn?.text || 'Add';
    console.log(`\n11. Scrolling Y Factor to reveal "${submitBtnText}" button...`);
    const step3AddPos = await scrollDialogToBottomAndGetButton(page, submitBtnText);
    console.log(`  Add/Submit button after scroll: ${JSON.stringify(step3AddPos)}`);
    fs.writeFileSync('output/wizard-step3-add-btn-scrolled.json', JSON.stringify(step3AddPos, null, 2));
    await snap(page, 'step3-after-scroll');

    console.log('\n\n✅ Extraction complete!');
    console.log('   output/wizard-step1-state.json          — Market Config fields + Next btn');
    console.log('   output/wizard-step2-before-scroll.json  — Market Features before scroll');
    console.log('   output/wizard-step2-after-scroll.json   — Market Features after scroll');
    console.log('   output/wizard-step2-next-btn.json       — Next btn coords on Market Features');
    console.log('   output/wizard-step3-fields.json         — Y Factor fields');
    console.log('   output/wizard-step3-add-btn.json        — Add button info');
    console.log('   output/wizard-step3-add-btn-scrolled.json — Add button coords after scroll');

  } catch (err) {
    console.error('\n✗ Error:', err.message);
    await snap(page, 'error');
  } finally {
    await wait(5000);
    await browser.close();
  }
}

run();
