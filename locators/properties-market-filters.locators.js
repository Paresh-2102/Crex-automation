// ============================================
// Page: Properties - Market Filters
// URL:  https://stage.crexagent.com/properties
// App:  CREX Agent (Vuetify dialog with combobox fields)
// Generated: 2026-03-29
// ============================================
// Usage in Playwright:
//   import { locators, getLocator } from './locators/properties-market-filters.locators.js';
//   await getLocator(page, 'mlsBoardDropdown').click();
//   await getLocator(page, 'stateDropdown').click();
//   await getLocator(page, 'minPriceInput').fill('100000');
//   await getLocator(page, 'nextButton').click();
// ============================================

export const pageName = "Properties - Market Filters";

export const pageUrl = "https://stage.crexagent.com/properties";

export const locators = {
  // ===================== Header / Dialog Controls =====================

  // "Filter By" button in the Properties page header (opens Market Filters dialog)
  // Element: <button>
  // Label: Filter By
  filterByButton: {
    selector: 'Filter By',
    method: 'getByText',
    fallback: 'button:has-text("Filter By")',
  },

  // "Set Opinion" button at bottom-right of Properties page
  // Element: <button>
  // Label: Set Opinion
  setOpinionButton: {
    selector: 'Set Opinion',
    method: 'getByText',
    fallback: 'button:has-text("Set Opinion")',
  },

  // Market Filters dialog modal heading (h4 level)
  // Element: <h4> inside dialog header
  // Label: Market Filters
  marketFiltersDialogTitle: {
    selector: 'dialog >> h4:has-text("Market Filters")',
    method: 'locator',
    fallback: '.v-dialog h4:has-text("Market Filters")',
  },

  // Close button (X icon) to dismiss the Market Filters dialog
  // Element: <button> | Icon button
  dialogCloseButton: {
    selector: '.v-overlay--active button.v-btn--icon:first-child',
    method: 'locator',
  },

  // ===================== Filter Tabs =====================

  // "Market Filters" tab (first tab) - shows location & price filters
  // Element: <h6> heading inside dialog tab bar
  // Label: Market Filters
  marketFiltersTab: {
    selector: 'dialog >> heading:has-text("Market Filters"):nth-match(:text("Market Filters"), 2)',
    method: 'locator',
    fallback: '.v-dialog h6:has-text("Market Filters")',
  },

  // "Market Features Filters" tab (second tab) - shows property feature filters
  // Element: <h6> heading inside dialog tab bar
  // Label: Market Features Filters
  marketFeaturesFiltersTab: {
    selector: 'Market Features Filters',
    method: 'getByText',
    fallback: '.v-dialog h6:has-text("Market Features Filters")',
  },

  // "Y-Factor Filters" tab (third tab) - shows Y-factor analysis filters
  // Element: <h6> heading inside dialog tab bar
  // Label: Y-Factor Filters
  yFactorFiltersTab: {
    selector: 'Y-Factor Filters',
    method: 'getByText',
    fallback: '.v-dialog h6:has-text("Y-Factor Filters")',
  },

  // ===================== Market Filters - Dropdown Fields =====================

  // MLS Board dropdown (required *) - Select the MLS Board for property search
  // Element: <input> | Role: combobox (Vuetify v-autocomplete)
  // Label: MLS Board *
  mlsBoardDropdown: {
    selector: 'input[placeholder="Select MLS Board"]',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Select MLS Board"]',
  },

  // State dropdown (required *) - Select the state for property search
  // Element: <input> | Role: combobox (Vuetify v-autocomplete, disabled until MLS Board selected)
  // Label: State *
  stateDropdown: {
    selector: '.v-dialog :text("State *") >> .. >> .. >> input',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Select State"]',
  },

  // County dropdown (required *) - Select the county for property search
  // Element: <input> | Role: combobox (disabled until State selected)
  // Label: County *
  countyDropdown: {
    selector: '.v-dialog :text("County *") >> .. >> .. >> input',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Select County"]',
  },

  // City dropdown (optional) - Select the city for property search
  // Element: <input> | Role: combobox (disabled until County selected)
  // Label: City
  cityDropdown: {
    selector: '.v-dialog :text-is("City") >> .. >> .. >> input',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Select Cities"]',
  },

  // School District dropdown (optional) - Select school district for property search
  // Element: <input> | Role: combobox (disabled until County selected)
  // Label: School District
  schoolDistrictDropdown: {
    selector: '.v-dialog :text("School District") >> .. >> .. >> input',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Select School Districts"]',
  },

  // Zip Code dropdown (optional) - Select zip code for property search
  // Element: <input> | Role: combobox (disabled until County selected)
  // Label: Zip Code
  zipCodeDropdown: {
    selector: '.v-dialog :text("Zip Code") >> .. >> .. >> input',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Select Zip Codes"]',
  },

  // Property Status dropdown (optional) - Filter by property listing status
  // Element: <input> | Role: combobox (Vuetify v-autocomplete)
  // Label: Property Status
  propertyStatusDropdown: {
    selector: 'input[placeholder="Select property status"]',
    method: 'locator',
    fallback: '.v-dialog input[placeholder="Select property status"]',
  },

  // ===================== Market Filters - Date Range =====================

  // Date Range start (required *) - From date for property listing date filter
  // Element: <input> | Type: text
  // Label: Date Range * (From)
  dateRangeFrom: {
    selector: 'From Date',
    method: 'getByPlaceholder',
    fallback: 'input[placeholder="From Date"]',
  },

  // Date Range end (required *) - To date for property listing date filter
  // Element: <input> | Type: text
  // Label: Date Range * (To)
  dateRangeTo: {
    selector: 'To Date',
    method: 'getByPlaceholder',
    fallback: 'input[placeholder="To Date"]',
  },

  // Clear/reset "From Date" value (X button next to From Date)
  // Element: <button> | icon
  dateFromClearButton: {
    selector: '.v-overlay--active input[placeholder="From Date"] ~ button, .v-overlay--active .v-field:has(input[placeholder="From Date"]) .v-icon--clickable',
    method: 'locator',
  },

  // Clear/reset "To Date" value (X button next to To Date)
  // Element: <button> | icon
  dateToClearButton: {
    selector: '.v-overlay--active input[placeholder="To Date"] ~ button, .v-overlay--active .v-field:has(input[placeholder="To Date"]) .v-icon--clickable',
    method: 'locator',
  },

  // ===================== Market Filters - Price Range =====================

  // Minimum price input (optional) - Lower bound of price filter
  // Element: <input> | Type: text
  // Label: Price Range (Min)
  minPriceInput: {
    selector: 'Min Price',
    method: 'getByPlaceholder',
    fallback: 'input[placeholder="Min Price"]',
  },

  // Maximum price input (optional) - Upper bound of price filter
  // Element: <input> | Type: text
  // Label: Price Range (Max)
  maxPriceInput: {
    selector: 'Max Price',
    method: 'getByPlaceholder',
    fallback: 'input[placeholder="Max Price"]',
  },

  // ===================== Market Filters - Action Buttons =====================

  // Cancel button to dismiss the Market Filters dialog without applying
  // Element: <button>
  // Label: Cancel
  cancelButton: {
    selector: 'Cancel',
    method: 'getByRole',
    role: 'button',
    fallback: '.v-overlay--active button:has-text("Cancel")',
  },

  // Next button to proceed to the next filter step (disabled until required fields filled)
  // Element: <button>
  // Label: Next
  nextButton: {
    selector: 'Next',
    method: 'getByRole',
    role: 'button',
    fallback: '.v-overlay--active button:has-text("Next")',
  },

  // ===================== Field Labels (for label-based assertions) =====================

  // "MLS Board *" label text
  mlsBoardLabel: {
    selector: 'MLS Board *',
    method: 'getByText',
    fallback: 'label:has-text("MLS Board")',
  },

  // "State *" label text
  stateLabel: {
    selector: 'State *',
    method: 'getByText',
    fallback: 'label:has-text("State")',
  },

  // "County *" label text
  countyLabel: {
    selector: 'County *',
    method: 'getByText',
    fallback: 'label:has-text("County")',
  },

  // "City" label text
  cityLabel: {
    selector: 'City',
    method: 'getByText',
    fallback: 'label:has-text("City")',
  },

  // "School District" label text
  schoolDistrictLabel: {
    selector: 'School District',
    method: 'getByText',
    fallback: 'label:has-text("School District")',
  },

  // "Zip Code" label text
  zipCodeLabel: {
    selector: 'Zip Code',
    method: 'getByText',
    fallback: 'label:has-text("Zip Code")',
  },

  // "Property Status" label text
  propertyStatusLabel: {
    selector: 'Property Status',
    method: 'getByText',
    fallback: 'label:has-text("Property Status")',
  },

  // "Date Range *" label text
  dateRangeLabel: {
    selector: 'Date Range *',
    method: 'getByText',
    fallback: 'label:has-text("Date Range")',
  },

  // "Price Range" label text
  priceRangeLabel: {
    selector: 'Price Range',
    method: 'getByText',
    fallback: 'label:has-text("Price Range")',
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
