// ============================================
// Excel Data Reader for CREX Agent Automation
// Reads test input data from: test-data/filter-input-template.xlsx
//
// Usage:
//   import { readExcelData } from '../test-data/read-excel-data.js';
//   const data = await readExcelData();
//   // data.marketFilters  -> { mlsBoard, state, county, city, ... }
//   // data.marketFeatures -> [{ featureType, features, operator }, ...]
//   // data.yFactors       -> { bedroomsTotal: { min, max }, ... associationYn: 'Yes', ... }
// ============================================

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.join(__dirname, 'filter-input-template.xlsx');

/**
 * Read all test data from the Excel template file.
 * Returns an object with marketFilters, marketFeatures, and yFactors.
 */
export async function readExcelData(filePath = EXCEL_PATH) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  return {
    marketFilters: readMarketFilters(workbook),
    marketFeatures: readMarketFeatures(workbook),
    yFactors: readYFactors(workbook),
    yFormula: readYFormula(workbook),
  };
}

// =====================================================
// Sheet 1: Market Filters
// =====================================================
function readMarketFilters(workbook) {
  const sheet = workbook.getWorksheet('Market Filters');
  if (!sheet) throw new Error('Sheet "Market Filters" not found in Excel file');

  // Field mapping: Excel "Field Name" → JS key
  const fieldMap = {
    'MLS Board': 'mlsBoard',
    'State': 'state',
    'County': 'county',
    'City': 'city',
    'School District': 'schoolDistrict',
    'Zip Code': 'zipCode',
    'Property Status': 'propertyStatus',
    'Date Range From': 'dateRangeFrom',
    'Date Range To': 'dateRangeTo',
    'Min Price': 'minPrice',
    'Max Price': 'maxPrice',
  };

  const result = {};

  // Data starts at row 2 (row 1 is header)
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const fieldName = String(row.getCell(1).value || '').trim();
    const value = String(row.getCell(2).value ?? '').trim();
    const jsKey = fieldMap[fieldName];
    if (jsKey) {
      result[jsKey] = value;
    }
  });

  return result;
}

// =====================================================
// Sheet 2: Market Features Filters
// =====================================================
function readMarketFeatures(workbook) {
  const sheet = workbook.getWorksheet('Market Features Filters');
  if (!sheet) throw new Error('Sheet "Market Features Filters" not found in Excel file');

  const features = [];

  // Data starts at row 3 (row 1 is title, row 2 is headers)
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return; // skip title + headers
    // Stop at the reference section (row 14+)
    if (rowNumber >= 14) return;

    const featureType = String(row.getCell(2).value || '').trim();
    const featuresStr = String(row.getCell(3).value || '').trim();
    const operator = String(row.getCell(4).value || '').trim();

    // Only add rows that have at least a Feature Type
    if (featureType) {
      features.push({
        featureType,
        features: featuresStr
          ? featuresStr.split(',').map(f => f.trim()).filter(Boolean)
          : [],
        operator: operator || 'AND',
      });
    }
  });

  return features;
}

// =====================================================
// Sheet 3: Y-Factor Filters
// =====================================================
function readYFactors(workbook) {
  const sheet = workbook.getWorksheet('Y-Factor Filters');
  if (!sheet) throw new Error('Sheet "Y-Factor Filters" not found in Excel file');

  // Factor mapping: Excel "Y-Factor" name → JS key
  const factorMap = {
    'Bedrooms Total': 'bedroomsTotal',
    'Bathrooms Total': 'bathroomsTotal',
    'Site Area': 'siteArea',
    'Finished Sq Ft': 'finishedSqFt',
    'Year Built': 'yearBuilt',
    'Stories': 'stories',
    'Garage Spaces': 'garageSpaces',
    'Fireplaces Total': 'fireplacesTotal',
    'Association YN': 'associationYn',
    'Cooling YN': 'coolingYn',
  };

  // Yes/No factors (rows 9-10 in the UI, index 8-9)
  const yesNoFactors = new Set(['Association YN', 'Cooling YN']);

  const result = {};

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const factorName = String(row.getCell(2).value || '').trim();
    const jsKey = factorMap[factorName];
    if (!jsKey) return;

    if (yesNoFactors.has(factorName)) {
      // Yes/No field — read from "Min Value" column (col 3)
      const value = String(row.getCell(3).value || '').trim();
      result[jsKey] = value || '';
    } else {
      // Min/Max field
      const min = String(row.getCell(3).value ?? '').trim();
      const max = String(row.getCell(4).value ?? '').trim();
      result[jsKey] = { min, max };
    }
  });

  return result;
}

// =====================================================
// Sheet 4: Y-Formula
// =====================================================
function readYFormula(workbook) {
  const sheet = workbook.getWorksheet('Y-Formula');
  if (!sheet) throw new Error('Sheet "Y-Formula" not found in Excel file');

  const fieldMap = {
    'MLS Board':  'mlsBoard',
    'State':      'state',
    'County':     'county',
    'City':       'city',
    'Zip Code':   'zipCode',
    'Base Value': 'baseValue',
  };

  const result = {};

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const fieldName = String(row.getCell(1).value || '').trim();
    const value = String(row.getCell(2).value ?? '').trim();
    const jsKey = fieldMap[fieldName];
    if (jsKey) {
      result[jsKey] = value;
    }
  });

  return result;
}

// =====================================================
// CLI: Run directly to preview data
// =====================================================
if (process.argv[1] && process.argv[1].includes('read-excel-data')) {
  readExcelData().then(data => {
    console.log('=== Data read from Excel ===\n');
    console.log('Market Filters:');
    console.log(JSON.stringify(data.marketFilters, null, 2));
    console.log('\nMarket Features:');
    console.log(JSON.stringify(data.marketFeatures, null, 2));
    console.log('\nY-Factors:');
    console.log(JSON.stringify(data.yFactors, null, 2));
    console.log('\nY-Formula:');
    console.log(JSON.stringify(data.yFormula, null, 2));
  }).catch(err => {
    console.error('Error reading Excel:', err.message);
    process.exit(1);
  });
}
