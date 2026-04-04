/**
 * extract-complete-flow.js
 * 
 * Navigates to Market Features → Adds a feature (select Feature Type, Features, Operator) 
 * → Clicks Add Feature → Clicks Next → Captures Y-Factor page
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
    console.log('4. Fill required fields (MLS Board, State, County)...');
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
    await page.screenshot({ path: 'screenshots/flow-1-add-dialog.png' });

    // The nested dialog appears as the LAST v-dialog overlay
    // Feature Type combobox is Input[11] (the last visible combobox that is NOT disabled)
    // We need input#cf-v-106 or the last active overlay's combobox

    // 7. Click Feature Type dropdown — target the LAST overlay's first combobox
    console.log('7. Click Feature Type dropdown...');
    // Use the last dialog overlay which is the "Add New Market Feature" popup
    const nestedOverlay = page.locator('.v-overlay--active .v-dialog__content').last();
    // The Feature Type v-select's combobox div
    const featureTypeField = nestedOverlay.locator('.v-select').first();
    await featureTypeField.click({ force: true });
    await wait(2000);
    await page.screenshot({ path: 'screenshots/flow-2-feature-type-open.png' });

    // Get Feature Type dropdown values
    const ftValues = await page.evaluate(() => {
      const items = document.querySelectorAll('.v-overlay--active .v-list-item');
      return Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
    });
    console.log(`   Feature Type values (${ftValues.length}):`);
    ftValues.forEach(v => console.log(`     - ${v}`));

    // Select first Feature Type
    if (ftValues.length > 0) {
      console.log('   Selecting first Feature Type...');
      await page.locator('.v-overlay--active .v-list-item').first().click();
      await wait(3000);
      await page.screenshot({ path: 'screenshots/flow-3-feature-type-selected.png' });
    }

    // 8. Now Features dropdown should be enabled. Click it.
    console.log('8. Click Features dropdown...');
    const featuresField = nestedOverlay.locator('.v-select').nth(1);
    const featuresDisabled = await nestedOverlay.locator('input[placeholder="Select the relevant features"]').isDisabled().catch(() => null);
    console.log(`   Features input disabled: ${featuresDisabled}`);
    
    await featuresField.click({ force: true });
    await wait(2000);
    await page.screenshot({ path: 'screenshots/flow-4-features-open.png' });

    // Get Features dropdown values
    const featValues = await page.evaluate(() => {
      const items = document.querySelectorAll('.v-overlay--active .v-list-item');
      return Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
    });
    console.log(`   Features values (${featValues.length}):`);
    featValues.slice(0, 20).forEach(v => console.log(`     - ${v}`));
    if (featValues.length > 20) console.log(`     ... and ${featValues.length - 20} more`);

    // Select first Features value
    if (featValues.length > 0) {
      console.log('   Selecting first Feature...');
      await page.locator('.v-overlay--active .v-list-item').first().click();
      await wait(1000);
      await page.keyboard.press('Escape');
      await wait(1000);
      await page.screenshot({ path: 'screenshots/flow-5-feature-selected.png' });
    }

    // 9. Operator radio buttons — AND is default, let's leave it
    console.log('9. Operator: AND is selected by default.');

    // 10. Click "Add Feature" button
    console.log('10. Click Add Feature...');
    const addFeatureBtn = nestedOverlay.getByRole('button', { name: 'Add Feature' });
    const isDisabled = await addFeatureBtn.isDisabled().catch(() => null);
    console.log(`    Add Feature disabled: ${isDisabled}`);
    
    if (!isDisabled) {
      await addFeatureBtn.click();
      await wait(3000);
      await page.screenshot({ path: 'screenshots/flow-6-feature-added.png' });
    } else {
      // Try broader button search
      console.log('    Trying broader Add Feature click...');
      await page.getByRole('button', { name: 'Add Feature' }).last().click();
      await wait(3000);
      await page.screenshot({ path: 'screenshots/flow-6-feature-added.png' });
    }

    // 11. Feature should appear in the table. Take screenshot.
    console.log('11. Feature added to table. Taking screenshot...');
    await page.screenshot({ path: 'screenshots/flow-7-feature-in-table.png' });

    // 12. Extract the table content
    const tableData = await page.evaluate(() => {
      const dialog = document.querySelector('.v-dialog');
      if (!dialog) return null;
      const rows = dialog.querySelectorAll('tbody tr, table tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td, th');
        return Array.from(cells).map(c => c.textContent?.trim());
      });
    });
    console.log('   Table data:', JSON.stringify(tableData));

    // 13. Click Next to go to Y-Factor Filters
    console.log('12. Click Next → Y-Factor Filters...');
    await page.getByRole('button', { name: 'Next' }).click();
    await wait(3000);
    await page.screenshot({ path: 'screenshots/flow-8-yfactor-page.png' });

    // 14. Extract Y-Factor Filters page
    console.log('13. Extracting Y-Factor Filters page...');
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
        selects: [],
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
          id: el.id || null,
          disabled: el.disabled,
        });
      });

      dialog.querySelectorAll('button, .v-btn').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.buttons.push({
          text: el.textContent?.trim()?.substring(0, 80),
          className: el.className?.toString()?.substring(0, 120),
          disabled: el.disabled,
        });
      });

      dialog.querySelectorAll('th').forEach(el => {
        results.tables.push({ text: el.textContent?.trim(), className: el.className || '' });
      });

      dialog.querySelectorAll('label, .v-label').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        results.labels.push({ text: el.textContent?.trim(), for: el.getAttribute('for') || null });
      });

      return results;
    });

    fs.writeFileSync('output/yfactor-page-full.json', JSON.stringify(yFactorData, null, 2));
    console.log(`   Y-Factor headings: ${yFactorData?.headings?.map(h => h.text).join(', ')}`);
    console.log(`   Y-Factor inputs: ${yFactorData?.inputs?.length}`);
    console.log(`   Y-Factor buttons: ${yFactorData?.buttons?.map(b => b.text).join(', ')}`);
    console.log(`   Y-Factor tables: ${yFactorData?.tables?.map(t => t.text).join(', ')}`);
    console.log(`\n   Full text:\n${yFactorData?.fullText?.substring(0, 600)}`);

    // Save all extracted values
    const allValues = {
      featureTypeOptions: ftValues,
      featureOptions: featValues,
      operators: ['AND', 'OR', 'NOT'],
      tableAfterAdd: tableData,
    };
    fs.writeFileSync('output/market-feature-complete-values.json', JSON.stringify(allValues, null, 2));

    console.log('\nDONE!');

  } catch (err) {
    console.error('\n*** ERROR ***:', err.message);
    await page.screenshot({ path: 'screenshots/flow-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
