/**
 * One-time script to add "Y-Formula" sheet to the existing Excel template.
 * Run: node add-yformula-sheet.js
 */
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.join(__dirname, 'test-data', 'filter-input-template.xlsx');

async function addYFormulaSheet() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  // Remove existing sheet if re-running
  const existing = workbook.getWorksheet('Y-Formula');
  if (existing) {
    workbook.removeWorksheet(existing.id);
  }

  const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  const headerFont  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
  const inputFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } };
  const thinBorder  = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' },
  };

  const sheet = workbook.addWorksheet('Y-Formula', {
    properties: { tabColor: { argb: 'FF7B1FA2' } },
  });

  sheet.columns = [
    { header: 'Field Name', key: 'field', width: 25 },
    { header: 'Value',      key: 'value', width: 35 },
    { header: 'Description / Notes', key: 'notes', width: 50 },
  ];

  // Style header row
  sheet.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  sheet.getRow(1).height = 25;

  const fields = [
    { field: 'MLS Board',  value: 'Northstar MLS', notes: 'Select from dropdown (e.g., Northstar MLS, Florida Gulf Coast MLS)' },
    { field: 'State',      value: 'Minnesota',     notes: 'Select from dropdown — populated after MLS Board selection' },
    { field: 'County',     value: 'Washington',    notes: 'Select from dropdown — populated after State selection' },
    { field: 'City',       value: 'Stillwater',    notes: 'Optional — select from dropdown — populated after County selection' },
    { field: 'Zip Code',   value: '55082',         notes: 'Optional — select from dropdown — populated after City selection' },
    { field: 'Base Value', value: '1000',          notes: 'Required numeric value (e.g., 100, 500, 1000)' },
  ];

  fields.forEach(row => {
    const dataRow = sheet.addRow(row);
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

  await workbook.xlsx.writeFile(EXCEL_PATH);
  console.log('✅ Y-Formula sheet added to:', EXCEL_PATH);
  console.log('   Fields added:');
  fields.forEach(f => console.log(`   - ${f.field}: "${f.value}"`));
}

addYFormulaSheet().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
