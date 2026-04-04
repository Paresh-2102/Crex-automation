// Script to print all sheet names and their contents from filter-input-template.xlsx
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, 'test-data/filter-input-template.xlsx');
const workbook = xlsx.readFile(filePath);

console.log('Sheets found:', workbook.SheetNames);
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\nSheet: ${sheetName}`);
  console.table(data);
});
