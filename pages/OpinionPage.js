import { BasePage } from './BasePage.js';

export class OpinionPage extends BasePage {
    constructor(page) {
        super(page);

        // ─── Opinion form fields ─────────────────────────────────────────────────
        this._opinionFieldInput = (placeholder) =>
            this.page.locator(`input[placeholder="${placeholder}"]`).first();
        this._allNumberInputs = () => this.page.locator('input[type="number"]');
        this._remarksField = () =>
            this.page.locator('textarea[placeholder="Enter remarks"], textarea').first();
        this._selectPhotosBtn = () => this.page.locator('button:has-text("Select Photos")').first();
        this._saveOpinionBtn = () => this.page.locator('button:has-text("Save Opinion")').first();
        this._snackbar = () => this.page.locator('.v-snackbar, [role="status"], [role="alert"]').first();

        // ─── Factor input selectors by placeholder pattern ───────────────────────
        this._factorInput = (name) => this.page.locator(`input[placeholder*="${name}" i]`).first();
    }

    async waitForPageLoad() {
        try {
            await this.page.locator('text=Loading property details').waitFor({ state: 'hidden', timeout: 30000 });
        } catch { /* gone or never appeared */ }
        await this.wait(4000);
    }

    async scrollDown(offset = 500) {
        await this.page.evaluate((y) => window.scrollBy(0, y), offset);
        await this.wait(1000);
    }

    // ─── Opinion Field filling ────────────────────────────────────────────────────

    async fillOpinionField(placeholder, value) {
        const input = this._opinionFieldInput(placeholder);
        const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
        if (isVisible) {
            await input.click({ force: true });
            await this.wait(300);
            await input.fill(value);
            await this.wait(200);
        } else {
            // Fallback: use nth number input
            const opinionPlaceholders = [
                'Enter View Value', 'Enter Condition Value', 'Enter Quality Value',
                'Enter Amenities Value', 'Enter Access Value', 'Enter Appeal Value',
                'Enter Elevation Value', 'Enter Economic Value',
            ];
            const idx = opinionPlaceholders.indexOf(placeholder);
            if (idx !== -1) {
                const nthInput = this._allNumberInputs().nth(idx);
                if (await nthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await nthInput.click({ force: true });
                    await this.wait(200);
                    await nthInput.fill(value);
                    await this.wait(200);
                }
            }
        }
    }

    async fillAllOpinionFields(fields) {
        for (const field of fields) {
            await this.fillOpinionField(field.placeholder, field.value);
        }
    }

    async fillRemarks(text) {
        const field = this._remarksField();
        if (await field.isVisible({ timeout: 5000 }).catch(() => false)) {
            await field.click({ force: true });
            await this.wait(300);
            await field.fill(text);
            await this.wait(300);
        }
    }

    // ─── Factor value reading ─────────────────────────────────────────────────────

    async readFactorValue(name) {
        const input = this._factorInput(name);
        return await input.inputValue().catch(() => null);
    }

    async readAllFactorValues(factorNames) {
        const values = {};
        for (const name of factorNames) {
            const input = this._factorInput(name);
            const val = await input.inputValue().catch(() => null);
            values[name] = val !== null ? (parseFloat(val) || 0) : 0;
        }
        return values;
    }

    async scrollFactorIntoView(name) {
        const input = this._factorInput(name);
        await input.scrollIntoViewIfNeeded().catch(() => {});
        await this.wait(200);
    }

    // ─── Opinion totals reading ───────────────────────────────────────────────────

    async readOriginalOpinionTotal() {
        return await this.findValueNearLabel(/^original\s+opinion\s+total$/i);
    }

    async readOriginalYTotal() {
        return await this.findValueNearLabel(/^original\s+y\s+total$/i);
    }

    async readOpinionTotal() {
        return await this.findValueNearLabel(/^opinion\s+total$/i);
    }

    // ─── Photo Selection ─────────────────────────────────────────────────────────

    async openSelectPhotosDialog() {
        await this._selectPhotosBtn().waitFor({ state: 'visible', timeout: 10000 });
        await this._selectPhotosBtn().click({ force: true });
        await this.wait(2000);
    }

