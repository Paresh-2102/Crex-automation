import { BasePage } from './BasePage.js';
import { getLocator as getFilterLocator } from '../locators/properties-market-filters.locators.js';
import { getLocator as getFeaturesLocator } from '../locators/market-features-filters.locators.js';
import { getLocator as getYFactorLocator } from '../locators/yfactor-filters.locators.js';

export class PropertiesPage extends BasePage {
    constructor(page) {
        super(page);
        // --- Market Filter Dialog locators ---
        this._filterByBtn = () => this.page.getByText('Filter By');
        this._filterDialog = () => this.page.locator('.v-dialog').first();
        this._mlsBoardInput = () => this.page.locator('.v-dialog input[placeholder="Select MLS Board"]');
        this._stateInput = () => this.page.locator('.v-dialog input[placeholder="Select State"]');
        this._countyInput = () => this.page.locator('.v-dialog input[placeholder="Select County"]');
        this._cityInput = () => this.page.locator('.v-dialog input[placeholder="Select Cities"]');
        this._schoolDistrictInput = () => this.page.locator('.v-dialog input[placeholder="Select School Districts"]');
        this._zipCodeInput = () => this.page.locator('.v-dialog input[placeholder="Select Zip Codes"]');
        this._propertyStatusInput = () => this.page.locator('.v-dialog input[placeholder="Select property status"]');
        this._minPriceInput = () => getFilterLocator(this.page, 'minPriceInput');
        this._maxPriceInput = () => getFilterLocator(this.page, 'maxPriceInput');
        this._filterNextBtn = () => getFilterLocator(this.page, 'nextButton');

        // --- Market Features Dialog locators ---
        this._marketFeaturesTitle = () => getFeaturesLocator(this.page, 'marketFeaturesDialogTitle');
        this._addNewMarketFeatureBtn = () => this.page.getByRole('button', { name: 'Add New Market Feature' });
        this._addFeatureBtn = () => this.page.getByRole('button', { name: 'Add Feature', exact: true });
        this._featuresNextBtn = () => getFeaturesLocator(this.page, 'nextButton');

        // --- Y-Factor Dialog locators ---
        this._yFactorsHeader = () => getYFactorLocator(this.page, 'yFactorsHeader');
        this._yFactorConfigText = () => this.page.getByText('Configure Y-factor filters for your property search');
        this._yFactorMinInput = (n) => this.page.locator('.v-dialog input[placeholder="Enter Min Value"]').nth(n);
        this._yFactorMaxInput = (n) => this.page.locator('.v-dialog input[placeholder="Enter Max Value"]').nth(n);
        this._yesNoInput = () => this.page.locator('.v-dialog input[placeholder="Select Yes/No"]').first();
        this._applyFiltersBtn = () => getYFactorLocator(this.page, 'applyFiltersButton');

        // --- Map / chart locators ---
        this._blueMarker = () => this.page.locator(
            '.leaflet-marker-icon, .marker-cluster, [class*="marker"], [class*="blue"], svg circle[fill="blue"], .leaflet-interactive'
        ).first();
        this._viewDetailBtn = () => this.page.getByRole('button', { name: /view detail/i });
        this._loadingSpinner = () => this.page.locator('.v-progress-circular, .mdi-loading, [class*="loading"]').first();

        // --- Panel / property card locators ---
        this._cardPanel = () => this.page.locator('.card-panel, [class*="card-panel"]').first();
        this._selectBtn = () => this.page.locator('button.select-remove-btn').first();
        this._setOpinionBtn = () => this.page.locator('button:has-text("Set Opinion")').first();
    }

    // ─── Navigation ────────────────────────────────────────────────
    async openFilterDialog() {
        await this.removeOverlayScrim();
        await this._filterByBtn().click({ force: true });
        await this.wait(3000);
        await this._filterDialog().waitFor({ state: 'visible', timeout: 10000 });
    }

