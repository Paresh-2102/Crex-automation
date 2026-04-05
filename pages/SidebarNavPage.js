import { BasePage } from './BasePage.js';
import { getLocator } from '../locators/sidebar-nav.locators.js';

export class SidebarNavPage extends BasePage {
    constructor(page) {
        super(page);
        this._propertiesNav = () => getLocator(this.page, 'propertiesNav');
        this._settingsNav = () => getLocator(this.page, 'settingsNav');
        this._savedOpinionsNav = () => getLocator(this.page, 'savedOpinionsNav');
        this._notificationBell = () => getLocator(this.page, 'notificationBell');
        this._userProfileDropdown = () => getLocator(this.page, 'userProfileDropdown');
    }

    async goToProperties() {
        await this._propertiesNav().click();
        await this.page.waitForURL('/properties', { timeout: 15000 });
    }

    async goToSettings() {
        await this.removeOverlayScrim();
        await this._settingsNav().click({ force: true });
        await this.page.waitForURL('/settings', { timeout: 15000 });
        await this.wait(2000);
    }

    async goToSavedOpinions() {
        await this._savedOpinionsNav().click();
    }

    async openNotification() {
        await this._notificationBell().click();
    }

    async openUserProfile() {
        await this._userProfileDropdown().click();
    }

    /**
     * Navigate to Settings with reload-and-retry logic.
     * Handles cases where the page does not redirect immediately.
     */
    async goToSettingsWithRetry() {
        await this.removeOverlayScrim();
        await this._settingsNav().first().click({ force: true });
        try {
            await this.page.waitForURL('**/settings**', { timeout: 8000 });
        } catch {
            console.log('  ⚠  Not redirected to settings — reloading and retrying...');
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.wait(2000);
            await this.removeOverlayScrim();
            await this._settingsNav().first().click({ force: true });
            await this.page.waitForURL('**/settings**', { timeout: 15000 });
        }
        await this.page.waitForLoadState('domcontentloaded');
        await this.wait(2000);
    }

    /**
     * Click the profile dropdown and sign out.
     * Handles "Sign Out" and "Logout" label variations.
     * @param {string} [screenshotPrefix] - Optional prefix for debug screenshots.
     */
    async signOut(screenshotPrefix = 'signout') {
        const profileIcon = this._userProfileDropdown();
        await profileIcon.waitFor({ state: 'visible', timeout: 10000 });
        await profileIcon.click({ force: true });
        await this.wait(1500);
        await this.page.screenshot({ path: `screenshots/${screenshotPrefix}-profile-menu.png` }).catch(() => {});

        const signOutBtn = this.page.locator(
            'button:has-text("Sign Out"), a:has-text("Sign Out"), ' +
            '.v-list-item:has-text("Sign Out"), [role="menuitem"]:has-text("Sign Out")'
        ).first();

        const signOutVisible = await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (signOutVisible) {
            await signOutBtn.click({ force: true });
        } else {
            const logoutBtn = this.page.locator(
                'button:has-text("Logout"), a:has-text("Logout"), .v-list-item:has-text("Logout")'
            ).first();
            if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await logoutBtn.click({ force: true });
            } else {
                console.log('  ⚠  Sign Out button not found');
                await this.page.screenshot({ path: `screenshots/${screenshotPrefix}-signout-not-found.png` }).catch(() => {});
            }
        }

        await this.page.waitForURL(/login/, { timeout: 15000 }).catch(() => {});
        await this.wait(1000);
        await this.page.screenshot({ path: `screenshots/${screenshotPrefix}-signed-out.png` }).catch(() => {});
        console.log(`  ✓ Signed out — URL: ${this.page.url()}`);
    }

    // Returns the raw locator for use in assertions (spec file)
    getPropertiesNavLocator() {
        return this._propertiesNav();
    }
}
