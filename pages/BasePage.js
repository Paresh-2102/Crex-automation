import { expect } from '@playwright/test';

/**
 * BasePage — shared utilities for all page objects.
 * Contains only actions/helpers; no assertions.
 */
export class BasePage {
    constructor(page) {
        this.page = page;
    }

    /** Simple delay helper */
    async wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /** Remove Vuetify overlay scrims that block clicks */
    async removeOverlayScrim() {
        await this.page.evaluate(() => {
            document.querySelectorAll('.v-overlay__scrim').forEach(el => el.remove());
        });
    }

    /**
     * Select an option from a Vuetify v-autocomplete dropdown.
     * Strategy: fill() first, fall back to pressSequentially.
     */
    async selectDropdownOption(inputSelector, value) {
        if (!value) return;
        const input = this.page.locator(inputSelector);
        await input.click({ force: true });
        await this.wait(1000);
        await input.fill(value);
        await this.wait(2000);

        const dropdownItems = this.page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
        const matchingOption = dropdownItems.filter({ hasText: value });

        if (await matchingOption.count() > 0) {
            await matchingOption.first().click();
            await this.wait(2000);
            return;
        }

        // fall back to slow typing
        await input.clear();
        await this.wait(500);
        await input.click({ force: true });
        await this.wait(1000);
        await input.pressSequentially(value, { delay: 100 });
        await this.wait(3000);

        const retryMatch = this.page
            .locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item')
            .filter({ hasText: value });

        if (await retryMatch.count() > 0) {
            await retryMatch.first().click();
            await this.wait(2000);
        } else {
            await this.page.keyboard.press('Enter');
            await this.wait(2000);
        }
    }

    /**
     * Select exact value from a dialog dropdown (safe – never presses Escape).
     */
    async selectDialogDropdownOption(placeholder, value) {
        const input = this.page
            .locator(`.v-dialog input[placeholder="${placeholder}"]`)
            .first();
        await expect(input).toBeVisible({ timeout: 10000 });
        await expect(input).toBeEnabled({ timeout: 15000 });

        await input.click({ force: true });
        await this.wait(1000);
        await input.fill(value);
        await this.wait(2000);

        const overlay = this.page.locator('.v-overlay--active .v-list-item, .v-menu__content .v-list-item');
        const option = overlay.filter({ hasText: value }).first();

        if (await option.count() > 0) {
            await expect(option).toBeVisible({ timeout: 5000 });
            await option.click({ force: true });
            await this.wait(800);
            return;
        }

        await input.clear();
        await this.wait(500);
        await input.click({ force: true });
        await this.wait(1000);
        await input.pressSequentially(value, { delay: 100 });
        await this.wait(3000);

        if (await option.count() > 0) {
            await option.click({ force: true });
            await this.wait(800);
        } else {
            await this.page.keyboard.press('Enter');
            await this.wait(1000);
        }
    }

    /** Wait for a loading spinner to disappear */
    async waitForLoadingSpinnerToHide(timeout = 30000) {
        try {
            await this.page
                .locator('.v-progress-circular, .mdi-loading, [class*="loading"]')
                .first()
                .waitFor({ state: 'hidden', timeout });
        } catch { /* spinner may never appear */ }
    }

    /** Scroll all overflow containers in dialog to bottom */
    async scrollDialogToBottom() {
        await this.page.evaluate(() => {
            ['.v-overlay__content', '.v-dialog', '.v-dialog > div',
                '.v-dialog .v-card', '.v-dialog .v-card-text', '.v-dialog .v-sheet'
            ].forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
                });
            });
        });
        await this.wait(800);
    }

    /**
     * Read a numeric value displayed near a label text on page.
     */
    async findValueNearLabel(labelRegex) {
        return await this.page.evaluate((re) => {
            const allEls = [...document.querySelectorAll('*')];
            const labelEl = allEls.find(el =>
                new RegExp(re, 'i').test(el.innerText?.trim()) &&
                el.children.length < 4 &&
                el.tagName !== 'BODY' && el.tagName !== 'HTML'
            );
            if (!labelEl) return null;
            const parent = labelEl.parentElement;
            if (parent) {
                const siblings = [...parent.children];
                const idx = siblings.indexOf(labelEl);
                for (let i = idx + 1; i < siblings.length; i++) {
                    const text = siblings[i].innerText?.trim().replace(/[$,\s]/g, '');
                    if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
                }
                const pNext = parent.nextElementSibling;
                if (pNext) {
                    const text = pNext.innerText?.trim().replace(/[$,\s]/g, '');
                    if (text && /^-?[\d.]+$/.test(text)) return parseFloat(text);
                }
            }
            return null;
        }, labelRegex.source);
    }
}
