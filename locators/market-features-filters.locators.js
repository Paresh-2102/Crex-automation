// ============================================
// Page: Properties - Market Features Filters
// URL:  https://stage.crexagent.com/properties
// App:  CREX Agent (Vuetify dialog - second tab)
// Generated: 2026-03-29
// Updated:   2026-03-29 (verified via live DOM extraction)
// ============================================
// Usage in Playwright:
//   import { locators, getLocator } from './locators/market-features-filters.locators.js';
//   await getLocator(page, 'addNewMarketFeatureButton').click();
//   await getLocator(page, 'nextButton').click();
// ============================================

export const pageName = "Properties - Market Features Filters";

export const pageUrl = "https://stage.crexagent.com/properties";

export const locators = {
  // ===================== Dialog Header =====================

  // Dialog title "Market Features Filters"
  // Element: <h4 class="text-base-lg-600 text-gray-900">
  marketFeaturesDialogTitle: {
    selector: '.v-dialog h4.text-base-lg-600',
    method: 'locator',
  },

  // Close button (X icon) to dismiss dialog
  // Element: <button class="v-btn v-btn--icon ... position-absolute top-0 right-0">
  dialogCloseButton: {
    selector: '.v-dialog button.v-btn--icon.position-absolute',
    method: 'locator',
  },

  // ===================== Tabs (h6 elements) =====================

  // "Market Filters" tab (first tab - goes back to location/price filters)
  // Element: <h6 class="text-base-sm-600 text-brand-700">Market Filters</h6>
  marketFiltersTab: {
    selector: '.v-dialog h6.text-base-sm-600:has-text("Market Filters"):not(:has-text("Features"))',
    method: 'locator',
  },

  // "Market Features Filters" tab (second tab - current/active page)
  // Element: <h6 class="text-base-sm-600 text-brand-700">Market Features Filters</h6>
  marketFeaturesFiltersTab: {
    selector: '.v-dialog h6.text-base-sm-600:has-text("Market Features Filters")',
    method: 'locator',
  },

  // "Y-Factor Filters" tab (third tab)
  // Element: <h6 class="text-base-sm-600 text-gray-700">Y-Factor Filters</h6>
  yFactorFiltersTab: {
    selector: '.v-dialog h6.text-base-sm-600:has-text("Y-Factor Filters")',
    method: 'locator',
  },

  // ===================== Market Features Section =====================

  // "Market Features" section heading
  // Element: <h5 class="text-base-xl-600 text-gray-900">
  marketFeaturesHeading: {
    selector: '.v-dialog h5.text-base-xl-600',
    method: 'locator',
  },

  // "Add New Market Feature" button (top right, outlined)
  // Element: <button class="v-btn ... v-btn--variant-outlined text-capitalize">
  addNewMarketFeatureButton: {
    selector: 'Add New Market Feature',
    method: 'getByRole',
    role: 'button',
  },

  // ===================== Features Table =====================

  // "Feature Type" column header
  // Element: <th class="table-header">
  featureTypeHeader: {
    selector: '.v-dialog th.table-header:has-text("Feature Type")',
    method: 'locator',
  },

  // "Features" column header
  // Element: <th class="table-header">
  featuresHeader: {
    selector: '.v-dialog th.table-header:has-text("Features"):not(:has-text("Feature Type"))',
    method: 'locator',
  },

  // "Description" column header
  // Element: <th class="table-header">
  descriptionHeader: {
    selector: '.v-dialog th.table-header:has-text("Description")',
    method: 'locator',
  },

  // "Actions" column header
  // Element: <th class="table-header text-right">
  actionsHeader: {
    selector: '.v-dialog th.table-header:has-text("Actions")',
    method: 'locator',
  },

  // ===================== Empty State =====================

  // "No market features added yet." text when table is empty
  // Element: <td class="text-center pa-8">
  emptyStateText: {
    selector: 'No market features added yet.',
    method: 'getByText',
  },

  // "Add Your First Feature" button in empty state
  // Element: <button class="v-btn ... v-btn--size-small v-btn--variant-outlined mt-4 text-capitalize">
  addFirstFeatureButton: {
    selector: 'Add Your First Feature',
    method: 'getByRole',
    role: 'button',
  },

  // ===================== Navigation Buttons =====================

  // "Previous" button - goes back to Market Filters tab
  // Element: <button class="v-btn ... v-btn--variant-outlined">
  previousButton: {
    selector: 'Previous',
    method: 'getByRole',
    role: 'button',
  },

  // "Cancel" button - dismisses the dialog
  // Element: <button class="v-btn ... v-btn--variant-outlined">
  cancelButton: {
    selector: 'Cancel',
    method: 'getByRole',
    role: 'button',
  },

  // "Next" button - goes to Y-Factor Filters tab
  // Element: <button class="v-btn v-btn--elevated ... bg-primary">
  nextButton: {
    selector: 'Next',
    method: 'getByRole',
    role: 'button',
  },
};

// Helper: get Playwright locator from page
export function getLocator(page, name) {
  const loc = locators[name];
  if (!loc) throw new Error(`Locator "${name}" not found in ${pageName}`);
  switch (loc.method) {
    case 'getByRole':      return page.getByRole(loc.role, { name: loc.selector });
    case 'getByTestId':    return page.getByTestId(loc.selector);
    case 'getByLabel':     return page.getByLabel(loc.selector);
    case 'getByPlaceholder': return page.getByPlaceholder(loc.selector);
    case 'getByText':      return page.getByText(loc.selector);
    case 'locator':        return page.locator(loc.selector);
    default:               return page.locator(loc.selector);
  }
}
