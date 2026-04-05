const fs = require('fs');
let content = fs.readFileSync('tests/test-admin-opinion.spec.js', 'utf8');

const hasCRLF = content.includes('\r\n');
if (hasCRLF) content = content.replace(/\r\n/g, '\n');

// Trim propertyId extracted from Excel in all 3 places
const trimOld = "propertyId = String(firstScenario.propertyId);";
const trimNew = "propertyId = String(firstScenario.propertyId).trim();";
const count = (content.split(trimOld)).length - 1;
if (count === 0) {
  console.log('Already trimmed or pattern not found.');
} else {
  content = content.split(trimOld).join(trimNew);
  console.log(`Trim fix: replaced ${count} occurrences.`);
  if (hasCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('tests/test-admin-opinion.spec.js', content, 'utf8');
  console.log('Done.');
}
