// ============================================================
// fixtures/index.js
// Playwright custom fixtures — inject page-object instances
// into every test automatically.
//
// Usage in spec files:
//   import { test, expect } from '../fixtures/index.js';
//
//   test('my test', async ({ loginPage, navPage, propertiesPage }) => {
//     await loginPage.navigate();
//     await loginPage.login(EMAIL, PASSWORD);
//   });
//
// Rules:
//   ✓ Each fixture creates and returns exactly one page object
//   ✓ Fixtures are scoped to 'test' (recreated per test)
//   ✗ No assertions here — assertions belong in spec files
//   ✗ No locators here — locators belong in page objects
// ============================================================

import { test as base } from '@playwright/test';
import { LoginPage }       from '../pages/LoginPage.js';
import { SidebarNavPage }  from '../pages/SidebarNavPage.js';
import { PropertiesPage }  from '../pages/PropertiesPage.js';
import { YFormulaPage }    from '../pages/YFormulaPage.js';
import { OpinionPage }     from '../pages/OpinionPage.js';

/**
 * @typedef {Object} PageFixtures
 * @property {LoginPage}       loginPage
 * @property {SidebarNavPage}  navPage
 * @property {PropertiesPage}  propertiesPage
 * @property {YFormulaPage}    yFormulaPage
 * @property {OpinionPage}     opinionPage
 */

export const test = base.extend({

  /** LoginPage fixture */
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  /** SidebarNavPage fixture */
  navPage: async ({ page }, use) => {
    await use(new SidebarNavPage(page));
  },

  /** PropertiesPage fixture */
  propertiesPage: async ({ page }, use) => {
    await use(new PropertiesPage(page));
  },

  /** YFormulaPage fixture */
  yFormulaPage: async ({ page }, use) => {
    await use(new YFormulaPage(page));
  },

  /** OpinionPage fixture */
  opinionPage: async ({ page }, use) => {
    await use(new OpinionPage(page));
  },

});

// Re-export expect so spec files only need one import
export { expect } from '@playwright/test';
