/**
 * extract-nested-dialog.js
 * 
 * After clicking "Add New Market Feature", a nested dialog appears.
 * This script extracts that nested dialog's form fields and dropdown values.
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
    // Login
    console.log('1. Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/affiliate-managers', { timeout: 15000 });

    // Navigate to Properties
    console.log('2. Properties...');
    await page.getByText('Properties', { exact: true }).first().click();
    await page.waitForURL('**/properties', { timeout: 15000 });
    await wait(3000);

    // Open Market Filters
    console.log('3. Open Market Filters...');
    await page.evaluate(() => document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove()));
    await page.getByText('Filter By').click({ force: true });
    await wait(3000);

    // Fill required fields
    console.log('4. Fill required fields...');
    await page.locator('.v-dialog input[placeholder="Select MLS Board"]').click({ force: true });
    await wait(2000);
    await page.locator('.v-overlay--active .v-list-item').first().click();
    await wait(3000);
    await page.locator('.v-dialog input[placeholder="Select State"]').click({ force: true });
    await wait(2000);
    await page.locator('.v-overlay--active .v-list-item').first().click();
    await wait(3000);
    await page.locator('.v-dialog input[placeholder="Select County"]').click({ force: true });
    await wait(2000);
    await page.locator('.v-overlay--active .v-list-item').first().click();
    await wait(2000);

    // Click Next for Market Features
    console.log('5. Click Next...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);

    // Click "Add New Market Feature"
    console.log('6. Click Add New Market Feature...');
    await page.getByRole('button', { name: 'Add New Market Feature' }).click();
    await wait(3000);

    // The nested dialog appears — it's the LAST .v-dialog in the DOM
    console.log('7. Extracting nested dialog elements...');
    
    const nestedDialog = await page.evaluate(() => {
      // Get ALL v-overlay__content that contain dialogs
      const allDialogs = document.querySelectorAll('.v-overlay--active .v-card, .v-dialog--active, .v-overlay--active');
      const results = { dialogs: [], lastDialogElements: null };
      
      allDialogs.forEach((d, i) => {
        results.dialogs.push({
          index: i,
          className: d.className?.toString()?.substring(0, 150),
          text: d.innerText?.substring(0, 200),
        });
      });

      // Find the dialog that contains "Add New Market Feature" title
      let targetDialog = null;
      document.querySelectorAll('.v-card, .v-dialog').forEach(d => {
        if (d.innerText?.includes('Add New Market Feature') && d.innerText?.includes('Feature Type')) {
          targetDialog = d;
        }
      });

      if (!targetDialog) {
        // Try all overlays
        document.querySelectorAll('.v-overlay--active').forEach(d => {
          if (d.innerText?.includes('Feature Type') && d.innerText?.includes('Operator')) {
            targetDialog = d;
          }
        });
      }

      if (!targetDialog) return results;

      results.lastDialogElements = {
        fullText: targetDialog.innerText?.substring(0, 2000),
        html: targetDialog.innerHTML?.substring(0, 8000),
        inputs: [],
        buttons: [],
        radios: [],
        labels: [],
        selects: [],
      };

      // Inputs
      targetDialog.querySelectorAll('input, textarea, select, [role="combobox"], [role="listbox"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        results.lastDialogElements.inputs.push({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          placeholder: el.getAttribute('placeholder') || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          role: el.getAttribute('role') || null,
          name: el.name || null,
          value: el.value?.substring(0, 50) || null,
          disabled: el.disabled,
          checked: el.checked || false,
          visible: rect.width > 0 && rect.height > 0,
          className: el.className?.toString()?.substring(0, 120) || null,
          id: el.id || null,
        });
      });

      // Radio buttons specifically
      targetDialog.querySelectorAll('input[type="radio"], [role="radio"]').forEach(el => {
        const label = el.closest('label, .v-selection-control')?.textContent?.trim() || '';
        results.lastDialogElements.radios.push({
          name: el.name || null,
          value: el.value || null,
          checked: el.checked,
          label: label,
          id: el.id || null,
        });
      });

      // Buttons
      targetDialog.querySelectorAll('button, .v-btn').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.lastDialogElements.buttons.push({
          text: el.textContent?.trim()?.substring(0, 80),
          ariaLabel: el.getAttribute('aria-label'),
          className: el.className?.toString()?.substring(0, 100),
        });
      });

      // Labels
      targetDialog.querySelectorAll('label, .v-label').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.lastDialogElements.labels.push({
          text: el.textContent?.trim(),
          for: el.getAttribute('for') || null,
        });
      });

      // v-select / v-autocomplete wrappers
      targetDialog.querySelectorAll('.v-select, .v-autocomplete, .v-combobox').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const inp = el.querySelector('input');
        const label = el.querySelector('.v-label, label')?.textContent?.trim() || '';
        results.lastDialogElements.selects.push({
          className: el.className?.toString()?.substring(0, 120),
          label: label,
          placeholder: inp?.getAttribute('placeholder') || null,
          ariaLabel: inp?.getAttribute('aria-label') || null,
          inputId: inp?.id || null,
        });
      });

      return results;
    });

    fs.writeFileSync('output/nested-dialog-elements.json', JSON.stringify(nestedDialog, null, 2));
    console.log(`   Found dialog: ${!!nestedDialog.lastDialogElements}`);
    if (nestedDialog.lastDialogElements) {
      console.log(`   Inputs: ${nestedDialog.lastDialogElements.inputs.length}`);
      console.log(`   Radios: ${nestedDialog.lastDialogElements.radios.length}`);
      console.log(`   Buttons: ${nestedDialog.lastDialogElements.buttons.length}`);
      console.log(`   Labels: ${nestedDialog.lastDialogElements.labels.length}`);
      console.log(`   Selects: ${nestedDialog.lastDialogElements.selects.length}`);
      console.log(`   Full text: ${nestedDialog.lastDialogElements.fullText?.substring(0, 300)}`);
    }

    // 8. Click Feature Type dropdown to get values
    console.log('8. Opening Feature Type dropdown...');
    // The nested dialog's Feature Type is a v-select. We need to target the correct one.
    // Use the last overlay that contains "Feature Type"
    const featureTypeSelects = page.locator('.v-overlay--active .v-select, .v-overlay--active .v-autocomplete');
    const ftCount = await featureTypeSelects.count();
    console.log(`   v-select/v-autocomplete count in active overlays: ${ftCount}`);
    
    // Try clicking on the Feature Type select within the nested overlay
    // The nested dialog has .v-card — look for the card that has "Add New Market Feature"
    const nestedCard = page.locator('.v-card:has-text("Add New Market Feature"):has-text("Feature Type")');
    const cardCount = await nestedCard.count();
    console.log(`   Found nested card: ${cardCount}`);
    
    if (cardCount > 0) {
      // Find all inputs in this card
      const cardInputs = nestedCard.locator('input');
      const ciCount = await cardInputs.count();
      console.log(`   Inputs in nested card: ${ciCount}`);
      
      for (let i = 0; i < ciCount; i++) {
        const inp = cardInputs.nth(i);
        const vis = await inp.isVisible().catch(() => false);
        const ph = await inp.getAttribute('placeholder').catch(() => '');
        const type = await inp.getAttribute('type').catch(() => '');
        const role = await inp.getAttribute('role').catch(() => '');
        console.log(`   Input[${i}]: visible=${vis}, type="${type}", placeholder="${ph}", role="${role}"`);
      }

      // Click the first combobox/select-like input in the card (Feature Type)
      const firstCombobox = nestedCard.locator('input[role="combobox"]').first();
      const cbCount = await firstCombobox.count();
      if (cbCount > 0) {
        console.log('   Clicking Feature Type combobox...');
        await firstCombobox.click({ force: true });
        await wait(2000);
        await page.screenshot({ path: 'screenshots/nested-feature-type-open.png', fullPage: true });

        // Get dropdown values
        const ftValues = await page.evaluate(() => {
          const items = document.querySelectorAll('.v-overlay--active .v-list-item');
          return Array.from(items).map(el => ({
            text: el.textContent?.trim(),
            value: el.getAttribute('data-value') || el.getAttribute('value') || null,
          }));
        });
        console.log(`   Feature Type values (${ftValues.length}):`);
        ftValues.forEach(v => console.log(`     - ${v.text}`));
        
        if (ftValues.length > 0) {
          // Select first Feature Type
          await page.locator('.v-overlay--active .v-list-item').first().click();
          await wait(2000);
          await page.screenshot({ path: 'screenshots/nested-feature-type-selected.png', fullPage: true });

          // Now try Features dropdown (second combobox)
          console.log('9. Opening Features dropdown...');
          const secondCombobox = nestedCard.locator('input[role="combobox"]').nth(1);
          const scCount = await secondCombobox.count();
          if (scCount > 0) {
            await secondCombobox.click({ force: true });
            await wait(2000);
            await page.screenshot({ path: 'screenshots/nested-features-dropdown-open.png', fullPage: true });

            const featValues = await page.evaluate(() => {
              const items = document.querySelectorAll('.v-overlay--active .v-list-item');
              return Array.from(items).map(el => ({
                text: el.textContent?.trim(),
                value: el.getAttribute('data-value') || null,
              }));
            });
            console.log(`   Features values (${featValues.length}):`);
            featValues.forEach(v => console.log(`     - ${v.text}`));

            if (featValues.length > 0) {
              await page.locator('.v-overlay--active .v-list-item').first().click();
              await wait(1000);
            }
            await page.keyboard.press('Escape');
            await wait(1000);

            // Save feature values
            const allValues = {
              featureType: ftValues,
              features: featValues,
            };
            fs.writeFileSync('output/market-feature-dropdown-values.json', JSON.stringify(allValues, null, 2));
          }
        }
      } else {
        // Try regular input (not combobox)
        const firstInput = nestedCard.locator('.v-select input, .v-autocomplete input').first();
        console.log('   No combobox found, trying v-select input...');
        await firstInput.click({ force: true });
        await wait(2000);
        await page.screenshot({ path: 'screenshots/nested-feature-type-open-alt.png', fullPage: true });
      }
    }

    await page.screenshot({ path: 'screenshots/nested-after-selections.png', fullPage: true });

    // 10. Click "Add Feature" button
    console.log('10. Clicking Add Feature...');
    const addFeatureBtn = page.getByRole('button', { name: 'Add Feature' });
    const afbCount = await addFeatureBtn.count();
    if (afbCount > 0) {
      await addFeatureBtn.click();
      await wait(2000);
      await page.screenshot({ path: 'screenshots/nested-after-add-feature.png', fullPage: true });
    }

    // 11. The feature should now appear in the table. Click Next.
    console.log('11. Clicking Next to go to Y-Factor Filters...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);
    await page.screenshot({ path: 'screenshots/yfactor-page.png', fullPage: true });

    // 12. Extract Y-Factor page
    console.log('12. Extracting Y-Factor page...');
    const yFactorData = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return null;
      
      const results = {
        fullText: dialog.innerText?.substring(0, 5000),
        headings: [],
        inputs: [],
        buttons: [],
        tables: [],
        labels: [],
      };

      dialog.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
        results.headings.push({ tag: el.tagName.toLowerCase(), text: el.textContent?.trim(), className: el.className || '' });
      });

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
          label: label,
          role: el.getAttribute('role') || null,
        });
      });

      dialog.querySelectorAll('button, .v-btn').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.buttons.push({ text: el.textContent?.trim()?.substring(0, 80) });
      });

      dialog.querySelectorAll('th').forEach(el => {
        results.tables.push({ text: el.textContent?.trim(), className: el.className || '' });
      });

      return results;
    });

    fs.writeFileSync('output/yfactor-page-elements.json', JSON.stringify(yFactorData, null, 2));
    console.log(`   Y-Factor page text preview:`);
    console.log(yFactorData?.fullText?.substring(0, 500));

    console.log('\nDONE!');

  } catch (err) {
    console.error('\n*** ERROR ***:', err.message);
    await page.screenshot({ path: 'screenshots/nested-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