    async selectPhotoForFactor(outerOverlay, factorName) {
        const outerDialogBtns = outerOverlay.locator('button:has-text("Select Photo")');
        const btnCount = await outerDialogBtns.count();
        if (btnCount === 0) return;

        const overlayCountBefore = await this.page.locator('.v-overlay--active').count();
        await outerDialogBtns.first().click({ force: true });
        await this.wait(3000);

        const overlayCountAfter = await this.page.locator('.v-overlay--active').count();
        if (overlayCountAfter <= overlayCountBefore) return;

        const innerOverlay = this.page.locator('.v-overlay--active').last();
        const imgElements = innerOverlay.locator('img');
        const saveSelBtn = innerOverlay.locator('button:has-text("Save Selection")');

        let imageSelected = false;
        const firstImg = imgElements.first();
        if (await firstImg.isVisible({ timeout: 3000 }).catch(() => false)) {
            await this.page.evaluate(() => {
                const overlays = [...document.querySelectorAll('.v-overlay--active')];
                const inner = overlays[overlays.length - 1];
                if (!inner) return;
                const imgs = inner.querySelectorAll('img');
                if (!imgs.length) return;
                let el = imgs[0].parentElement;
                for (let i = 0; i < 4; i++) {
                    if (!el) break;
                    el.click();
                    el = el.parentElement;
                }
            });
            await this.wait(1000);
            imageSelected = await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false);
        }

