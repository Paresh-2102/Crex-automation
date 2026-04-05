import { BasePage } from './BasePage.js';
import { getLocator } from '../locators/yformula-creation.locators.js';

export class YFormulaPage extends BasePage {
    constructor(page) {
        super(page);

        // ─── Y-Total Tab & Table ────────────────────────────────────────────────
        this._yTotalTab = () => getLocator(this.page, 'yTotalTab').first();
        this._addNewFormulaBtn = () => getLocator(this.page, 'addNewFormulaButton').first();
        this._rowSearchBtn = () => getLocator(this.page, 'rowSearchButton');

        // ─── Dialog headings / labels ───────────────────────────────────────────
        this._createFormulaDialogTitle = () => getLocator(this.page, 'createFormulaDialogTitle');
        this._mlsBoardLabelRequired = () => getLocator(this.page, 'mlsBoardLabelRequired');
        this._stateLabelRequired = () => getLocator(this.page, 'stateLabelRequired');
        this._countyLabelRequired = () => getLocator(this.page, 'countyLabelRequired');
        this._baseValueLabelRequired = () => getLocator(this.page, 'baseValueLabelRequired');

        // ─── Market Configuration inputs ────────────────────────────────────────
        this._mlsBoardInput = () => getLocator(this.page, 'mlsBoardInput');
        this._stateInput = () => getLocator(this.page, 'stateInput');
        this._countyInput = () => getLocator(this.page, 'countyInput');
        this._cityInput = () => getLocator(this.page, 'cityInput');
        this._zipCodeInput = () => getLocator(this.page, 'zipCodeInput');
        this._baseValueInput = () => getLocator(this.page, 'baseValueInput').first();

        // ─── Wizard navigation buttons ──────────────────────────────────────────
        this._nextBtn = () => getLocator(this.page, 'nextButton');
        this._activeDialogOverlay = () => this.page.locator('.v-overlay--active').first();

        // ─── Y-Factor inputs ────────────────────────────────────────────────────
        this._baseNumberInput = (n) => this.page.locator('.v-dialog input[placeholder="Enter base number"]').nth(n);
        this._unitValueInput = (n) => this.page.locator('.v-dialog input[placeholder="Enter unit value"]').nth(n);
        this._yesOrNoInput = (n) => this.page.locator('.v-dialog input[placeholder="Select Yes or No"]').nth(n);
        this._featureInput = (n) => this.page
            .locator('.v-dialog input[placeholder="Select the features (optional)"]').nth(n);

        // ─── Formula table row buttons ──────────────────────────────────────────
        this._tableRows = () => this.page.locator('table tbody tr');
    }

    // ─── Navigation ─────────────────────────────────────────────────────────────

    async clickYTotalTab() {
        await this._yTotalTab().click({ force: true });
        await this.wait(2000);
    }

    async openCreateFormulaDialog() {
        await this._addNewFormulaBtn().click({ force: true });
        await this.wait(2000);
    }

    // ─── Market Configuration ────────────────────────────────────────────────────

    async fillMarketConfiguration(yFormula) {
        await this.selectDialogDropdownOption('Select MLS Board', yFormula.mlsBoard);
        await this.wait(2000);
        await this.selectDialogDropdownOption('Select State', yFormula.state);
        await this.wait(2000);
        await this.selectDialogDropdownOption('Select County', yFormula.county);
        await this.wait(1500);
        if (yFormula.city) {
            await this.selectDialogDropdownOption('Select City', yFormula.city);
            await this.wait(1000);
        }
        if (yFormula.zipCode) {
            await this.selectDialogDropdownOption('Select Zip Code', yFormula.zipCode);
            await this.wait(1000);
        }

        // Dismiss any open overlay before filling base value
        const overlayOpen = await this.page.locator('.v-overlay--active .v-list-item').count();
        if (overlayOpen > 0) {
            await this.page.keyboard.press('Tab');
            await this.wait(400);
        }

        const baseInput = this._baseValueInput();
        await baseInput.click();
        await this.wait(500);
        await baseInput.fill(yFormula.baseValue);
        await baseInput.press('Tab');
        await this.wait(800);
    }

    // ─── Wizard Step 1 → 2 ──────────────────────────────────────────────────────

    async goToMarketFeaturesStep() {
        await this.removeOverlayScrim();
        const nextButton = this._nextBtn().first();
        await nextButton.click();
        await this.wait(2000);

        // If wizard closed for some reason, reopen via edit icon
        if (await this.page.locator('.v-dialog').count() === 0) {
            const editButton = this.page.locator('button:has(i.mdi-pencil), button:has(.mdi-pencil)').first();
            if (await editButton.count() > 0) {
                await editButton.click({ force: true });
                await this.wait(2000);
            }
        }

        // Wait for feature inputs to become visible
        try {
            await this.page.getByText('Loading property attributes...').waitFor({ state: 'hidden', timeout: 30000 });
        } catch { /* already gone */ }
        await this.wait(1000);
    }

