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

// ─── Role Credentials ─────────────────────────────────────────────────────────
export const ADMIN_CREDENTIALS = {
  email:    process.env.TEST_EMAIL    || 'zaid.m@simformsolutions.com',
  password: process.env.TEST_PASSWORD || 'Test@123',
};

export const AFM_CREDENTIALS = {
  email:    process.env.AFM_EMAIL    || 'johnyandy@yopmail.com',
  password: process.env.AFM_PASSWORD || 'Test@123',
};

export const SA_CREDENTIALS = {
  email:    process.env.SA_EMAIL    || 'Subjohny@yopmail.com',
  password: process.env.SA_PASSWORD || 'Test@123',
};

// ─── Factor Label Maps ────────────────────────────────────────────────────────
export const ADMIN_LABEL = {
  View:       'admin view',
  Condition:  'admin condition',
  Quality:    'admin quality',
  Amenities:  'admin amenities',
  Access:     'admin access',
  Appeal:     'admin appeal',
  Elevation:  'admin elevation',
  Economic:   'admin economic',
};

export const AFM_LABEL = {
  View:       'Affiliate manager view',
  Condition:  'Affiliate manager condition',
  Quality:    'Affiliate manager quality',
  Amenities:  'Affiliate manager amenities',
  Access:     'Affiliate manager access',
  Appeal:     'Affiliate manager appeal',
  Elevation:  'Affiliate manager elevation',
  Economic:   'Affiliate manager economic',
};

export const SA_LABEL = {
  View:       'sub agent view',
  Condition:  'sub agent condition',
  Quality:    'sub agent quality',
  Amenities:  'sub agent amenities',
  Access:     'sub agent access',
  Appeal:     'sub agent appeal',
  Elevation:  'sub agent elevation',
  Economic:   'sub agent economic',
};

// ─── Opinion Values ───────────────────────────────────────────────────────────
export const ADMIN_OPINION_VALUES = {
  View:       process.env.OPINION_VIEW       || '5',
  Condition:  process.env.OPINION_CONDITION  || '5',
  Quality:    process.env.OPINION_QUALITY    || '5',
  Amenities:  process.env.OPINION_AMENITIES  || '5',
  Access:     process.env.OPINION_ACCESS     || '5',
  Appeal:     process.env.OPINION_APPEAL     || '5',
  Elevation:  process.env.OPINION_ELEVATION  || '5',
  Economic:   process.env.OPINION_ECONOMIC   || '5',
};

export const AFM_OPINION_VALUES = {
  View:       process.env.AFM_OPINION_VIEW       || '6',
  Condition:  process.env.AFM_OPINION_CONDITION  || '6',
  Quality:    process.env.AFM_OPINION_QUALITY    || '6',
  Amenities:  process.env.AFM_OPINION_AMENITIES  || '6',
  Access:     process.env.AFM_OPINION_ACCESS     || '6',
  Appeal:     process.env.AFM_OPINION_APPEAL     || '6',
  Elevation:  process.env.AFM_OPINION_ELEVATION  || '6',
  Economic:   process.env.AFM_OPINION_ECONOMIC   || '6',
};

export const SA_OPINION_VALUES = {
  View:       process.env.SA_OPINION_VIEW       || '7',
  Condition:  process.env.SA_OPINION_CONDITION  || '7',
  Quality:    process.env.SA_OPINION_QUALITY    || '7',
  Amenities:  process.env.SA_OPINION_AMENITIES  || '7',
  Access:     process.env.SA_OPINION_ACCESS     || '7',
  Appeal:     process.env.SA_OPINION_APPEAL     || '7',
  Elevation:  process.env.SA_OPINION_ELEVATION  || '7',
  Economic:   process.env.SA_OPINION_ECONOMIC   || '7',
};

// ─── Opinion Result File Paths ────────────────────────────────────────────────
export const ADMIN_OPINION_RESULT_FILE      = 'output/admin-opinion-result.json';
export const AFM_OPINION_RESULT_FILE        = 'output/affiliate-manager-opinion-result.json';
export const SA_OPINION_RESULT_FILE         = 'output/sub-agent-opinion-result.json';
export const SHARED_OPINION_DATA_FILE       = 'output/shared-opinion-data.json';
export const ADMIN_OPINION_ALL_RESULTS_FILE = 'output/admin-opinion-all-results.json';
export const AFM_OPINION_ALL_RESULTS_FILE   = 'output/affiliate-manager-opinion-all-results.json';