    // ─── Market Filters ────────────────────────────────────────────
    async applyMarketFilters(filters) {
        if (filters.mlsBoard) {
            await this.selectDropdownOption('.v-dialog input[placeholder="Select MLS Board"]', filters.mlsBoard);
            await this.wait(3000);
        }
        if (filters.state) {
            await this.selectDropdownOption('.v-dialog input[placeholder="Select State"]', filters.state);
            await this.wait(3000);
        }
        if (filters.county) {
            await this.selectDropdownOption('.v-dialog input[placeholder="Select County"]', filters.county);
            await this.wait(3000);
        }
        if (filters.city) {
            await this.selectDropdownOption('.v-dialog input[placeholder="Select Cities"]', filters.city);
            await this.page.keyboard.press('Escape');
            await this.wait(2000);
        }
        if (filters.schoolDistrict) {
            await this.selectDropdownOption('.v-dialog input[placeholder="Select School Districts"]', filters.schoolDistrict);
            await this.page.keyboard.press('Escape');
            await this.wait(2000);
        }
        if (filters.zipCode) {
            await this.selectDropdownOption('.v-dialog input[placeholder="Select Zip Codes"]', filters.zipCode);
            await this.page.keyboard.press('Escape');
            await this.wait(2000);
        }
        if (filters.propertyStatus) {
            await this.selectDropdownOption('.v-dialog input[placeholder="Select property status"]', filters.propertyStatus);
            await this.page.keyboard.press('Escape');
            await this.wait(1500);
        }
        if (filters.minPrice) await this._minPriceInput().fill(filters.minPrice);
        if (filters.maxPrice) await this._maxPriceInput().fill(filters.maxPrice);
    }

    async goToMarketFeatures() {
        await this._filterNextBtn().click();
        await this.wait(3000);
    }

    // ─── Market Features ───────────────────────────────────────────
    async applyMarketFeatures(features) {
        for (const feature of features) {
            await this._addNewMarketFeatureBtn().click();
            await this.wait(3000);

            const nestedDialog = this.page.locator('.v-overlay--active:has(h3:has-text("Add New Market Feature"))');
            const featureTypeSelect = nestedDialog.locator('.v-select').first();
            await featureTypeSelect.click({ force: true });
            await this.wait(2000);
            await this.page.getByText(feature.featureType, { exact: true }).click();
            await this.wait(3000);

            const featuresSelect = nestedDialog.locator('.v-select').nth(1);
            await featuresSelect.click({ force: true });
            await this.wait(3000);

            const fItems = this.page.locator('.v-overlay--active').last().locator('.v-list-item');
            await fItems.first().waitFor({ state: 'visible', timeout: 15000 });

            if (feature.features?.length > 0) {
                for (const featureName of feature.features) {
                    const matchingItem = fItems.filter({ hasText: featureName });
                    if (await matchingItem.count() > 0) {
                        await matchingItem.first().click();
                        await this.wait(500);
                    }
                }
            } else {
                await fItems.first().click();
                await this.wait(500);
            }

            await this.page.keyboard.press('Escape');
            await this.wait(1000);

            if (feature.operator && feature.operator !== 'AND') {
                await this.page.locator(`#operator-${feature.operator}`).click({ force: true });
                await this.wait(500);
            }

            await this._addFeatureBtn().click();
            await this.wait(3000);
        }
    }

    async goToYFactors() {
        await this._featuresNextBtn().click();
        await this.wait(3000);
    }

