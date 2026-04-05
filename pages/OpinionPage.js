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
}
