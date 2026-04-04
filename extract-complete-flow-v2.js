/**
 * extract-complete-flow-v2.js
 * 
 * Uses label-based targeting and getByLabel to interact with the nested Add Feature dialog.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://stage.crexagent.com';
const EMAIL = 'zaid.m@simformsolutions.com';
const PASSWORD = 'Test@123';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
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

    // Click Next → Market Features
    console.log('5. Click Next → Market Features...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);

    // Click "Add New Market Feature"
    console.log('6. Click Add New Market Feature...');
    await page.getByRole('button', { name: 'Add New Market Feature' }).click();
    await wait(3000);

    // 7. Click Feature Type dropdown using label-based approach
    console.log('7. Click Feature Type dropdown...');
    // The Feature Type v-select has a label with for attribute pointing to input.
    // Use the label "Feature Type" to find the associated field, then click its container.
    // From DOM: label[for="cf-v-106"] -> input#cf-v-106 (combobox)
    // But IDs are dynamic. Use visible label + sibling v-select approach.
    
    // Target: the v-row that contains label "Feature Type" and a v-select
    const featureTypeRow = page.locator('label:has-text("Feature Type")').locator('..').locator('..').locator('..').locator('.v-select');
    const ftRowCount = await featureTypeRow.count();
    console.log(`   Feature Type v-select via label ancestor: ${ftRowCount}`);

    // Alternative: directly click the combobox div that is visible in the last overlay
    // The nested dialog is the last .v-overlay--active. It contains label "Feature Type"
    // Let's use: last overlay that has "Add New Market Feature" h3
    const lastOverlays = page.locator('.v-overlay--active');
    const overlayCount = await lastOverlays.count();
    console.log(`   Active overlays: ${overlayCount}`);
    
    // The nested dialog is overlay index overlayCount-1
    // But we can target more precisely: the v-card that has h3 "Add New Market Feature"
    // From DOM data: the second .v-overlay--active (index 2) contains the form
    const nestedForm = page.locator('.v-overlay--active:has(h3:has-text("Add New Market Feature"))');
    const nfCount = await nestedForm.count();
    console.log(`   Nested form overlay count: ${nfCount}`);
    
    if (nfCount > 0) {
      // Click Feature Type v-select
      const ftSelect = nestedForm.locator('.v-select').first();
      const ftSelectCount = await ftSelect.count();
      console.log(`   Feature Type v-select: ${ftSelectCount}`);
      
      if (ftSelectCount > 0) {
        await ftSelect.click({ force: true });
        await wait(2000);
        await page.screenshot({ path: 'screenshots/v2-feature-type-open.png' });
        
        // Get dropdown values
        const ftValues = await page.evaluate(() => {
          const overlays = document.querySelectorAll('.v-overlay--active');
          const lastOverlay = overlays[overlays.length - 1];
          if (!lastOverlay) return [];
          const items = lastOverlay.querySelectorAll('.v-list-item');
          return Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
        });
        console.log(`   Feature Type values (${ftValues.length}):`);
        ftValues.forEach(v => console.log(`     - ${v}`));
        
        // Select first value
        if (ftValues.length > 0) {
          const lastOverlay = page.locator('.v-overlay--active').last();
          await lastOverlay.locator('.v-list-item').first().click();
          await wait(3000);
          await page.screenshot({ path: 'screenshots/v2-feature-type-selected.png' });
          
          // Save feature type values
          fs.writeFileSync('output/feature-type-values.json', JSON.stringify(ftValues, null, 2));
        }
      }
    }

    // 8. Click Features dropdown (should be enabled now)
    console.log('8. Click Features dropdown...');
    const featSelect = nestedForm.locator('.v-select').nth(1);
    const fsCount = await featSelect.count();
    console.log(`   Features v-select count: ${fsCount}`);
    
    // Check if the Features input is now enabled
    const featInput = nestedForm.locator('input[placeholder="Select the relevant features"]');
    const featDisabled = await featInput.isDisabled().catch(() => 'error');
    console.log(`   Features input disabled: ${featDisabled}`);
    
    if (fsCount > 0) {
      await featSelect.click({ force: true });
      await wait(2000);
      await page.screenshot({ path: 'screenshots/v2-features-open.png' });
      
      // Get dropdown values
      const featValues = await page.evaluate(() => {
        const overlays = document.querySelectorAll('.v-overlay--active');
        const lastOverlay = overlays[overlays.length - 1];
        if (!lastOverlay) return [];
        const items = lastOverlay.querySelectorAll('.v-list-item');
        return Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
      });
      console.log(`   Features values (${featValues.length}):`);
      featValues.slice(0, 15).forEach(v => console.log(`     - ${v}`));
      if (featValues.length > 15) console.log(`     ... and ${featValues.length - 15} more`);
      
      // Select first value
      if (featValues.length > 0) {
        const lastOverlay = page.locator('.v-overlay--active').last();
        await lastOverlay.locator('.v-list-item').first().click();
        await wait(1000);
        // Close the dropdown
        await page.keyboard.press('Escape');
        await wait(1000);
      }
      
      fs.writeFileSync('output/features-values.json', JSON.stringify(featValues, null, 2));
      await page.screenshot({ path: 'screenshots/v2-feature-selected.png' });
    }

    // 9. Operator is AND by default — OK
    console.log('9. Operator: AND (default)');

    // 10. Click "Add Feature"
    console.log('10. Click Add Feature...');
    // "Add Feature" button — be careful not to match "Add New Market Feature" or "Add Your First Feature"
    const addFeatureBtn = page.getByRole('button', { name: 'Add Feature', exact: true });
    const afbDisabled = await addFeatureBtn.isDisabled().catch(() => 'error');
    console.log(`    Add Feature disabled: ${afbDisabled}`);
    
    await addFeatureBtn.click();
    await wait(3000);
    await page.screenshot({ path: 'screenshots/v2-feature-added.png' });

    // 11. Check table has data now
    console.log('11. Check feature table...');
    const tableText = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return '';
      const table = dialog.querySelector('table');
      return table?.innerText || 'no table';
    });
    console.log(`    Table text: ${tableText.substring(0, 300)}`);

    // 12. Click Next → Y-Factor Filters
    console.log('12. Click Next → Y-Factor...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);
    await page.screenshot({ path: 'screenshots/v2-yfactor-page.png' });

    // 13. Extract Y-Factor page
    console.log('13. Extract Y-Factor page...');
    const yData = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return null;

      return {
        text: dialog.innerText?.substring(0, 5000),
        html: dialog.innerHTML?.substring(0, 15000),
      };
    });
    
    fs.writeFileSync('output/yfactor-text.txt', yData?.text || 'no data');
    fs.writeFileSync('output/yfactor-html.txt', yData?.html || 'no data');
    console.log(`    Y-Factor page text:\n${yData?.text?.substring(0, 600)}`);

    // Also extract structured elements
    const yElements = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return null;
      const r = { headings: [], inputs: [], buttons: [], tables: [], labels: [] };

      dialog.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
        r.headings.push({ tag: el.tagName.toLowerCase(), text: el.textContent?.trim(), class: el.className });
      });
      dialog.querySelectorAll('input:not([type="hidden"]), textarea, [role="combobox"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        let label = '';
        const fw = el.closest('.v-input');
        if (fw) { const l = fw.querySelector('.v-label, label'); if (l) label = l.textContent.trim(); }
        r.inputs.push({
          tag: el.tagName.toLowerCase(), type: el.type, placeholder: el.getAttribute('placeholder'),
          label, role: el.getAttribute('role'), disabled: el.disabled, id: el.id,
        });
      });
      dialog.querySelectorAll('button, .v-btn').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        r.buttons.push({ text: el.textContent?.trim()?.substring(0, 80), disabled: el.disabled });
      });
      dialog.querySelectorAll('th').forEach(el => {
        r.tables.push({ text: el.textContent?.trim(), class: el.className });
      });
      dialog.querySelectorAll('label:not([style*="display: none"]), .v-label').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        r.labels.push({ text: el.textContent?.trim(), for: el.getAttribute('for') });
      });
      return r;
    });

    fs.writeFileSync('output/yfactor-elements.json', JSON.stringify(yElements, null, 2));
    console.log(`    Headings: ${yElements?.headings?.map(h => h.text).join(', ')}`);
    console.log(`    Inputs: ${yElements?.inputs?.length}`);
    console.log(`    Buttons: ${yElements?.buttons?.map(b => b.text).join(', ')}`);
    console.log(`    Tables: ${yElements?.tables?.map(t => t.text).join(', ')}`);
    console.log(`    Labels: ${yElements?.labels?.map(l => l.text).join(', ')}`);

    console.log('\nDONE!');

  } catch (err) {
    console.error('\n*** ERROR ***:', err.message);
    await page.screenshot({ path: 'screenshots/v2-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
