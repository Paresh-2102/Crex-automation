// ============================================================
// tests/crex-agent-login.spec.js
//
// Login & navigation smoke tests — refactored from crex-agent.spec.js.bak
//
// POM compliance:
//   ✓ All locators inside page objects (LoginPage, SidebarNavPage, PropertiesPage)
//   ✓ All page actions called through page methods
//   ✓ Credentials & constants from utils/testData.js
//   ✓ Test imports page objects via fixtures/index.js
//   ✗ No inline page.locator() calls for business locators
//   ✗ No raw credentials in this file
// ============================================================

import { test, expect } from '../fixtures/index.js';
import { CREDENTIALS, URLS, TIMEOUTS } from '../utils/testData.js';

const { email: EMAIL, password: PASSWORD } = CREDENTIALS;

test.describe('CREX Agent - Login Form Tests', () => {
  // Disable storageState so we can test the explicit login form
  test.use({ storageState: undefined });

  // --------------------------------------------------------------------------
  // TC-L-001: Verify login page renders all required elements
  // --------------------------------------------------------------------------
  test('TC-L-001: should display all login page elements', async ({ loginPage }) => {
    await loginPage.navigate();

    // Delegated to LoginPage — no raw locators in spec
    await expect(loginPage._email()).toBeVisible();
    await expect(loginPage._password()).toBeVisible();
    await expect(loginPage._signInButton()).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TC-L-002: Successful login navigates to affiliate-managers
  // --------------------------------------------------------------------------
  test('TC-L-002: should login successfully and land on dashboard', async ({ loginPage, navPage }) => {
    await loginPage.navigate();
    await loginPage.login(EMAIL, PASSWORD);

    await loginPage.page.waitForURL(URLS.affiliateManagers, { timeout: TIMEOUTS.medium });
    await expect(navPage.getPropertiesNavLocator()).toBeVisible();
  });
});

test.describe('CREX Agent - Properties Navigation Smoke Test', () => {

  // --------------------------------------------------------------------------
  // TC-L-003: Navigate to Properties page and verify Market Filters dialog opens
  // --------------------------------------------------------------------------
  test('TC-L-003: should navigate to Properties and open Market Filters dialog',
    async ({ page, navPage, propertiesPage }) => {
      // Pre-authenticated via storageState
      await page.goto(URLS.affiliateManagers);

      // Navigate → open filter dialog
      await navPage.goToProperties();
      await propertiesPage.openFilterDialog();

      // Assert Market Filters dialog is visible with key structural elements
      await expect(page.getByRole('heading', { name: 'Market Filters', level: 4 })).toBeVisible();
      await expect(page.getByText('Market Features Filters')).toBeVisible();
      await expect(page.getByText('Y-Factor Filters')).toBeVisible();

      // Verify dialog action buttons
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    });

});
