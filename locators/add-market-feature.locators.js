// ============================================
// Page: Add New Market Feature (nested dialog)
// URL:  https://stage.crexagent.com/properties
// App:  CREX Agent (Vuetify nested dialog over Market Features Filters)
// Generated: 2026-03-29 (verified via live DOM extraction)
// ============================================
// Usage in Playwright:
//   import { getLocator } from './locators/add-market-feature.locators.js';
//   await getLocator(page, 'featureTypeSelect').click();
// ============================================

export const pageName = "Add New Market Feature Dialog";

export const pageUrl = "https://stage.crexagent.com/properties";

export const locators = {
  // ===================== Dialog Header =====================

  // Dialog title "Add New Market Feature"
  // Element: <h3 class="text-base-lg-600 text-gray-900">
  addFeatureDialogTitle: {
    selector: '.v-overlay--active h3.text-base-lg-600',
    method: 'locator',
  },

  // Subtitle "Add new market feature for applying them as a filter."
  addFeatureSubtext: {
    selector: 'Add new market feature for applying them as a filter.',
    method: 'getByText',
  },

  // Close dialog button (X icon)
  addFeatureCloseButton: {
    selector: '.v-overlay--active:has(h3:has-text("Add New Market Feature")) button.v-btn--icon',
    method: 'locator',
  },

  // ===================== Feature Type Dropdown =====================

  // Feature Type label
  featureTypeLabel: {
    selector: 'Feature Type',
    method: 'getByText',
  },

  // Feature Type v-select (click to open dropdown)
  // Uses: .v-overlay--active:has(h3) to target the nested dialog specifically
  featureTypeSelect: {
    selector: '.v-overlay--active:has(h3:has-text("Add New Market Feature")) .v-select:first-of-type',
    method: 'locator',
  },

  // ===================== Features Dropdown =====================

  // Features label
  featuresLabel: {
    selector: '.v-overlay--active:has(h3:has-text("Add New Market Feature")) label:has-text("Features")',
    method: 'locator',
  },

  // Features v-select (multi-select, disabled until Feature Type selected)
  // placeholder: "Select the relevant features"
  featuresSelect: {
    selector: '.v-overlay--active:has(h3:has-text("Add New Market Feature")) .v-select:nth-of-type(2)',
    method: 'locator',
  },

  // Features input (for placeholder check)
  featuresInput: {
    selector: 'input[placeholder="Select the relevant features"]',
    method: 'locator',
  },

  // ===================== Operator Radio Buttons =====================

  // Operator label text
  operatorLabel: {
    selector: 'Operator',
    method: 'getByText',
  },

  // AND radio button
  operatorAnd: {
    selector: '#operator-AND',
    method: 'locator',
  },

  // OR radio button
  operatorOr: {
    selector: '#operator-OR',
    method: 'locator',
  },

  // NOT radio button
  operatorNot: {
    selector: '#operator-NOT',
    method: 'locator',
  },

  // AND label (clickable)
  operatorAndLabel: {
    selector: 'label[for="operator-AND"]',
    method: 'locator',
  },

  // OR label (clickable)
  operatorOrLabel: {
    selector: 'label[for="operator-OR"]',
    method: 'locator',
  },

  // NOT label (clickable)
  operatorNotLabel: {
    selector: 'label[for="operator-NOT"]',
    method: 'locator',
  },

  // ===================== Action Buttons =====================

  // "Cancel" button in add feature dialog
  addFeatureCancelButton: {
    selector: '.v-overlay--active:has(h3:has-text("Add New Market Feature")) button:has-text("Cancel")',
    method: 'locator',
  },

  // "Add Feature" button (disabled until form is complete)
  addFeatureSubmitButton: {
    selector: 'Add Feature',
    method: 'getByRole',
    role: 'button',
  },
};

// Feature Type dropdown values (29 options)
export const featureTypeOptions = [
  'Accessibility Features', 'Appliances', 'Architectural Style',
  'Association Amenities', 'Common Interest', 'Community Features',
  'Construction Materials', 'Cooling', 'Exterior Features',
  'Foundation Details', 'Heating', 'Interior Features',
  'Levels', 'Lot Features', 'Other Structures',
  'Parking Features', 'Patio Porch Features', 'Pool Features',
  'Property Sub Type', 'Property Type', 'Road Surface Type',
  'Security Features', 'Sewer', 'Structure Type',
  'Utilities', 'View', 'Water Source',
  'Waterfront Features', 'Window Features',
];

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
