// Script to print all sheet names and their contents from filter-input-template.xlsx
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, 'test-data/filter-input-template.xlsx');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

const sheetNames = workbook.worksheets.map(ws => ws.name);
console.log('Sheets found:', sheetNames);

workbook.eachSheet((sheet) => {
  const data = [];
  sheet.eachRow(row => {
    data.push(row.values.slice(1)); // ExcelJS uses 1-based index; slice(1) gives 0-based array
  });
  console.log(`\nSheet: ${sheet.name}`);
  console.table(data);
});
