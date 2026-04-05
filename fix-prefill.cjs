const fs = require('fs');
let content = fs.readFileSync('tests/test-admin-opinion.spec.js', 'utf8');

// Normalize to LF for matching, we'll restore CRLF at the end
const hasCRLF = content.includes('\r\n');
if (hasCRLF) content = content.replace(/\r\n/g, '\n');

// ── FIX 1: AFM-001 ──────────────────────────────────────────────────────────
// Wrap the expect.soft() calls in the AFM-001 pre-fill section with a guard.
// The `afmAlreadyFilled` variable was already added; we just need to wrap the
// assertion block so it's skipped when AFM already has an opinion saved.

const afmOld = `        expect.soft(
          parsed,
          \`admin \${name.toLowerCase()} value is matching in the affiliate manager account \` +
          \`due to affiliate manager hasn't provided a opinion yet \` +
          \`(expected \${adminValue}, got \${val})\`
        ).toBeCloseTo(expected, 2);`;

const afmNew = `        if (!afmAlreadyFilled) {
          expect.soft(
            parsed,
            \`admin \${name.toLowerCase()} value is matching in the affiliate manager account \` +
            \`due to affiliate manager hasn't provided a opinion yet \` +
            \`(expected \${adminValue}, got \${val})\`
          ).toBeCloseTo(expected, 2);
        }`;

if (content.includes(afmOld)) {
  content = content.replace(afmOld, afmNew);
  console.log('AFM-001: expect.soft() wrapped successfully.');
} else {
  console.error('AFM-001: pattern NOT found!');
  process.exit(1);
}

// ── FIX 2: SA-001 ───────────────────────────────────────────────────────────
// Add saAlreadyFilled variable and wrap the SA-001 expect.soft() calls.

// Step 2a: Add saAlreadyFilled declaration after afmOpinionIdForUrl
const saVarOld = `    const sharedDataSa       = readSharedOpinionData();
    const afmOpinionIdForUrl = sharedDataSa.afmOpinionId;
    const propertyAddressSa  = sharedDataSa.propertyAddress || '';
    const afmPreFillAssertions = [];`;

const saVarNew = `    const sharedDataSa       = readSharedOpinionData();
    const afmOpinionIdForUrl = sharedDataSa.afmOpinionId;
    const saAlreadyFilled    = !!sharedDataSa.saOpinionId;
    const propertyAddressSa  = sharedDataSa.propertyAddress || '';
    const afmPreFillAssertions = [];`;

if (content.includes(saVarOld)) {
  content = content.replace(saVarOld, saVarNew);
  console.log('SA-001: saAlreadyFilled variable added.');
} else {
  console.error('SA-001: variable declaration pattern NOT found!');
  process.exit(1);
}

// Step 2b: Wrap the SA-001 expect.soft() with the guard
const saAssertOld = `        expect.soft(
          numVal,
          \`Affiliate manager \${name.toLowerCase()} value is matching in the sub agent account \` +
          \`due to sub agent hasn't provided a opinion yet \` +
          \`(expected \${expected}, got \${val})\`
        ).toBeCloseTo(expected, 2);`;

const saAssertNew = `        if (!saAlreadyFilled) {
          expect.soft(
            numVal,
            \`Affiliate manager \${name.toLowerCase()} value is matching in the sub agent account \` +
            \`due to sub agent hasn't provided a opinion yet \` +
            \`(expected \${expected}, got \${val})\`
          ).toBeCloseTo(expected, 2);
        }`;

if (content.includes(saAssertOld)) {
  content = content.replace(saAssertOld, saAssertNew);
  console.log('SA-001: expect.soft() wrapped successfully.');
} else {
  console.error('SA-001: assertion pattern NOT found!');
  process.exit(1);
}

// Restore CRLF if original used it
if (hasCRLF) content = content.replace(/\n/g, '\r\n');

fs.writeFileSync('tests/test-admin-opinion.spec.js', content, 'utf8');
console.log('Done! Both fixes applied.');