    // ─── Market Features Step ───────────────────────────────────────────────────

    async fillYFormulaMarketFeatures(marketFeatures) {
        const featureTypeOrder = [
            'Accessibility Features', 'Appliances', 'Architectural Style',
            'Association Amenities', 'Common Interest', 'Community Features',
            'Construction Materials', 'Cooling', 'Exterior Features',
            'Foundation Details', 'Heating', 'Interior Features',
            'Levels', 'Lot Features', 'Other Structures',
            'Parking Features', 'Patio Porch Features', 'Pool Features',
            'Property Sub Type', 'Property Type', 'Road Surface Type',
            'Security Features', 'Sewer', 'Structure Type',
            'Utilities', 'View', 'Water Source',
            'Waterfront Features', 'Window Features',
        ];

        for (const featureEntry of marketFeatures) {
            if (!featureEntry.features?.length) continue;
            const rowIndex = featureTypeOrder.indexOf(featureEntry.featureType);
            if (rowIndex === -1) continue;

            // Scroll the row into view
            await this.page.evaluate((idx) => {
                const inputs = document.querySelectorAll('.v-dialog input[placeholder="Select the features (optional)"]');
                const target = inputs[idx];
                if (!target) return;
                let el = target.parentElement;
                while (el && !el.classList.contains('v-dialog')) {
                    if (el.scrollHeight > el.clientHeight) {
                        const tr = target.getBoundingClientRect();
                        const cr = el.getBoundingClientRect();
                        el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
                        break;
                    }
                    el = el.parentElement;
                }
            }, rowIndex);
            await this.wait(500);

            const featureInput = this._featureInput(rowIndex);
            for (const featureValue of featureEntry.features) {
                await featureInput.click({ force: true });
                await this.wait(600);
                await featureInput.fill(featureValue);
                await this.wait(1500);
                const option = this.page.locator('.v-overlay--active .v-list-item')
                    .filter({ hasText: featureValue }).first();
                if (await option.count() > 0) {
                    await option.click({ force: true });
                    await this.wait(400);
                }
            }
            await this.page.keyboard.press('Tab');
            await this.wait(500);

            const featureKey = featureEntry.featureType.toLowerCase().replace(/\s+/g, '_');
            const operatorLabel = this.page.locator(
                `label[for="operator-${featureKey}-${rowIndex}-${featureEntry.operator}"]`
            );
            if (await operatorLabel.count() > 0) {
                await operatorLabel.click({ force: true });
                await this.wait(300);
            }
        }
    }

    // ─── Wizard Step 2 → 3 ──────────────────────────────────────────────────────

    async goToYFactorStep() {
        await this.scrollDialogToBottom();

        const step2NextPos = await this.page.evaluate(() => {
            const btns = [...document.querySelectorAll('.v-dialog button')]
                .filter(b => b.textContent.trim() === 'Next');
            const btn = btns.find(b => {
                const r = b.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            }) || btns[btns.length - 1];
            if (!btn) return null;
            const r = btn.getBoundingClientRect();
            return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        });

        if (step2NextPos) {
            await this.page.mouse.click(step2NextPos.x, step2NextPos.y);
        }
        await this.wait(3000);
    }

    // ─── Y-Factor Step ──────────────────────────────────────────────────────────

    async fillYFactorRows(yFactorRows, excelYFactors = {}) {
        for (let i = 0; i < yFactorRows.length; i++) {
            const row = yFactorRows[i];
            const excelRow = excelYFactors[row.key] || {};
            const baseVal = (excelRow.min && excelRow.min !== '') ? excelRow.min : row.base;
            const unitVal = (excelRow.max && excelRow.max !== '') ? excelRow.max : row.unit;

            // Scroll row into view
            await this.page.evaluate((idx) => {
                const inputs = document.querySelectorAll('.v-dialog input[placeholder="Enter base number"]');
                const target = inputs[idx];
                if (!target) return;
                let el = target.parentElement;
                while (el && !el.classList.contains('v-dialog')) {
                    if (el.scrollHeight > el.clientHeight) {
                        const tr = target.getBoundingClientRect();
                        const cr = el.getBoundingClientRect();
                        el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
                        break;
                    }
                    el = el.parentElement;
                }
            }, i);
            await this.wait(300);

            const baseInput = this._baseNumberInput(i);
            await baseInput.click({ force: true });
            await this.wait(200);
            await baseInput.fill(baseVal);
            await baseInput.press('Tab');
            await this.wait(500);

            const unitInput = this._unitValueInput(i);
            await unitInput.click({ force: true });
            await this.wait(200);
            await unitInput.fill(unitVal);
            await this.wait(300);
        }
    }

