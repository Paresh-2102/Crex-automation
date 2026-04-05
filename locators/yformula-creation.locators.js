// ============================================
// Page: Settings - Y-Total - Create Market and Formula
// URL:  https://stage.crexagent.com/settings?tab=ytotal
// App:  CREX Agent (Vuetify dialog)
// Generated: 2026-04-03 (live extraction)
// ============================================
// Mandatory fields in Market Configuration:
//   1) MLS Board
//   2) State
//   3) County
//   4) Base Value
// ============================================

export const pageName = 'Settings - Y-Total - Create Market and Formula';

export const pageUrl = 'https://stage.crexagent.com/settings?tab=ytotal';

export const locators = {
  // ===================== Left Navigation / Entry =====================

  settingsNav: {
    selector: 'Settings',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Settings")',
  },

  yTotalTab: {
    selector: 'Y-Total',
    method: 'getByText',
    fallback: '[role="tab"]:has-text("Y-Total"), button:has-text("Y-Total")',
  },

  addNewFormulaButton: {
    selector: /Add New Formula/i,
    method: 'getByRole',
    role: 'button',
    fallback: 'button:has-text("Add New Formula")',
  },

  // ===================== Dialog Header =====================

  createFormulaDialogTitle: {
    selector: '.v-dialog h4.text-base-lg-600:has-text("Create Market and Formula")',
    method: 'locator',
  },

  closeDialogButton: {
    selector: '.v-dialog button.v-btn--icon.position-absolute',
    method: 'locator',
  },

  // ===================== Wizard Tabs =====================

  marketConfigurationTab: {
    selector: '.v-dialog h6:has-text("Market Configuration")',
    method: 'locator',
  },

  marketFeaturesTab: {
    selector: '.v-dialog h6:has-text("Market Features")',
    method: 'locator',
  },

  yFactorTab: {
    selector: '.v-dialog h6:has-text("Y Factor")',
    method: 'locator',
  },

  // ===================== Market Configuration Fields =====================

  mlsBoardInput: {
    selector: 'Select MLS Board',
    method: 'getByPlaceholder',
    fallback: '.v-dialog input[placeholder="Select MLS Board"]',
  },

  stateInput: {
    selector: 'Select State',
    method: 'getByPlaceholder',
    fallback: '.v-dialog input[placeholder="Select State"]',
  },

  countyInput: {
    selector: 'Select County',
    method: 'getByPlaceholder',
    fallback: '.v-dialog input[placeholder="Select County"]',
  },

  cityInput: {
    selector: 'Select City',
    method: 'getByPlaceholder',
    fallback: '.v-dialog input[placeholder="Select City"]',
  },

  schoolDistrictInput: {
    selector: 'Select School District',
    method: 'getByPlaceholder',
    fallback: '.v-dialog input[placeholder="Select School District"]',
  },

  zipCodeInput: {
    selector: 'Select Zip Code',
    method: 'getByPlaceholder',
    fallback: '.v-dialog input[placeholder="Select Zip Code"]',
  },

  baseValueInput: {
    selector: 'input[placeholder="Enter base value"], div[placeholder="Enter base value"] input, .v-dialog [placeholder="Enter base value"] input',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Enter base value"]',
  },

  mlsBoardLabelRequired: {
    selector: 'Select the MLS Board *',
    method: 'getByText',
  },

  stateLabelRequired: {
    selector: 'Select the State *',
    method: 'getByText',
  },

  countyLabelRequired: {
    selector: 'Select the County *',
    method: 'getByText',
  },

  baseValueLabelRequired: {
    selector: 'Base Value *',
    method: 'getByText',
  },

  // ===================== Market Features / Y Factor Sections =====================

  marketFeaturesHeading: {
    selector: 'Market Features',
    method: 'getByText',
    fallback: '.v-dialog h6:has-text("Market Features")',
  },

  addNewMarketFeatureButton: {
    selector: /Add New Market Feature/i,
    method: 'getByRole',
    role: 'button',
    fallback: 'button:has-text("Add New Market Feature")',
  },

  yFactorHeading: {
    selector: 'Y Factor',
    method: 'getByText',
    fallback: '.v-dialog h6:has-text("Y Factor")',
  },

  // ===================== Action Buttons =====================

  cancelButton: {
    selector: '.v-dialog button:has-text("Cancel")',
    method: 'locator',
  },

  previousButton: {
    selector: '.v-dialog button:has-text("Previous")',
    method: 'locator',
    fallback: 'button:has-text("Previous")',
  },

  nextButton: {
    selector: '.v-dialog button:has-text("Next")',
    method: 'locator',
  },

  addButton: {
    selector: '.v-dialog button:has-text("Add")',
    method: 'locator',
    fallback: 'button.bg-primary:has-text("Add"), button:has-text("Add")',
  },

  // 3rd icon button in each table row's action cell (0-indexed = 2).
  // Icon order per row: [0] edit/pencil · [1] eye/view · [2] search/magnifying-glass · [3] delete/trash(btn-error)
  // The search button navigates to the Properties page with the formula applied.
  rowSearchButton: {
    selector: 'table tbody tr:first-child td:last-child button:nth-child(3)',
    method: 'locator',
  },
};

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
      return page.getByText(loc.selector, { exact: true });
    case 'locator':
      return page.locator(loc.selector);
    default:
      return page.locator(loc.selector);
  }
}
