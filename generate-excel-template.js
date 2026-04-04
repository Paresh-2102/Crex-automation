import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CREX Agent Automation';
  workbook.created = new Date();

  // =====================================================
  // Common styling
  // =====================================================
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
  const subHeaderFont = { bold: true, color: { argb: 'FF1E3A5F' }, size: 10 };
  const inputFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } };
  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  // =====================================================
  // Sheet 1: Market Filters
  // =====================================================
  const sheet1 = workbook.addWorksheet('Market Filters', { properties: { tabColor: { argb: 'FF1E88E5' } } });

  sheet1.columns = [
    { header: 'Field Name', key: 'field', width: 25 },
    { header: 'Value', key: 'value', width: 35 },
    { header: 'Description / Notes', key: 'notes', width: 45 },
  ];

  // Style header row
  sheet1.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  sheet1.getRow(1).height = 25;

  const marketFilterFields = [
    { field: 'MLS Board', value: 'Northstar MLS', notes: 'Select from dropdown (e.g., Northstar MLS)' },
    { field: 'State', value: 'Minnesota', notes: 'Select from dropdown (e.g., Minnesota, Florida)' },
    { field: 'County', value: 'Washington', notes: 'Select from dropdown (depends on State selection)' },
    { field: 'City', value: 'Stillwater', notes: 'Select from dropdown (depends on County selection)' },
    { field: 'School District', value: 'Stillwater', notes: 'Select from dropdown (depends on County selection)' },
    { field: 'Zip Code', value: '55082', notes: 'Select from dropdown (depends on City selection)' },
    { field: 'Property Status', value: '', notes: 'Select from dropdown (e.g., Active, Closed, Pending). Leave empty to skip.' },
    { field: 'Date Range From', value: 'Mar 28, 2025', notes: 'Date format: MMM DD, YYYY (e.g., Mar 28, 2025)' },
    { field: 'Date Range To', value: 'Mar 28, 2026', notes: 'Date format: MMM DD, YYYY (e.g., Mar 28, 2026)' },
    { field: 'Min Price', value: '', notes: 'Numeric value only (no commas or $). Leave empty to skip.' },
    { field: 'Max Price', value: '', notes: 'Numeric value only (no commas or $). Leave empty to skip.' },
  ];

  marketFilterFields.forEach((row, idx) => {
    const dataRow = sheet1.addRow(row);
    dataRow.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (colNum === 1) {
        cell.font = { bold: true, size: 10 };
        cell.fill = subHeaderFill;
      }
      if (colNum === 2) {
        cell.fill = inputFill;
      }
      if (colNum === 3) {
        cell.font = { italic: true, color: { argb: 'FF666666' }, size: 9 };
      }
    });
  });

  // Add data validations for Property Status
  sheet1.getCell('B9').dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"Active,Closed,Pending,Active Under Contract,Coming Soon,Expired,Withdrawn"'],
    showErrorMessage: true,
    errorTitle: 'Invalid Status',
    error: 'Please select a valid property status.',
  };

  // =====================================================
  // Sheet 2: Market Features Filters
  // =====================================================
  const sheet2 = workbook.addWorksheet('Market Features Filters', { properties: { tabColor: { argb: 'FF43A047' } } });

  // Title row
  sheet2.mergeCells('A1:E1');
  const titleCell2 = sheet2.getCell('A1');
  titleCell2.value = 'Market Features - You can add multiple features (one per row)';
  titleCell2.fill = headerFill;
  titleCell2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet2.getRow(1).height = 30;

  // Column headers
  sheet2.columns = [
    { width: 8 },
    { width: 30 },
    { width: 35 },
    { width: 15 },
    { width: 45 },
  ];

  const headerRow2 = sheet2.getRow(2);
  const headers2 = ['#', 'Feature Type', 'Features (comma-separated)', 'Operator', 'Notes'];
  headers2.forEach((h, i) => {
    const cell = headerRow2.getCell(i + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
    cell.font = headerFont;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow2.height = 25;

  // Feature Type options for data validation
  const featureTypeOptions = [
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

  // Add 10 data entry rows
  for (let i = 0; i < 10; i++) {
    const rowNum = i + 3;
    const row = sheet2.getRow(rowNum);
    row.getCell(1).value = i + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { bold: true };

    // Sample data for first row
    if (i === 0) {
      row.getCell(2).value = 'Property Sub Type';
      row.getCell(3).value = 'Residential';
      row.getCell(4).value = 'AND';
      row.getCell(5).value = 'Sample row - modify or delete as needed';
      row.getCell(5).font = { italic: true, color: { argb: 'FF666666' }, size: 9 };
    }

    // Style all cells in the row
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.alignment = { ...cell.alignment, vertical: 'middle', wrapText: true };
      if (c === 2 || c === 3 || c === 4) {
        cell.fill = inputFill;
      }
    }

    // Data validation for Feature Type column
    row.getCell(2).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${featureTypeOptions.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid Feature Type',
      error: 'Please select from the available feature types.',
    };

    // Data validation for Operator column
    row.getCell(4).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"AND,OR,NOT"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Operator',
      error: 'Please select AND, OR, or NOT.',
    };
  }

  // Add reference sheet for feature types
  const refNote = sheet2.getRow(14);
  sheet2.mergeCells('A14:E14');
  refNote.getCell(1).value = 'Available Feature Types (for reference):';
  refNote.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF1E3A5F' } };

  featureTypeOptions.forEach((opt, idx) => {
    const r = sheet2.getRow(15 + idx);
    r.getCell(2).value = opt;
    r.getCell(2).font = { size: 9, color: { argb: 'FF555555' } };
  });

  // =====================================================
  // Sheet 3: Y-Factor Filters
  // =====================================================
  const sheet3 = workbook.addWorksheet('Y-Factor Filters', { properties: { tabColor: { argb: 'FFFF6F00' } } });

  sheet3.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Y-Factor', key: 'factor', width: 22 },
    { header: 'Min Value', key: 'min', width: 18 },
    { header: 'Max Value', key: 'max', width: 18 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Description / Notes', key: 'notes', width: 40 },
  ];

  // Style header row
  const headerRow3 = sheet3.getRow(1);
  headerRow3.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE65100' } };
    cell.font = headerFont;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  headerRow3.height = 25;

  const yFactorRows = [
    { num: 1, factor: 'Bedrooms Total', min: '', max: '', type: 'Min/Max', notes: 'Enter numeric min/max values (e.g., 2 - 5)' },
    { num: 2, factor: 'Bathrooms Total', min: '', max: '', type: 'Min/Max', notes: 'Enter numeric min/max values (e.g., 1 - 3)' },
    { num: 3, factor: 'Site Area', min: '', max: '', type: 'Min/Max', notes: 'Enter numeric min/max values (square footage)' },
    { num: 4, factor: 'Finished Sq Ft', min: '', max: '', type: 'Min/Max', notes: 'Enter numeric min/max values (square footage)' },
    { num: 5, factor: 'Year Built', min: '', max: '', type: 'Min/Max', notes: 'Enter min/max year (e.g., 2000 - 2024)' },
    { num: 6, factor: 'Stories', min: '', max: '', type: 'Min/Max', notes: 'Enter numeric min/max values (e.g., 1 - 3)' },
    { num: 7, factor: 'Garage Spaces', min: '', max: '', type: 'Min/Max', notes: 'Enter numeric min/max values (e.g., 1 - 2)' },
    { num: 8, factor: 'Fireplaces Total', min: '', max: '', type: 'Min/Max', notes: 'Enter numeric min/max values (e.g., 0 - 2)' },
    { num: 9, factor: 'Association YN', min: '', max: '—', type: 'Yes/No', notes: 'Select Yes or No (Max column not applicable)' },
    { num: 10, factor: 'Cooling YN', min: '', max: '—', type: 'Yes/No', notes: 'Select Yes or No (Max column not applicable)' },
  ];

  yFactorRows.forEach((row, idx) => {
    const dataRow = sheet3.addRow(row);
    const isYesNo = row.type === 'Yes/No';

    dataRow.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };

      if (colNum === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
      }
      if (colNum === 2) {
        cell.font = { bold: true, size: 10 };
        cell.fill = subHeaderFill;
      }
      if (colNum === 3 || colNum === 4) {
        cell.fill = isYesNo && colNum === 4
          ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }
          : inputFill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 5) {
        cell.font = { italic: true, size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 6) {
        cell.font = { italic: true, color: { argb: 'FF666666' }, size: 9 };
      }
    });

    // Data validation for Yes/No rows
    if (isYesNo) {
      dataRow.getCell(3).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Yes,No"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Value',
        error: 'Please select Yes or No.',
      };
    }
  });

  // =====================================================
  // Save the workbook
  // =====================================================
  const outputPath = path.join(__dirname, 'test-data', 'filter-input-template.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel template created successfully: ${outputPath}`);
  console.log('');
  console.log('Sheets:');
  console.log('  1. Market Filters        - 11 fields (dropdowns, dates, prices)');
  console.log('  2. Market Features Filters - Up to 10 features with type, name, operator');
  console.log('  3. Y-Factor Filters       - 10 factors (8 min/max + 2 yes/no)');
}

generateTemplate().catch(err => {
  console.error('Error generating Excel template:', err);
  process.exit(1);
});
