import { BasePage } from './BasePage.js';
import { getLocator } from '../locators/login-page.locators.js';

export class LoginPage extends BasePage {
    constructor(page) {
        super(page);
        // Locators defined here — never exposed to spec files
        this._email = () => getLocator(this.page, 'emailInput');
        this._password = () => getLocator(this.page, 'passwordInput');
        this._signInButton = () => getLocator(this.page, 'signInButton');
    }

    async navigate() {
        await this.page.goto('/login');
    }

    async fillEmail(email) {
        await this._email().fill(email);
    }

    async fillPassword(password) {
        await this._password().fill(password);
    }

    async clickSignIn() {
        await this._signInButton().click();
    }

    async login(email, password) {
        await this._email().fill(email);
        await this._password().fill(password);
        await this._signInButton().click();
    }
}
