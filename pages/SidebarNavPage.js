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

    // Returns the raw locator for use in assertions (spec file)
    getPropertiesNavLocator() {
        return this._propertiesNav();
    }
}
