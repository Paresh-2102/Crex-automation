// Clears all data rows in the "Market Features Filters" sheet (rows 3–13)
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'test-data/filter-input-template.xlsx');

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

const sheet = workbook.getWorksheet('Market Features Filters');

// Rows 3–13 are the data rows (row 1 = title, row 2 = headers, row 14+ = reference)
for (let rowNum = 3; rowNum <= 13; rowNum++) {
  const row = sheet.getRow(rowNum);
  // Clear columns B (2), C (3), D (4), E (5)
  row.getCell(2).value = null;
  row.getCell(3).value = null;
  row.getCell(4).value = null;
  row.getCell(5).value = null;
  row.commit();
}

await workbook.xlsx.writeFile(filePath);
console.log('Market Features Filters cleared successfully.');