    async fillAssociationYN(value, unitValue = '1000') {
        if (!value) return;
        await this._scrollYNInputIntoView(0);
        await this.wait(400);
        const assocInput = this._yesOrNoInput(0);
        await assocInput.click({ force: true });
        await this.wait(600);
        const option = this.page.locator('.v-overlay--active .v-list-item')
            .filter({ hasText: value }).first();
        if (await option.count() > 0) {
            await option.click({ force: true });
            await this.wait(500);
            const assocUnitInput = this._unitValueInput(8);
            if (await assocUnitInput.count() > 0) {
                await assocUnitInput.click({ force: true });
                await this.wait(200);
                await assocUnitInput.fill(unitValue);
                await this.wait(300);
            }
        } else {
            await this.page.keyboard.press('Escape');
            await this.wait(300);
        }
        await this.page.keyboard.press('Tab');
        await this.wait(400);
    }

    async fillCoolingYN(value, unitValue = '2000') {
        if (!value) return;
        await this._scrollYNInputIntoView(-1);
        await this.wait(400);
        const coolingInput = this._yesOrNoInput(1);
        await coolingInput.click({ force: true });
        await this.wait(600);
        const option = this.page.locator('.v-overlay--active .v-list-item')
            .filter({ hasText: value }).first();
        if (await option.count() > 0) {
            await option.click({ force: true });
            await this.wait(500);
            const coolingUnitInput = this._unitValueInput(9);
            if (await coolingUnitInput.count() > 0) {
                await coolingUnitInput.click({ force: true });
                await this.wait(200);
                await coolingUnitInput.fill(unitValue);
                await this.wait(300);
            }
        } else {
            await this.page.keyboard.press('Escape');
            await this.wait(300);
        }
    }

    async _scrollYNInputIntoView(index) {
        await this.page.evaluate((idx) => {
            const inputs = document.querySelectorAll('.v-dialog input[placeholder="Select Yes or No"]');
            const target = idx === -1 ? inputs[inputs.length - 1] : inputs[idx];
            if (!target) return;
            let el = target.parentElement;
            while (el && !el.classList.contains('v-dialog')) {
                if (el.scrollHeight > el.clientHeight) {
                    const tr = target.getBoundingClientRect();
                    const cr = el.getBoundingClientRect();
                    el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
                    break;
                }
                el = el.parentElement;
            }
        }, index);
    }

    // ─── Submit ─────────────────────────────────────────────────────────────────

    async submitCreateFormula() {
        await this.scrollDialogToBottom();

        const createButton = this.page.locator('.v-dialog button:has-text("Create")').last();
        await createButton.scrollIntoViewIfNeeded();
        await this.wait(500);
        await createButton.click({ force: true });

        const dialogClosed = await Promise.race([
            this.page.locator('[role="dialog"].v-overlay--active')
                .waitFor({ state: 'hidden', timeout: 60000 })
                .then(() => true).catch(() => false),
            this.page.locator('.v-snackbar, [class*="toast"], [role="status"]')
                .filter({ hasText: /already exists/i })
                .waitFor({ state: 'visible', timeout: 60000 })
                .then(() => false).catch(() => false),
        ]);

        if (!dialogClosed) {
            const isOpen = await this.page.locator('[role="dialog"].v-overlay--active').isVisible();
            if (isOpen) {
                await this.page.keyboard.press('Escape');
                await this.wait(1500);
            }
        }
    }

    // ─── Table row helpers ───────────────────────────────────────────────────────

    getMatchingFormulaRow(mlsBoard, state, county) {
        return this._tableRows().filter({
            has: this.page.locator('td', { hasText: mlsBoard }),
        }).filter({
            has: this.page.locator('td', { hasText: state }),
        }).filter({
            has: this.page.locator('td', { hasText: county }),
        }).first();
    }

    getRowSearchButton(row) {
        return row.locator('td:last-child button:nth-child(3)');
    }

    getRowEditButton(row) {
        return row.locator('td:last-child button:nth-child(1)');
    }

    async clickRowSearchButton(mlsBoard, state, county) {
        const row = this.getMatchingFormulaRow(mlsBoard, state, county);
        const rowExists = await row.count() > 0;
        const searchBtn = rowExists
            ? this.getRowSearchButton(row)
            : this._rowSearchBtn();
        await searchBtn.click({ force: true });
        await this.page.waitForURL('**/properties**', { timeout: 30000 });
    }

