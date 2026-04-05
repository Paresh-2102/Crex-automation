// ============================================================
// utils/testData.js
// Central store for all static test data & constants.
//
// Rules:
//   ✓ Credentials, URLs, and lookup tables live here
//   ✓ Dynamic data (read from Excel) lives in test-data/read-excel-data.js
//   ✗ No locators — those belong in pages/ or locators/
//   ✗ No page actions — those belong in pages/
// ============================================================

// ─── Auth ────────────────────────────────────────────────────────────────────
export const CREDENTIALS = {
  email: process.env.TEST_EMAIL || '',
  password: process.env.TEST_PASSWORD || '',
};

// ─── URLs ────────────────────────────────────────────────────────────────────
export const URLS = {
  base: process.env.BASE_URL || 'https://stage.crexagent.com',
  login: '/login',
  settings: '/settings',
  settingsYTotal: '/settings?tab=ytotal',
  affiliateManagers: '/affiliate-managers',
  properties: '/properties',
};

// ─── Timeouts (ms) ───────────────────────────────────────────────────────────
export const TIMEOUTS = {
  short: 5000,
  medium: 15000,
  long: 30000,
  extraLong: 60000,
  perScenario: 5 * 60 * 1000,
};

// ─── Y-Factor Row Definitions ─────────────────────────────────────────────────
/**
 * Ordered list of numeric Y-factor rows as shown in the Create Formula wizard.
 * Used by YFormulaPage.fillYFactorRows() and TC-004 / TC-007.
 */
export const Y_FACTOR_ROWS = [
  { key: 'bedroomsTotal', base: '1', unit: '5000' },
  { key: 'bathroomsTotal', base: '1', unit: '3000' },
  { key: 'siteArea', base: '1', unit: '1000' },
  { key: 'finishedSqFt', base: '1', unit: '100' },
  { key: 'yearBuilt', base: '2000', unit: '500' },
  { key: 'stories', base: '1', unit: '2000' },
  { key: 'garageSpaces', base: '1', unit: '5000' },
  { key: 'fireplacesTotal', base: '1', unit: '3000' },
];

// ─── Y-Factor Edit — numeric factor order (TC-007) ───────────────────────────
export const NUMERIC_FACTOR_ORDER = [
  'bedroomsTotal', 'bathroomsTotal', 'siteArea', 'finishedSqFt',
  'yearBuilt', 'stories', 'garageSpaces', 'fireplacesTotal',
];

export const FACTOR_LABELS = [
  'Bedrooms Total', 'Bathrooms Total', 'Site Area', 'Finished Sq Ft',
  'Year Built', 'Stories', 'Garage Spaces', 'Fireplaces Total',
];

// ─── Yes/No Fields (TC-007) ──────────────────────────────────────────────────
export const YN_FIELDS = [
  { key: 'associationYN', label: 'Association YN', dropdownIndex: 0 },
  { key: 'coolingYN', label: 'Cooling YN', dropdownIndex: 1 },
];

// ─── Opinion Field Definitions (TC-005) ──────────────────────────────────────
export const OPINION_FIELDS = [
  { placeholder: 'Enter View Value', value: '5' },
  { placeholder: 'Enter Condition Value', value: '5' },
  { placeholder: 'Enter Quality Value', value: '5' },
  { placeholder: 'Enter Amenities Value', value: '5' },
  { placeholder: 'Enter Access Value', value: '5' },
  { placeholder: 'Enter Appeal Value', value: '5' },
  { placeholder: 'Enter Elevation Value', value: '5' },
  { placeholder: 'Enter Economic Value', value: '5' },
];

export const FACTOR_NAMES = [
  'View', 'Condition', 'Quality', 'Amenities',
  'Access', 'Appeal', 'Elevation', 'Economic',
];

export const PHOTO_FACTORS = ['View', 'Condition', 'Quality', 'Amenities'];

// ─── Output paths ─────────────────────────────────────────────────────────────
export const OUTPUT_DIR = 'output';
export const OPINION_CALC_FILE = `${OUTPUT_DIR}/opinion-calculation.json`;
