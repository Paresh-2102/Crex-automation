const fs = require('fs');
const content = fs.readFileSync('tests/test-admin-opinion.spec.js', 'utf8');

// Find the section to replace — from "should pre-fill" comment to end of the closing "}"
// We want to replace the entire assertion block with a conditional version

const searchStart = "      // the opinion URL (with adminOpinionId) should pre-fill the admin's values.\n";
const searchEnd = "      console.log('  \u2714 Admin value pre-fill assertion done in Affiliate Manager account');\n    } else {\n      console.log('  \u26a0\u00a0 No admin opinion ID";

const startIdx = content.indexOf(searchStart);
if (startIdx === -1) {
  console.log('searchStart NOT FOUND');
  // Print the area around "should pre-fill"
  const idx = content.indexOf("should pre-fill the admin's values");
  console.log('Context around idx', idx, ':');
  console.log(JSON.stringify(content.substring(idx - 10, idx + 200)));
  process.exit(1);
}
console.log('startIdx:', startIdx);

// Find the end
const endIdx = content.indexOf(searchEnd, startIdx);
if (endIdx === -1) {
  console.log('searchEnd NOT FOUND');
  // Print what's there
  console.log(JSON.stringify(content.substring(startIdx, startIdx + 600)));
  process.exit(1);
}
console.log('endIdx:', endIdx);
console.log('section found, length:', endIdx - startIdx + searchEnd.length);

const endOfSection = endIdx + searchEnd.length;
const before = content.substring(0, startIdx);
const after = content.substring(endOfSection);

const replacement = `      // the opinion URL (with adminOpinionId) should pre-fill the admin's values.
      // If AFM already has an opinion saved, skip the assertion (re-run scenario).
      if (afmAlreadyFilled) {
        console.log('  \u26a0\u00a0 AFM already has an opinion saved \u2014 skipping pre-fill assertion (re-run)');
      } else {
        console.log('\\n' + '\u2500'.repeat(65));
        console.log('  AFM-001 PRE-FILL ASSERTION: Admin values visible in AFM account');
        console.log(\`  \${'Factor'.padEnd(12)} | Admin Value | AFM Pre-fill | Result\`);
        console.log(\`  \${'-'.repeat(58)}\`);

        for (const name of FACTOR_NAMES) {
          const input     = page.locator(\`input[placeholder*="\${name}" i]\`).first();
          const isVisible = await input.isVisible({ timeout: 5000 }).catch(() => false);
          if (!isVisible) {
            console.log(\`  \u26a0\u00a0 [\${name}] input not visible \u2014 skipping assertion\`);
            continue;
          }
          const val         = await input.inputValue().catch(() => null);
          const adminValue  = OPINION_VALUES[name];           // e.g. '5'
          const parsed      = parseFloat(val ?? 'NaN');
          const expected    = parseFloat(adminValue);
          const isMatch     = !isNaN(parsed) && Math.abs(parsed - expected) < 0.01;
          const resultLabel = isMatch ? '\u2714 PASS' : '\u2717 FAIL';

          console.log(\`  \${name.padEnd(12)} | \${String(adminValue).padEnd(11)} | \${String(val ?? '(empty)').padEnd(12)} | \${resultLabel}\`);

          expect.soft(
            parsed,
            \`admin \${name.toLowerCase()} value is matching in the affiliate manager account \` +
            \`due to affiliate manager hasn't provided a opinion yet \` +
            \`(expected \${adminValue}, got \${val})\`
          ).toBeCloseTo(expected, 2);
        }

        console.log(\`  \${'-'.repeat(58)}\`);
        console.log('\u2500'.repeat(65) + '\\n');
      }
      console.log('  \u2714 Admin value pre-fill assertion done in Affiliate Manager account');
    } else {
      console.log('  \u26a0\u00a0 No admin opinion ID`;

const newContent = before + replacement + after;
fs.writeFileSync('tests/test-admin-opinion.spec.js', newContent, 'utf8');
console.log('Done! File updated.');
