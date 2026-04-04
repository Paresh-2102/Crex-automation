/**
 * extract-market-features-form.js
 * 
 * Navigates to Market Features Filters page, clicks "Add New Market Feature",
 * extracts all form fields, dropdown values, and then clicks Next to reach Y-Factor page.
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
  fs.mkdirSync('screenshots', { recursive: true });
  fs.mkdirSync('output', { recursive: true });

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

    // 4. Fill required fields
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
    console.log('5. Click Next → Market Features...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);
    await page.screenshot({ path: 'screenshots/features-step1-empty.png', fullPage: true });

    // 6. Click "Add New Market Feature" button
    console.log('6. Click Add New Market Feature...');
    await page.getByRole('button', { name: 'Add New Market Feature' }).click();
    await wait(3000);
    await page.screenshot({ path: 'screenshots/features-step2-add-form.png', fullPage: true });

    // 7. Extract all form elements after clicking Add
    console.log('7. Extracting form elements...');
    const formElements = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return { inputs: [], buttons: [], headings: [], labels: [], other: [] };

      const results = { inputs: [], buttons: [], headings: [], labels: [], other: [] };

      // All inputs, textareas, selects, comboboxes
      dialog.querySelectorAll('input:not([type="hidden"]), textarea, select, [role="combobox"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        let label = '';
        const fieldWrapper = el.closest('.v-field, .v-input, .v-text-field');
        if (fieldWrapper) {
          const labelEl = fieldWrapper.querySelector('.v-label, label');
          if (labelEl) label = labelEl.textContent.trim();
        }

        results.inputs.push({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          placeholder: el.getAttribute('placeholder') || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          label: label || null,
          name: el.name || null,
          disabled: el.disabled,
          role: el.getAttribute('role') || null,
          value: el.value?.substring(0, 50) || null,
          className: el.className?.toString()?.substring(0, 120) || null,
          id: el.id || null,
        });
      });

      // All buttons
      dialog.querySelectorAll('button, [role="button"], .v-btn').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.buttons.push({
          tag: el.tagName.toLowerCase(),
          textContent: el.textContent?.trim()?.substring(0, 80) || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          className: el.className?.toString()?.substring(0, 120) || null,
          disabled: el.disabled,
        });
      });

      // All headings
      dialog.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
        results.headings.push({
          tag: el.tagName.toLowerCase(),
          textContent: el.textContent?.trim() || null,
          className: el.className || null,
        });
      });

      // All labels
      dialog.querySelectorAll('label, .v-label').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.labels.push({
          tag: el.tagName.toLowerCase(),
          textContent: el.textContent?.trim() || null,
          for: el.getAttribute('for') || null,
          className: el.className?.toString()?.substring(0, 100) || null,
        });
      });

      // Table headers
      dialog.querySelectorAll('th').forEach(el => {
        results.other.push({
          tag: 'th',
          textContent: el.textContent?.trim() || null,
          className: el.className || null,
        });
      });

      return results;
    });

    fs.writeFileSync('output/market-features-add-form-elements.json', JSON.stringify(formElements, null, 2));
    console.log(`   Inputs: ${formElements.inputs.length}, Buttons: ${formElements.buttons.length}, Labels: ${formElements.labels.length}`);

    // 8. Try to extract dropdown options from "Feature Type" dropdown
    console.log('8. Extracting Feature Type dropdown values...');
    // Look for the feature type dropdown/select
    const featureTypeInput = page.locator('.v-dialog input[placeholder*="Select Feature"], .v-dialog input[placeholder*="Feature Type"], .v-dialog input[placeholder*="feature"], .v-dialog input[placeholder*="Select"]').first();
    const featureTypeCount = await featureTypeInput.count();
    
    let featureTypeValues = [];
    if (featureTypeCount > 0) {
      console.log('   Found Feature Type input, clicking...');
      await featureTypeInput.click({ force: true });
      await wait(2000);
      await page.screenshot({ path: 'screenshots/features-step3-feature-type-dropdown.png', fullPage: true });

      featureTypeValues = await page.evaluate(() => {
        const items = document.querySelectorAll('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
        return Array.from(items).map(el => ({
          text: el.textContent?.trim(),
          value: el.getAttribute('value') || null,
        }));
      });
      console.log(`   Feature Type values: ${featureTypeValues.length}`);
      
      if (featureTypeValues.length > 0) {
        // Select the first Feature Type
        console.log('   Selecting first Feature Type...');
        await page.locator('.v-overlay--active .v-list-item').first().click();
        await wait(2000);
        await page.screenshot({ path: 'screenshots/features-step4-after-feature-type.png', fullPage: true });
      } else {
        await page.keyboard.press('Escape');
        await wait(1000);
      }
    } else {
      console.log('   No Feature Type input found, trying all visible inputs...');
    }

    // 9. Try to find and extract Features dropdown
    console.log('9. Looking for Features dropdown...');
    // Re-extract all inputs after selecting feature type
    const updatedInputs = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return [];
      const inputs = dialog.querySelectorAll('input:not([type="hidden"]), textarea, [role="combobox"]');
      return Array.from(inputs).map(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        let label = '';
        const fieldWrapper = el.closest('.v-field, .v-input');
        if (fieldWrapper) {
          const labelEl = fieldWrapper.querySelector('.v-label, label');
          if (labelEl) label = labelEl.textContent.trim();
        }
        return {
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          placeholder: el.getAttribute('placeholder') || null,
          label: label || null,
          role: el.getAttribute('role') || null,
          disabled: el.disabled,
        };
      }).filter(Boolean);
    });
    
    console.log('   Updated inputs after feature type selection:');
    updatedInputs.forEach((inp, i) => {
      console.log(`   [${i}] ${inp.tag} | type=${inp.type} | placeholder="${inp.placeholder}" | label="${inp.label}" | role=${inp.role}`);
    });
    fs.writeFileSync('output/market-features-updated-inputs.json', JSON.stringify(updatedInputs, null, 2));
    
    // Try clicking the second dropdown (Features)
    if (updatedInputs.length >= 2) {
      console.log('10. Clicking Features dropdown...');
      // Find the features input (second visible combobox/input)
      const allDialogInputs = page.locator('.v-dialog input:not([type="hidden"])');
      const inputCount = await allDialogInputs.count();
      console.log(`    Total dialog inputs: ${inputCount}`);
      
      for (let i = 0; i < inputCount; i++) {
        const inp = allDialogInputs.nth(i);
        const isVisible = await inp.isVisible().catch(() => false);
        const placeholder = await inp.getAttribute('placeholder').catch(() => '');
        const role = await inp.getAttribute('role').catch(() => '');
        console.log(`    Input[${i}]: visible=${isVisible}, placeholder="${placeholder}", role="${role}"`);
      }
      
      // Try to click inputs that look like feature dropdowns
      for (let i = 0; i < inputCount; i++) {
        const inp = allDialogInputs.nth(i);
        const isVisible = await inp.isVisible().catch(() => false);
        if (!isVisible) continue;
        const placeholder = await inp.getAttribute('placeholder').catch(() => '');
        if (placeholder && (placeholder.toLowerCase().includes('feature') || placeholder.toLowerCase().includes('select'))) {
          console.log(`    Clicking input[${i}] with placeholder="${placeholder}"...`);
          await inp.click({ force: true });
          await wait(2000);
          
          const dropdownValues = await page.evaluate(() => {
            const items = document.querySelectorAll('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
            return Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
          });
          
          if (dropdownValues.length > 0) {
            console.log(`    Found ${dropdownValues.length} values: ${dropdownValues.slice(0, 10).join(', ')}`);
            // Select first value
            await page.locator('.v-overlay--active .v-list-item').first().click();
            await wait(2000);
          } else {
            console.log(`    No dropdown values for input[${i}]`);
            await page.keyboard.press('Escape');
            await wait(500);
          }
        }
      }
    }

    await page.screenshot({ path: 'screenshots/features-step5-after-all-selections.png', fullPage: true });

    // 10. Check for textarea / description field
    console.log('11. Checking for description textarea...');
    const textarea = page.locator('.v-dialog textarea');
    const textareaCount = await textarea.count();
    console.log(`    Textareas found: ${textareaCount}`);
    if (textareaCount > 0) {
      for (let i = 0; i < textareaCount; i++) {
        const isVisible = await textarea.nth(i).isVisible().catch(() => false);
        const placeholder = await textarea.nth(i).getAttribute('placeholder').catch(() => '');
        console.log(`    Textarea[${i}]: visible=${isVisible}, placeholder="${placeholder}"`);
      }
    }

    // 11. Look for save/add/confirm button for the new feature row
    console.log('12. Looking for Save/Add/Confirm button...');
    const allButtons = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll('button, .v-btn')).map(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        return {
          text: el.textContent?.trim()?.substring(0, 80),
          ariaLabel: el.getAttribute('aria-label'),
          className: el.className?.toString()?.substring(0, 100),
        };
      }).filter(Boolean);
    });
    console.log('    All buttons:');
    allButtons.forEach((b, i) => console.log(`    [${i}] "${b.text}" | aria="${b.ariaLabel}"`));

    // 12. Final full extraction of everything visible
    console.log('13. Final full extraction...');
    const finalState = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return null;
      return {
        html: dialog.innerHTML.substring(0, 15000),
        innerText: dialog.innerText.substring(0, 5000),
      };
    });
    fs.writeFileSync('output/market-features-dialog-html.txt', finalState?.html || 'no dialog');
    fs.writeFileSync('output/market-features-dialog-text.txt', finalState?.innerText || 'no dialog');

    // Save all extracted dropdown values
    const allValues = {
      featureType: featureTypeValues,
      allButtons: allButtons,
    };
    fs.writeFileSync('output/market-features-dropdown-values.json', JSON.stringify(allValues, null, 2));

    await page.screenshot({ path: 'screenshots/features-final.png', fullPage: true });

    // 13. Now click Next to see Y-Factor page
    console.log('14. Clicking Next to go to Y-Factor Filters...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);
    await page.screenshot({ path: 'screenshots/yfactor-page.png', fullPage: true });
    
    // Extract Y-Factor page elements
    const yFactorElements = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return { inputs: [], buttons: [], headings: [], text: '' };
      
      const results = { inputs: [], buttons: [], headings: [], text: '' };
      results.text = dialog.innerText.substring(0, 3000);
      
      dialog.querySelectorAll('input:not([type="hidden"]), textarea, [role="combobox"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        let label = '';
        const fw = el.closest('.v-field, .v-input');
        if (fw) { const l = fw.querySelector('.v-label, label'); if (l) label = l.textContent.trim(); }
        results.inputs.push({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          placeholder: el.getAttribute('placeholder') || null,
          label: label || null,
          role: el.getAttribute('role') || null,
        });
      });
      
      dialog.querySelectorAll('button, .v-btn').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.buttons.push({ text: el.textContent?.trim()?.substring(0, 80) });
      });
      
      dialog.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
        results.headings.push({ tag: el.tagName.toLowerCase(), text: el.textContent?.trim() });
      });
      
      return results;
    });
    
    fs.writeFileSync('output/yfactor-page-elements.json', JSON.stringify(yFactorElements, null, 2));
    console.log(`   Y-Factor page: ${yFactorElements.inputs.length} inputs, ${yFactorElements.buttons.length} buttons`);
    console.log(`   Y-Factor text preview: ${yFactorElements.text.substring(0, 300)}`);

    console.log('\nDONE!');

  } catch (err) {
    console.error('\n*** ERROR ***:', err.message);
    await page.screenshot({ path: 'screenshots/features-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
