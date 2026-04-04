// ============================================
// Page: Y-Factor Filters (third tab in filter dialog)
// URL:  https://stage.crexagent.com/properties
// App:  CREX Agent (Vuetify dialog - third tab)
// Generated: 2026-03-29 (verified via live DOM extraction)
// ============================================
// Usage in Playwright:
//   import { getLocator, getYFactorMinInput, getYFactorMaxInput } from './locators/yfactor-filters.locators.js';
//   await getLocator(page, 'applyFiltersButton').click();
//   await getYFactorMinInput(page, 0).fill('2');   // Bedrooms Total min
//   await getYFactorMaxInput(page, 0).fill('5');   // Bedrooms Total max
// ============================================

export const pageName = "Properties - Y-Factor Filters";

export const pageUrl = "https://stage.crexagent.com/properties";

export const locators = {
  // ===================== Dialog Header =====================

  // Dialog title "Y-Factor Filters"
  // Element: <h4 class="text-base-lg-600 text-gray-900">
  yFactorDialogTitle: {
    selector: '.v-dialog h4.text-base-lg-600',
    method: 'locator',
  },

  // Subtitle "Configure Y-factor filters for your property search"
  yFactorSubtext: {
    selector: 'Configure Y-factor filters for your property search',
    method: 'getByText',
  },

  // Close dialog button (X icon)
  dialogCloseButton: {
    selector: '.v-dialog button.v-btn--icon.position-absolute',
    method: 'locator',
  },

  // ===================== Tabs =====================

  // "Market Filters" tab (first tab)
  marketFiltersTab: {
    selector: '.v-dialog h6.text-base-sm-600:has-text("Market Filters"):not(:has-text("Features"))',
    method: 'locator',
  },

  // "Market Features Filters" tab (second tab)
  marketFeaturesFiltersTab: {
    selector: '.v-dialog h6.text-base-sm-600:has-text("Market Features Filters")',
    method: 'locator',
  },

  // "Y-Factor Filters" tab (third tab - current)
  yFactorFiltersTab: {
    selector: '.v-dialog h6.text-base-sm-600:has-text("Y-Factor Filters")',
    method: 'locator',
  },

  // ===================== Y-Factor Table Headers =====================

  // "Y-factors" column header
  yFactorsHeader: {
    selector: '.v-dialog th.table-header:has-text("Y-factors")',
    method: 'locator',
  },

  // "Min Unit Value" column header
  minUnitValueHeader: {
    selector: '.v-dialog th.table-header:has-text("Min Unit Value")',
    method: 'locator',
  },

  // "Max Unit Value" column header
  maxUnitValueHeader: {
    selector: '.v-dialog th.table-header:has-text("Max Unit Value")',
    method: 'locator',
  },

  // ===================== Y-Factor Row Labels =====================
  // Each row has: <span class="text-base-md-600">Name</span>
  //               <p class="text-base-xs text-gray-600">Description</p>

  // Row 0: Bedrooms Total
  bedroomsTotalLabel: {
    selector: 'Bedrooms Total',
    method: 'getByText',
    exact: true,
  },

  // Row 1: Bathrooms Total
  bathroomsTotalLabel: {
    selector: 'Bathrooms Total',
    method: 'getByText',
    exact: true,
  },

  // Row 2: Site Area
  siteAreaLabel: {
    selector: 'Site Area',
    method: 'getByText',
    exact: true,
  },

  // Row 3: Finished Sq Ft
  finishedSqFtLabel: {
    selector: 'Finished Sq Ft',
    method: 'getByText',
    exact: true,
  },

  // Row 4: Year Built
  yearBuiltLabel: {
    selector: 'Year Built',
    method: 'getByText',
    exact: true,
  },

  // Row 5: Stories
  storiesLabel: {
    selector: 'Stories',
    method: 'getByText',
    exact: true,
  },

  // Row 6: Garage Spaces
  garageSpacesLabel: {
    selector: 'Garage Spaces',
    method: 'getByText',
    exact: true,
  },

  // Row 7: Fireplaces Total
  fireplacesTotalLabel: {
    selector: 'Fireplaces Total',
    method: 'getByText',
    exact: true,
  },

  // Row 8: Association YN (Yes/No select)
  associationYnLabel: {
    selector: 'Association YN',
    method: 'getByText',
    exact: true,
  },

  // Row 9: Cooling YN (Yes/No select)
  coolingYnLabel: {
    selector: 'Cooling YN',
    method: 'getByText',
    exact: true,
  },

  // ===================== Min/Max Inputs (rows 0-7) =====================
  // Rows 0-7 each have:  input[placeholder="Enter Min Value"] and input[placeholder="Enter Max Value"]
  // Total: 16 text inputs (8 min + 8 max), accessed by nth() index
  // Use getYFactorMinInput(page, rowIndex) / getYFactorMaxInput(page, rowIndex) helpers below

  // All Min Value inputs (generic locator — use .nth(index) for specific row)
  allMinValueInputs: {
    selector: '.v-dialog input[placeholder="Enter Min Value"]',
    method: 'locator',
  },

  // All Max Value inputs (generic locator — use .nth(index) for specific row)
  allMaxValueInputs: {
    selector: '.v-dialog input[placeholder="Enter Max Value"]',
    method: 'locator',
  },

  // ===================== Yes/No Selects (rows 8-9) =====================
  // Rows 8-9: Association YN and Cooling YN use combobox with placeholder "Select Yes/No"

  // Association YN select (first "Select Yes/No" input)
  associationYnSelect: {
    selector: '.v-dialog input[placeholder="Select Yes/No"]',
    method: 'locator',
    nthIndex: 0,
  },

  // Cooling YN select (second "Select Yes/No" input)
  coolingYnSelect: {
    selector: '.v-dialog input[placeholder="Select Yes/No"]',
    method: 'locator',
    nthIndex: 1,
  },

  // ===================== Navigation Buttons =====================

  // "Previous" button - goes back to Market Features Filters
  previousButton: {
    selector: 'Previous',
    method: 'getByRole',
    role: 'button',
  },

  // "Reset All Filters" button
  resetAllFiltersButton: {
    selector: 'Reset All Filters',
    method: 'getByRole',
    role: 'button',
  },

  // "Apply Filters" button (primary action — submits all 3 tabs)
  applyFiltersButton: {
    selector: 'Apply Filters',
    method: 'getByRole',
    role: 'button',
  },
};

