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

// Allow overriding the path via environment variable (e.g. EXCEL_FILE_PATH=C:\path\to\file.xlsx npx playwright test)
const EXCEL_PATH = process.env.EXCEL_FILE_PATH 
  ? path.resolve(process.env.EXCEL_FILE_PATH)
  : path.join(__dirname, 'filter-input-template.xlsx');

import fs from 'fs';

/**
 * Read all test data from the Excel template file.
 * Returns an object with marketFilters, marketFeatures, and yFactors.
 */
export async function readExcelData(filePath = EXCEL_PATH) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`\n❌ ERROR: Excel file not found!\nLooks like the file is missing at: ${filePath}\nPlease check the path or use EXCEL_FILE_PATH to point to your actual spreadsheet.\n`);
  }
  
  console.log(`\n📊 Loading Excel Test Data from: ${filePath}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  return {
    marketFilters: readMarketFilters(workbook),
    marketFeatures: readMarketFeatures(workbook),
    yFactors: readYFactors(workbook),
    yFormula: readYFormula(workbook),
    bvtScenarios: readBVTScenarios(workbook),
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
    'MLS Board':        'mlsBoard',
    'State':            'state',
    'County':           'county',
    'City':             'city',
    'Zip Code':         'zipCode',
    'Base Value':       'baseValue',
    'View Factor':      'viewFactor',
    'Condition Factor': 'conditionFactor',
    'Quality Factor':   'qualityFactor',
    'Amenities Factor': 'amenitiesFactor',
    'Access Factor':    'accessFactor',
    'Appeal Factor':    'appealFactor',
    'Elevation Factor': 'elevationFactor',
    'Economic Factor':  'economicFactor',
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
// Sheet 5: BVT Scenarios
// Columns:
//   A  - Scenario name
//   B  - Base Value
//   C/D - Bedrooms Total    (Base Number / Unit Value)
//   E/F - Bathrooms Total   (Base Number / Unit Value)
//   G/H - Site Area         (Base Number / Unit Value)
//   I/J - Finished Sq Ft   (Base Number / Unit Value)
//   K/L - Year Built        (Base Number / Unit Value)
//   M/N - Stories           (Base Number / Unit Value)
//   O/P - Garage Spaces     (Base Number / Unit Value)
//   Q/R - Fireplaces Total  (Base Number / Unit Value)
//   S   - Association YN    (Yes / No)
//   T   - Cooling YN        (Yes / No)
//   U   - Expected Result   (PASS / FAIL)
//   V   - Notes
// =====================================================
function readBVTScenarios(workbook) {
  const sheet = workbook.getWorksheet('BVT Scenarios');
  if (!sheet) return []; // sheet is optional

  const scenarios = [];
  const factorKeys = [
    'bedroomsTotal',
    'bathroomsTotal',
    'siteArea',
    'finishedSqFt',
    'yearBuilt',
    'stories',
    'garageSpaces',
    'fireplacesTotal',
  ];

  sheet.eachRow((row, rowNumber) => {
    // Rows 1-2 are headers, row 3 and 11 are separators — skip non-data rows
    if (rowNumber <= 2) return;

    const scenario = String(row.getCell(1).value || '').trim();
    // Skip separator rows (they start with 'VALID' or 'INVALID' labels)
    if (!scenario || scenario.startsWith('VALID') || scenario.startsWith('INVALID')) return;

    const baseValue  = row.getCell(2).value;
    const expected   = String(row.getCell(23).value || '').trim().toUpperCase(); // W
    const notes      = String(row.getCell(24).value || '').trim();              // X

    // Read 8 numeric Y-factor pairs (cols C/D, E/F, G/H, I/J, K/L, M/N, O/P, Q/R)
    const yFactors = {};
    factorKeys.forEach((key, i) => {
      const baseNum  = row.getCell(3 + i * 2).value;      // C, E, G, I, K, M, O, Q
      const unitVal  = row.getCell(3 + i * 2 + 1).value;  // D, F, H, J, L, N, P, R
      yFactors[key] = {
        baseNumber: baseNum !== null && baseNum !== undefined ? String(baseNum) : '',
        unitValue:  unitVal !== null && unitVal !== undefined ? String(unitVal) : '',
      };
    });

    // Association YN  — col S (Yes/No) + col T (Unit Value)
    yFactors.associationYN = {
      value:     String(row.getCell(19).value || '').trim(), // S
      unitValue: String(row.getCell(20).value || '').trim(), // T
    };
    // Cooling YN — col U (Yes/No) + col V (Unit Value)
    yFactors.coolingYN = {
      value:     String(row.getCell(21).value || '').trim(), // U
      unitValue: String(row.getCell(22).value || '').trim(), // V
    };

    scenarios.push({
      scenario,
      baseValue: baseValue !== null && baseValue !== undefined ? String(baseValue) : '',
      yFactors,
      expected,   // 'PASS' or 'FAIL'
      notes,
    });
  });

  return scenarios;
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
    console.log('\nBVT Scenarios:');
    console.log(JSON.stringify(data.bvtScenarios, null, 2));
  }).catch(err => {
    console.error('Error reading Excel:', err.message);
    process.exit(1);
  });
}