        if (!imageSelected) {
            await firstImg.click({ force: true });
            await this.wait(1000);
            imageSelected = await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false);
        }

        if (!imageSelected) {
            const innerBox = await innerOverlay.boundingBox();
            if (innerBox) {
                const clickX = Math.round(innerBox.x + innerBox.width * 0.2);
                const clickY = Math.round(innerBox.y + 200);
                await this.page.mouse.click(clickX, clickY);
                await this.wait(1000);
                imageSelected = await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false);
            }
        }

        if (await saveSelBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
            await saveSelBtn.click({ force: true });
            await this.wait(2000);
            await this.page.waitForFunction(
                (prevCount) => document.querySelectorAll('.v-overlay--active').length <= prevCount,
                overlayCountBefore + 1,
                { timeout: 5000 }
            ).catch(() => {});
        } else {
            await this.page.keyboard.press('Escape');
            await this.wait(500);
        }
    }

    async confirmPhotoSelection() {
        const outerOverlay = this.page.locator('.v-overlay--active').first();
        const confirmBtn = outerOverlay.locator('button:has-text("Confirm")').first();
        if (await confirmBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
            await confirmBtn.click({ force: true });
            await this.wait(2000);
        } else {
            await outerOverlay.locator('button:has-text("Cancel")').first().click({ force: true }).catch(() => {});
            await this.wait(500);
        }
    }

    // ─── Save Opinion ─────────────────────────────────────────────────────────────

    async saveOpinion() {
        await this._saveOpinionBtn().scrollIntoViewIfNeeded().catch(() => {});
        await this.wait(500);
        await this._saveOpinionBtn().click({ force: true });
        await this.wait(3000);
    }

    async getSnackbarText() {
        return await this._snackbar().innerText().catch(() => '');
    }

    // ─── Scroll page helper ───────────────────────────────────────────────────────

    async scrollPageToTop() {
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.wait(500);
    }

    async scrollInSteps(steps = [300, 600, 900, 1200]) {
        for (const offset of steps) {
            await this.page.evaluate((y) => window.scrollBy(0, y), offset);
            await this.wait(600);
        }
    }

    // ─── Getters for assertion use in spec ────────────────────────────────────────

    getSaveOpinionButtonLocator() {
        return this._saveOpinionBtn();
    }

    getSelectPhotosButtonLocator() {
        return this._selectPhotosBtn();
    }

    getOuterOverlayLocator() {
        return this.page.locator('.v-overlay--active').first();
    }

    // ─── Navigation helpers ───────────────────────────────────────────────────────

    /**
     * Navigate to a property URL, wait for load and spinner, then scroll the page.
     * @param {string} url
     */
    async gotoPropertyAndWaitForLoad(url) {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.waitForLoadingSpinnerToHide(30000);
        await this.wait(4000);
        await this.scrollPropertyPage();
    }

    /**
     * Navigate to an opinion/average URL, wait for load and spinner, then scroll.
     * @param {string} url
     */
    async gotoOpinionUrlAndScroll(url) {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.waitForLoadingSpinnerToHide(20000);
        await this.wait(3000);
        await this.scrollPropertyPage();
    }

    /**
     * Scroll the property page from the top downward in incremental steps.
     * Reveals all opinion factor inputs.
     */
    async scrollPropertyPage() {
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.wait(400);
        for (const offset of [300, 600, 900, 1200, 1500]) {
            await this.page.evaluate((y) => window.scrollBy(0, y), offset);
            await this.wait(500);
        }
    }

    /**
     * Read the property street address from the current page.
     * @returns {Promise<string|null>}
     */
    async readPropertyAddress() {
        return this.page.evaluate(() => {
            const selectors = ['h1', 'h2', '[class*="address"]', '[class*="property-title"]', '[class*="property-name"]'];
            for (const sel of selectors) {
                for (const el of document.querySelectorAll(sel)) {
                    const t = el.innerText?.trim();
                    if (t && /\d/.test(t) && t.length > 5 && t.length < 150) return t;
                }
            }
            return null;
        });
    }

    /**
     * Read the "Opinion Total" stat card value (distinct from "Original Opinion Total").
     * @returns {Promise<number|null>}
     */
    async readOpinionTotalOnPage() {
        return this.readOpinionTotal();
    }

    // ─── Factor fill & record ─────────────────────────────────────────────────────

    /**
     * Fill all opinion factor fields and return the recorded values + ratios.
     *
     * @param {string[]} factorNames         - e.g. ['View', 'Condition', ...]
     * @param {Record<string,string>} labelMap - maps factor name → result key (e.g. ADMIN_LABEL)
     * @param {Record<string,string>} opinionValues - values to fill
     * @param {number|null} originalTotal    - denominator for ratio calculation
     * @param {{ forbiddenValues?: Record<string,string>|null }} options
     *   - forbiddenValues: if non-null, soft-assert current value !== forbiddenValues[name]
     * @returns {Promise<{ viewData: object, ratioData: object }>}
     */
    async fillAndRecordFactorFields(factorNames, labelMap, opinionValues, originalTotal, { forbiddenValues = null } = {}) {
        const viewData  = {};
        const ratioData = {};

        for (const name of factorNames) {
            const label      = labelMap[name];
            const ratioLabel = `${label} ratio`;
            const input      = this._factorInput(name);

            await input.scrollIntoViewIfNeeded().catch(() => {});
            await this.wait(200);

            const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
            if (!isVisible) {
                console.log(`  ⚠  [${label}] input not visible — skipping`);
                viewData[label]      = null;
                ratioData[ratioLabel] = null;
                continue;
            }

            if (forbiddenValues !== null) {
                const current  = await input.inputValue().catch(() => null);
                const forbidden = forbiddenValues[name];
                if (current === forbidden) {
                    console.log(`  ⚠  [${name}] shows value '${forbidden}' — should NOT be visible to this role`);
                } else {
                    console.log(`  ✓  [${name}] pre-fill: '${current}' (not forbidden '${forbidden}') — OK`);
                }
                const { expect } = await import('@playwright/test');
                expect.soft(current, `[${name}] value '${forbidden}' should NOT be visible`).not.toBe(forbidden);
            }

            await input.click({ force: true });
            await this.wait(200);
            await input.fill('');
            await this.wait(100);
            await input.fill(opinionValues[name]);
            await this.wait(300);

            const filled = await input.inputValue().catch(() => null);
            viewData[label] = filled !== null ? parseFloat(filled) : null;

            const ratio = viewData[label] !== null && originalTotal && originalTotal !== 0
                ? viewData[label] / originalTotal
                : null;
            ratioData[ratioLabel] = ratio;
            console.log(`  [${label}] → value: "${filled}" | ratio: ${ratio}`);
        }

        return { viewData, ratioData };
    }

    // ─── Pre-fill assertions ──────────────────────────────────────────────────────

    /**
     * Assert that each factor field is pre-filled with the expected opinion values.
     * Uses soft assertions.
     *
     * @param {string[]} factorNames
     * @param {Record<string,string>} expectedOpinionValues - map of factor → expected value string
     * @param {boolean} skipAssertions - if true, only log (do not assert)
     * @param {string} [role] - label for logging context
     * @returns {Promise<Array<{name:string, found:boolean, value:number|null, pass:boolean}>>}
     */
    async assertFactorPrefills(factorNames, expectedOpinionValues, skipAssertions, role = '') {
        const results = [];
        console.log(`\n  ${'Factor'.padEnd(12)} | Expected | Pre-fill     | Result`);
        console.log(`  ${'-'.repeat(58)}`);

        for (const name of factorNames) {
            const input     = this._factorInput(name);
            const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
            if (!isVisible) {
                results.push({ name, found: false, value: null, pass: false });
                console.log(`  ⚠  [${name}] input not visible — skipping`);
                continue;
            }

            const val      = await input.inputValue().catch(() => null);
            const expected = parseFloat(expectedOpinionValues[name]);
            const numVal   = val !== null ? parseFloat(val) : NaN;
            const pass     = !isNaN(numVal) && Math.abs(numVal - expected) < 0.01;
            results.push({ name, found: true, value: numVal, pass });
            console.log(`  ${name.padEnd(12)} | ${String(expectedOpinionValues[name]).padEnd(8)} | ${String(val ?? '(empty)').padEnd(12)} | ${pass ? '✓ PASS' : '✗ FAIL'}`);

            if (!skipAssertions) {
                const { expect } = await import('@playwright/test');
                expect.soft(numVal,
                    `${role ? role + ' ' : ''}${name.toLowerCase()} value should match pre-fill ` +
                    `(expected ${expectedOpinionValues[name]}, got ${val})`
                ).toBeCloseTo(expected, 2);
            }
        }

        console.log(`  ${'-'.repeat(58)}`);
        return results;
    }

    // ─── Ratio update assertions ──────────────────────────────────────────────────

    /**
     * Assert each factor field = savedRatio × newTotal after a base value update.
     *
     * @param {string[]} factorNames
     * @param {Record<string,string>} labelMap
     * @param {object} savedResult           - the previously persisted JSON result object
     * @param {number|null} newTotal         - new originalOpinionTotal
     * @returns {Promise<{updatedViewData:object, updatedRatioData:object, allPass:boolean}>}
     */
    async assertFactorRatioUpdate(factorNames, labelMap, savedResult, newTotal) {
        const updatedViewData  = {};
        const updatedRatioData = {};
        let   allPass          = true;

        console.log(`  ${'Factor'.padEnd(14)} | ${'Ratio'.padEnd(12)} | ${'New Total'.padEnd(10)} | ${'Expected'.padEnd(10)} | ${'Page Value'.padEnd(10)} | Result`);
        console.log(`  ${'-'.repeat(82)}`);

        for (const name of factorNames) {
            const label      = labelMap[name];
            const ratioLabel = `${label} ratio`;
            const ratio      = savedResult[ratioLabel] ?? null;
            const expected   = (ratio !== null && newTotal !== null)
                ? parseFloat((ratio * newTotal).toFixed(2))
                : null;

            const input = this._factorInput(name);
            await input.scrollIntoViewIfNeeded().catch(() => {});
            await this.wait(200);

            const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
            if (!isVisible) {
                console.log(`  ${name.padEnd(14)} | not visible  | ✗ FAIL`);
                updatedViewData[label]       = null;
                updatedRatioData[ratioLabel] = null;
                allPass = false;
                const { expect } = await import('@playwright/test');
                expect.soft(false, `[${name}] input not visible`).toBe(true);
                continue;
            }

            const raw    = await input.inputValue().catch(() => null);
            const pageNum = raw !== null ? parseFloat(raw) : NaN;
            const pass    = expected !== null && !isNaN(pageNum) && Math.abs(pageNum - expected) < 0.01;
            if (!pass) allPass = false;

            const status = pass ? '✓ PASS' : '✗ FAIL';
            console.log(`  ${name.padEnd(14)} | ${String(ratio ?? 'N/A').padEnd(12)} | ${String(newTotal ?? 'N/A').padEnd(10)} | ${String(expected ?? 'N/A').padEnd(10)} | ${String(isNaN(pageNum) ? '(empty)' : pageNum).padEnd(10)} | ${status}`);
            if (pass) {
                console.log(`    → Calculation: ${ratio} × ${newTotal} = ${expected} — page shows ${pageNum} ✓`);
            } else {
                console.log(`    → FAIL: expected ${expected} (${ratio} × ${newTotal}), page shows ${isNaN(pageNum) ? '(empty)' : pageNum}`);
            }

            updatedViewData[label]      = !isNaN(pageNum) ? pageNum : null;
            updatedRatioData[ratioLabel] = updatedViewData[label] !== null && newTotal
                ? updatedViewData[label] / newTotal
                : null;

            const { expect } = await import('@playwright/test');
            expect.soft(pass,
                `[${name}]: ratio ${ratio} × ${newTotal} = ${expected}, got ${isNaN(pageNum) ? '(empty)' : pageNum}`
            ).toBe(true);
        }

        console.log(`  ${'-'.repeat(82)}`);
        return { updatedViewData, updatedRatioData, allPass };
    }

    // ─── Photo selection ──────────────────────────────────────────────────────────

    /**
     * Click "Select Photos", handle the modal, pick the first available photo per factor,
     * then confirm.  Gracefully skips if the button is absent.
     */
    async selectRequiredPhotos() {
        const selectPhotosBtn = this.page.locator(
            'button:has-text("Select Photos"), .v-btn:has-text("Select Photos")'
        ).first();

        const btnVisible = await selectPhotosBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (!btnVisible) {
            console.log('  ⚠  "Select Photos" button not found — skipping photo selection');
            return false;
        }

        await selectPhotosBtn.scrollIntoViewIfNeeded().catch(() => {});
        await selectPhotosBtn.click({ force: true });
        await this.wait(2000);

        let photosSelected = 0;
        for (let i = 0; i < 8; i++) {
            const selectPhotoBtn = this.page.locator(
                '.v-dialog:visible button:has-text("Select Photo"), ' +
                '[role="dialog"] button:has-text("Select Photo")'
            ).first();
            const isVisible = await selectPhotoBtn.isVisible({ timeout: 3000 }).catch(() => false);
            if (!isVisible) break;

            await selectPhotoBtn.click({ force: true });
            await this.wait(2000);

            const photoItem = this.page.locator(
                '.v-dialog:last-of-type img, [role="dialog"] img, ' +
                '.v-dialog:last-of-type .v-img'
            ).first();
            const photoVisible = await photoItem.isVisible({ timeout: 5000 }).catch(() => false);
            if (photoVisible) {
                await photoItem.click({ force: true });
                await this.wait(1000);
                const innerConfirm = this.page.locator(
                    '.v-dialog:last-of-type button:has-text("Confirm"), ' +
                    '.v-dialog:last-of-type button:has-text("Select"), ' +
                    '.v-dialog:last-of-type button:has-text("OK")'
                ).first();
                if (await innerConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await innerConfirm.click({ force: true });
                    await this.wait(1000);
                }
                photosSelected++;
                console.log(`  ↳ Photo ${photosSelected} selected`);
            } else {
                await this.page.keyboard.press('Escape');
                await this.wait(800);
            }
        }

        console.log(`  ✓ Photos selected for ${photosSelected} factor(s)`);

        // Confirm the outer "Select Primary Photos" modal
        const confirmBtn = this.page.locator(
            '.v-dialog:visible button:has-text("Confirm"), [role="dialog"] button:has-text("Confirm")'
        ).first();
        if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await confirmBtn.click({ force: true });
            await this.wait(2000);
            console.log('  ✓ Photo selection confirmed');
            return true;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.wait(800);
        return photosSelected > 0;
    }

    // ─── API capture on save ──────────────────────────────────────────────────────

    /**
     * Execute clickFn while listening for a POST/PUT/PATCH response to any URL
     * containing "opinion". Returns the first matching {url, status, method, body}.
     *
     * @param {() => Promise<void>} clickFn
     * @returns {Promise<{url:string, status:number, method:string, body:object}|null>}
     */
    async captureOpinionApiOnSave(clickFn) {
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

        this.page.on('response', handler);
        await clickFn();
        await this.wait(3000);
        this.page.off('response', handler);
        return captured;
    }
}