// Y-Factor row names in display order (10 factors)
export const yFactorNames = [
  'Bedrooms Total',       // Row 0 — min/max text
  'Bathrooms Total',      // Row 1 — min/max text
  'Site Area',            // Row 2 — min/max text
  'Finished Sq Ft',       // Row 3 — min/max text
  'Year Built',           // Row 4 — min/max text
  'Stories',              // Row 5 — min/max text
  'Garage Spaces',        // Row 6 — min/max text
  'Fireplaces Total',     // Row 7 — min/max text
  'Association YN',       // Row 8 — Yes/No select
  'Cooling YN',           // Row 9 — Yes/No select
];

// Indices of rows that use Yes/No selects instead of text inputs
export const yesNoRowIndices = [8, 9];

/**
 * Helper: get a Min Value input for a specific Y-factor row (rows 0-7).
 * @param {import('@playwright/test').Page} page
 * @param {number} rowIndex - 0=Bedrooms, 1=Bathrooms, ..., 7=Fireplaces
 */
export function getYFactorMinInput(page, rowIndex) {
  return page.locator('.v-dialog input[placeholder="Enter Min Value"]').nth(rowIndex);
}

/**
 * Helper: get a Max Value input for a specific Y-factor row (rows 0-7).
 * @param {import('@playwright/test').Page} page
 * @param {number} rowIndex - 0=Bedrooms, 1=Bathrooms, ..., 7=Fireplaces
 */
export function getYFactorMaxInput(page, rowIndex) {
  return page.locator('.v-dialog input[placeholder="Enter Max Value"]').nth(rowIndex);
}

/**
 * Helper: get a Yes/No select for Association YN or Cooling YN.
 * @param {import('@playwright/test').Page} page
 * @param {number} selectIndex - 0=Association YN, 1=Cooling YN
 */
export function getYFactorYesNoSelect(page, selectIndex) {
  return page.locator('.v-dialog input[placeholder="Select Yes/No"]').nth(selectIndex);
}

// Helper: get Playwright locator from page by name
export function getLocator(page, name) {
  const loc = locators[name];
  if (!loc) throw new Error(`Locator "${name}" not found in ${pageName}`);
  switch (loc.method) {
    case 'getByRole':
      return page.getByRole(loc.role, { name: loc.selector });
    case 'getByTestId':
      return page.getByTestId(loc.selector);
    case 'getByLabel':
      return page.getByLabel(loc.selector);
    case 'getByPlaceholder':
      return page.getByPlaceholder(loc.selector);
    case 'getByText':
      return loc.exact
        ? page.getByText(loc.selector, { exact: true })
        : page.getByText(loc.selector);
    case 'locator':
      return loc.nthIndex !== undefined
        ? page.locator(loc.selector).nth(loc.nthIndex)
        : page.locator(loc.selector);
    default:
      return page.locator(loc.selector);
  }
}
