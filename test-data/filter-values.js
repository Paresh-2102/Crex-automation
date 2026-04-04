// ============================================
// Test Data: Market Filter Selected Values
// Source: https://stage.crexagent.com/properties
// Extracted: 2026-03-29
//
// Usage:
//   import { filterValues } from '../test-data/filter-values.js';
//   await page.getByText(filterValues.mlsBoard).click();
// ============================================

export const filterValues = {
  "mlsBoard": "Florida Gulf Coast MLS",
  "state": "Florida",
  "county": "Alachua",
  "city": "Alachua",
  "schoolDistrict": "No data available",
  "zipCode": "32605",
  "propertyStatus": "Closed",
  "dateRangeFrom": "Mar 28, 2025",
  "dateRangeTo": "Mar 28, 2026",
  "minPrice": "100000",
  "maxPrice": "500000"
};

// Market Features form test data
export const marketFeatureValues = {
  featureType: "Accessibility Features",   // First option from 29 Feature Types
  featureName: "Accessibility Features",   // First option from Features list (context-dependent)
  operator: "AND",                         // Default operator (AND / OR / NOT)
};

// All 29 Feature Type options
export const featureTypeOptions = [
  "Accessibility Features", "Appliances", "Architectural Style",
  "Association Amenities", "Common Interest", "Community Features",
  "Construction Materials", "Cooling", "Exterior Features",
  "Foundation Details", "Heating", "Interior Features",
  "Levels", "Lot Features", "Other Structures",
  "Parking Features", "Patio Porch Features", "Pool Features",
  "Property Sub Type", "Property Type", "Road Surface Type",
  "Security Features", "Sewer", "Structure Type",
  "Utilities", "View", "Water Source",
  "Waterfront Features", "Window Features",
];