    async clickRowEditButton(mlsBoard, state, county) {
        const row = this.getMatchingFormulaRow(mlsBoard, state, county);
        const rowExists = await row.count() > 0;
        const editBtn = rowExists
            ? this.getRowEditButton(row)
            : this.page.locator('table tbody tr').first().locator('td:last-child button:nth-child(1)');
        await editBtn.click({ force: true });
        await this.wait(3000);
    }

    // ─── Edit dialog actions ─────────────────────────────────────────────────────

    async fillBaseValueInEditDialog(newBaseValue) {
        const dialogOverlay = this._activeDialogOverlay();
        const allInputs = dialogOverlay.locator('input');
        const inputCount = await allInputs.count();
        let baseInputFilled = false;

        for (let i = 0; i < inputCount; i++) {
            const inp = allInputs.nth(i);
            const lb = await inp.evaluate(el => {
                const field = el.closest('.v-field, .v-input, [class*="field"]');
                return field?.querySelector('label, .v-label')?.innerText?.trim() || '';
            }).catch(() => '');
            const ph = await inp.getAttribute('placeholder').catch(() => '') || '';
            if (/base\s*value/i.test(lb) || /base/i.test(ph)) {
                await inp.click({ force: true });
                await inp.fill(String(newBaseValue));
                await this.wait(300);
                baseInputFilled = true;
                break;
            }
        }
        if (!baseInputFilled && inputCount > 0) {
            const firstInp = allInputs.first();
            await firstInp.click({ force: true });
            await firstInp.fill(String(newBaseValue));
            await this.wait(300);
        }
    }

