/**
 * extract-market-features.js
 * 
 * Navigates to Market Features Filters page and extracts all DOM elements.
 * Flow: Login → Properties → Filter → Fill required → Next → Capture Features page
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    // 1. Login
    console.log('1. Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });
    console.log('   Logged in.');

    // 2. Navigate to Properties
    console.log('2. Properties...');
    await page.getByText('Properties', { exact: true }).first().click();
    await page.waitForURL('**/properties', { timeout: 15000 });
    await wait(3000);

    // 3. Open Market Filters
    console.log('3. Open Market Filters...');
    await page.evaluate(() => {
      document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove());
    });
    await page.getByText('Filter By').click({ force: true });
    await wait(3000);
    await page.locator('.v-dialog').first().waitFor({ state: 'visible', timeout: 10000 });

    // 4. Fill required fields (MLS Board, State, County)
    console.log('4. Fill required fields...');
    // MLS Board
    await page.locator('.v-dialog input[placeholder="Select MLS Board"]').click({ force: true });
    await wait(2000);
    await page.locator('.v-overlay--active .v-list-item').first().click();
    await wait(3000);
    // State
    await page.locator('.v-dialog input[placeholder="Select State"]').click({ force: true });
    await wait(2000);
    await page.locator('.v-overlay--active .v-list-item').first().click();
    await wait(3000);
    // County
    await page.locator('.v-dialog input[placeholder="Select County"]').click({ force: true });
    await wait(2000);
    await page.locator('.v-overlay--active .v-list-item').first().click();
    await wait(2000);

    // 5. Click Next to reach Market Features Filters
    console.log('5. Click Next...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);
    console.log('   On Market Features Filters page.');

    // 6. Screenshot
    fs.mkdirSync('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/market-features-page.png', fullPage: true });

    // 7. Click "Add New Market Feature" to see the add form
    console.log('6. Click Add New Market Feature...');
    await page.getByText('Add New Market Feature').click();
    await wait(2000);
    await page.screenshot({ path: 'screenshots/market-features-add-form.png', fullPage: true });

    // 8. Extract all elements from the dialog
    console.log('7. Extracting DOM elements...');
    const elements = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return [];

      const results = [];
      const allElements = dialog.querySelectorAll(
        'input, button, select, textarea, a, [role="button"], [role="tab"], ' +
        '[role="combobox"], [role="listbox"], [role="checkbox"], [role="radio"], ' +
        'h1, h2, h3, h4, h5, h6, label, th, td, .v-btn, .v-field, .v-chip, ' +
        '.v-list-item, .v-tab, .v-select, .v-autocomplete'
      );

      allElements.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        results.push({
          index: i,
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          id: el.id || null,
          name: el.name || null,
          className: el.className?.toString()?.substring(0, 150) || null,
          role: el.getAttribute('role') || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          placeholder: el.getAttribute('placeholder') || null,
          textContent: el.textContent?.trim()?.substring(0, 100) || null,
          href: el.href || null,
          disabled: el.disabled || false,
          value: el.value?.substring(0, 50) || null,
          dataAttrs: Object.fromEntries(
            Array.from(el.attributes)
              .filter(a => a.name.startsWith('data-'))
              .map(a => [a.name, a.value])
          ),
        });
      });

      return results;
    });

    console.log(`   Found ${elements.length} elements.`);

    // Save raw data
    fs.mkdirSync('output', { recursive: true });
    fs.writeFileSync('output/market-features-elements.json', JSON.stringify(elements, null, 2));
    console.log('   Saved to output/market-features-elements.json');

    // 9. Also try clicking Add Your First Feature if visible
    console.log('8. Checking for add feature form fields...');
    
    // Extract more specific info about the add form
    const formElements = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return [];

      const results = [];
      // Look for visible inputs, selects, dropdowns, textareas in the current view
      const inputs = dialog.querySelectorAll('input:not([type="hidden"]), textarea, select, [role="combobox"]');
      inputs.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        // Find the closest label
        let label = '';
        const fieldWrapper = el.closest('.v-field, .v-input');
        if (fieldWrapper) {
          const labelEl = fieldWrapper.querySelector('.v-label, label');
          if (labelEl) label = labelEl.textContent.trim();
        }

        results.push({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          placeholder: el.getAttribute('placeholder') || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          label: label || null,
          name: el.name || null,
          disabled: el.disabled,
          className: el.className?.toString()?.substring(0, 100) || null,
          role: el.getAttribute('role') || null,
          value: el.value?.substring(0, 50) || null,
        });
      });

      // Also get all buttons
      const buttons = dialog.querySelectorAll('button, [role="button"], .v-btn');
      buttons.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.push({
          tag: 'button',
          type: 'button',
          textContent: el.textContent?.trim()?.substring(0, 80) || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          className: el.className?.toString()?.substring(0, 100) || null,
          disabled: el.disabled,
        });
      });

      // Get all headings
      const headings = dialog.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(el => {
        results.push({
          tag: el.tagName.toLowerCase(),
          type: 'heading',
          textContent: el.textContent?.trim() || null,
        });
      });

      return results;
    });

    fs.writeFileSync('output/market-features-form-elements.json', JSON.stringify(formElements, null, 2));
    console.log(`   Found ${formElements.length} form elements. Saved.`);

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/market-features-final.png', fullPage: true });

    console.log('\nDONE!');

  } catch (err) {
    console.error('\n*** ERROR ***:', err.message);
    fs.mkdirSync('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/market-features-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