    // ─── Y-Factors ─────────────────────────────────────────────────
    async applyYFactors(yFactors) {
        const minMaxFields = [
            { key: 'bedroomsTotal', index: 0 },
            { key: 'bathroomsTotal', index: 1 },
            { key: 'siteArea', index: 2 },
            { key: 'finishedSqFt', index: 3 },
            { key: 'yearBuilt', index: 4 },
            { key: 'stories', index: 5 },
            { key: 'garageSpaces', index: 6 },
            { key: 'fireplacesTotal', index: 7 },
        ];

        for (const field of minMaxFields) {
            const data = yFactors[field.key];
            if (!data) continue;
            if (data.min) {
                await this._yFactorMinInput(field.index).fill(String(data.min));
                await this.wait(300);
            }
            if (data.max) {
                await this._yFactorMaxInput(field.index).fill(String(data.max));
                await this.wait(300);
            }
        }

        const yesNoFields = [{ key: 'associationYn' }, { key: 'coolingYn' }];
        for (const field of yesNoFields) {
            const value = yFactors[field.key];
            if (!value) continue;

            await this.page.keyboard.press('Escape');
            await this.wait(500);
            await this.removeOverlayScrim();
            await this.wait(500);

            const selectInput = this._yesNoInput();
            await selectInput.scrollIntoViewIfNeeded();
            await this.wait(500);
            await selectInput.click({ force: true });
            await this.wait(2000);

            const items = this.page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
            await items.first().waitFor({ state: 'visible', timeout: 10000 });
            const matchingItem = items.filter({ hasText: value });
            if (await matchingItem.count() > 0) {
                await matchingItem.first().click();
            }
            await this.wait(1500);
        }
    }

    async clickApplyFilters() {
        await this._applyFiltersBtn().click();
        await this.wait(5000);
    }

    // ─── Map / chart ───────────────────────────────────────────────
    async waitForMapToLoad() {
        await this.waitForLoadingSpinnerToHide(60000);
        await this.wait(5000);
    }

    async clickFirstBlueDot() {
        await this._blueMarker().waitFor({ state: 'visible', timeout: 20000 });
        await this._blueMarker().click({ force: true });
        await this.wait(3000);
    }

    async clickViewDetail() {
        await this._viewDetailBtn().waitFor({ state: 'visible', timeout: 10000 });
        await this._viewDetailBtn().click();
        await this.wait(5000);
    }

    // ─── Chart Panel ───────────────────────────────────────────────
    async getChartRect() {
        return await this.page.evaluate(() => {
            const el = document.querySelector('.chart-card') ||
                document.querySelector('[class*="chart-card"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
        });
    }

    async hoverChartDot(pxRatio = 0.35, pyRatio = 0.70) {
        const chartRect = await this.getChartRect();
        if (!chartRect) return false;
        const x = Math.round(chartRect.x + chartRect.width * pxRatio);
        const y = Math.round(chartRect.y + chartRect.height * pyRatio);
        await this.page.mouse.move(x, y);
        await this.wait(1000);
        return true;
    }

    async clickChartDot(pxRatio = 0.35, pyRatio = 0.70) {
        const chartRect = await this.getChartRect();
        if (!chartRect) return;
        const x = Math.round(chartRect.x + chartRect.width * pxRatio);
        const y = Math.round(chartRect.y + chartRect.height * pyRatio);
        await this.page.mouse.move(x, y);
        await this.wait(1000);
        await this.page.mouse.click(x, y);
        await this.wait(2000);
    }

    async getCardPanelText() {
        return await this._cardPanel().innerText().catch(() => '');
    }

    async clickSelectProperty() {
        if (await this._selectBtn().isVisible({ timeout: 5000 }).catch(() => false)) {
            await this._selectBtn().click({ force: true });
            await this.wait(1500);
        }
    }

    async clickSetOpinion() {
        if (await this._setOpinionBtn().isVisible({ timeout: 5000 }).catch(() => false)) {
            await this._setOpinionBtn().click({ force: true });
            await this.page.waitForURL(/properties.*\/\d+|property-detail|set-opinion/i, { timeout: 20000 }).catch(() => {});
            await this.wait(4000);
        }
    }

    // ─── Getters for assertion use in spec (returns locator) ───────
    getMarketFeaturesDialogTitleLocator() {
        return this._marketFeaturesTitle();
    }

    getYFactorsHeaderLocator() {
        return this._yFactorsHeader();
    }

    getYFactorConfigTextLocator() {
        return this._yFactorConfigText();
    }
}