    async saveEditDialog() {
        const dialogOverlay = this._activeDialogOverlay();
        const saveBtn = dialogOverlay.locator('button:has-text("Save"), button:has-text("Update")').last();
        if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await saveBtn.click({ force: true });
            await this.wait(3000);
        }
    }

    async clickNextInDialog() {
        const dialogOverlay = this._activeDialogOverlay();
        const nextBtn = dialogOverlay.locator('button:has-text("Next"), button:has-text("Continue")').first();
        if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await nextBtn.click({ force: true });
            await this.wait(2000);
        }
    }

    async clickYFactorTab() {
        const dialogOverlay = this._activeDialogOverlay();
        const yFactorTab = dialogOverlay
            .locator('button:has-text("Y Factor"), [role="tab"]:has-text("Y Factor")').first();
        if (await yFactorTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await yFactorTab.click({ force: true });
            await this.wait(2000);
        }
    }

    async fillYFactorRowsInEditDialog(numericFactorOrder, factorLabels, bvtYFactors) {
        const dialogOverlay = this._activeDialogOverlay();

        for (let i = 0; i < numericFactorOrder.length; i++) {
            const key = numericFactorOrder[i];
            const label = factorLabels[i];
            const fData = bvtYFactors[key] || { baseNumber: '', unitValue: '' };
            const baseNum = String(fData.baseNumber || '');
            const unitVal = String(fData.unitValue || '');

            if (!baseNum && !unitVal) continue;

            await this.page.evaluate((idx) => {
                const inputs = document.querySelectorAll('.v-overlay--active input[placeholder="Enter base number"]');
                const target = inputs[idx];
                if (!target) return;
                let el = target.parentElement;
                while (el && !el.classList.contains('v-dialog') && !el.classList.contains('v-overlay__content')) {
                    if (el.scrollHeight > el.clientHeight) {
                        const tr = target.getBoundingClientRect();
                        const cr = el.getBoundingClientRect();
                        el.scrollTop = Math.max(0, tr.top - cr.top + el.scrollTop - 80);
                        break;
                    }
                    el = el.parentElement;
                }
            }, i);
            await this.wait(300);

            const baseInput = dialogOverlay.locator('input[placeholder="Enter base number"]').nth(i);
            if (await baseInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                await baseInput.click({ force: true });
                await this.wait(200);
                await baseInput.fill(baseNum);
                await baseInput.press('Tab');
                await this.wait(500);
            } else {
                continue;
            }

            const unitInput = dialogOverlay.locator('input[placeholder="Enter unit value"]').nth(i);
            if (await unitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                await unitInput.click({ force: true });
                await this.wait(200);
                await unitInput.fill(unitVal);
                await this.wait(300);
            }
        }
    }

    async fillYNFieldsInEditDialog(ynFields, numericCount, bvtYFactors) {
        const dialogOverlay = this._activeDialogOverlay();
        for (const ynField of ynFields) {
            const ynData = bvtYFactors[ynField.key] || {};
            const ynValue = String(ynData.value || '').trim();
            const ynUnit = String(ynData.unitValue || '').trim();
            if (!ynValue) continue;

            const ynInput = dialogOverlay
                .locator('input[placeholder="Select Yes or No"]').nth(ynField.dropdownIndex);
            if (await ynInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                await ynInput.click({ force: true });
                await this.wait(1000);
                const option = this.page.locator('.v-overlay--active .v-list-item, .v-list-item')
                    .filter({ hasText: new RegExp(`^${ynValue}$`, 'i') }).first();
                if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await option.click({ force: true });
                    await this.wait(500);
                } else {
                    await ynInput.fill(ynValue);
                    await this.wait(500);
                }
            }

            if (ynUnit) {
                const ynUnitInput = dialogOverlay.locator(
                    'input[placeholder="Enter base number"]:not([placeholder="Enter base value"])'
                ).nth(numericCount + ynField.dropdownIndex);
                if (await ynUnitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await ynUnitInput.click({ force: true });
                    await this.wait(200);
                    await ynUnitInput.fill(ynUnit);
                    await this.wait(300);
                }
            }
        }
    }

    // ─── Getters for assertion use in spec ───────────────────────────────────────

    getCreateFormulaDialogTitleLocator() {
        return this._createFormulaDialogTitle();
    }
    getMlsBoardLabelRequiredLocator() {
        return this._mlsBoardLabelRequired();
    }
    getStateLabelRequiredLocator() {
        return this._stateLabelRequired();
    }
    getCountyLabelRequiredLocator() {
        return this._countyLabelRequired();
    }
    getBaseValueLabelRequiredLocator() {
        return this._baseValueLabelRequired();
    }
    getAddNewFormulaButtonLocator() {
        return this._addNewFormulaBtn();
    }

    // ─── Retry helpers for opinion flow ─────────────────────────────────────────

    /**
     * Click the Y-Total tab, reloading the page if the tab is not immediately visible.
     * Handles scenarios where the settings page loads slowly.
     */
    async clickYTotalTabWithRetry() {
        const tab = this._yTotalTab();
        const visible = await tab.isVisible({ timeout: 3000 }).catch(() => false);
        if (!visible) {
            console.log('  ⚠  Y-Total tab not found — reloading settings page...');
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.wait(2000);
            await tab.waitFor({ state: 'visible', timeout: 10000 });
        }
        await tab.click({ force: true });
        await this.wait(2000);
    }

    /**
     * Update the Base Value field inside an open edit dialog, then save it.
     * Falls back to wizard-style navigation (Next → Save/Add) if simple Save is absent.
     * @param {string} newValue
     */
    async updateBaseValueAndSave(newValue) {
        const baseValueInput = this.page.locator(
            '.v-dialog:visible input[placeholder*="Base Value" i], ' +
            '.v-dialog:visible input[placeholder*="base value" i], ' +
            '.v-dialog:visible input[type="number"]'
        ).first();
        await baseValueInput.waitFor({ state: 'visible', timeout: 10000 });
        await baseValueInput.scrollIntoViewIfNeeded().catch(() => {});
        await baseValueInput.click({ clickCount: 3, force: true });
        await baseValueInput.fill('');
        await this.wait(200);
        await baseValueInput.fill(newValue);
        await this.wait(500);
        console.log(`  ✓ Base Value updated to: ${newValue}`);

        // Try simple Save/Update button first
        const saveBtn = this.page.locator(
            '.v-dialog:visible button:has-text("Save"), ' +
            '.v-dialog:visible button:has-text("Update"), ' +
            '.v-dialog:visible button:has-text("Confirm")'
        ).first();
        if (await saveBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
            await saveBtn.click({ force: true });
            await this.wait(3000);
            console.log('  ✓ Saved via Save/Update button');
            return;
        }

        // Wizard-style: Next → Next → Add/Save
        const nextBtn = this.page.locator('.v-dialog:visible button:has-text("Next")').first();
        if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextBtn.click({ force: true });
            await this.wait(1500);
            await nextBtn.click({ force: true }).catch(() => {});
            await this.wait(1500);
            const addBtn = this.page.locator(
                '.v-dialog:visible button:has-text("Add"), .v-dialog:visible button:has-text("Save")'
            ).last();
            if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await addBtn.click({ force: true });
                await this.wait(3000);
                console.log('  ✓ Saved via wizard Next → Add');
                return;
            }
        }

        await this.page.keyboard.press('Escape');
        await this.wait(1000);
        console.log('  ⚠  Dialog closed via Escape (no save button found)');
    }
}
