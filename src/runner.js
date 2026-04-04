/**
 * CREX Agent - Smart Automation Runner
 * 
 * Interactive CLI that:
 *   1. Shows test coverage dashboard
 *   2. Runs tests one-by-one (open browser → test → close → ask next)
 *   3. Runs tests in bulk mode
 *   4. Uses Claude AI for error analysis
 *   5. Tracks all runs, errors, and prevents repeat failures
 * 
 * Run with: node src/runner.js
 */
import 'dotenv/config';
import { createInterface } from 'readline';
import {
  registerTest,
  getRegistry,
  getCoverageSummary,
  getTestsByFlow,
  getTestsByStatus,
  getUnresolvedErrors,
  getExecutionHistory,
  getErrorLog,
  markErrorResolved,
} from './test-tracker.js';
import {
  runSingleTest,
  runBulkTests,
  formatResult,
  formatBulkSummary,
} from './test-runner.js';
import { analyzeError, formatAnalysis } from './error-analyzer.js';

// ============================================
// REGISTER ALL TEST CASES
// ============================================
function initializeTests() {
  // Login Flow
  registerTest({
    id: 'TC-001',
    name: 'should login successfully',
    flow: 'Login',
    specFile: 'tests/crex-agent.spec.js',
    steps: [
      '1. Navigate to /login',
      '2. Fill email: zaid.m@simformsolutions.com',
      '3. Fill password: Test@123',
      '4. Click Sign in button',
      '5. Verify redirect to /affiliate-managers',
      '6. Verify sidebar navigation visible',
    ],
  });

  registerTest({
    id: 'TC-002',
    name: 'should verify login page elements',
    flow: 'Login',
    specFile: 'tests/crex-agent.spec.js',
    steps: [
      '1. Navigate to /login',
      '2. Verify email input visible',
      '3. Verify password input visible',
      '4. Verify remember checkbox visible',
      '5. Verify forgot password link visible',
      '6. Verify Sign in button visible',
      '7. Verify page heading "Login to your account"',
    ],
  });

  // Properties & Filter Flow
  registerTest({
    id: 'TC-003',
    name: 'should navigate to Properties and open Market Filters',
    flow: 'Properties - Market Filters',
    specFile: 'tests/crex-agent.spec.js',
    steps: [
      '1. Login with credentials',
      '2. Click Properties in sidebar',
      '3. Verify Properties page URL',
      '4. Verify Market Filters dialog opens',
      '5. Verify filter tabs (Market Filters, Market Features, Y-Factor)',
      '6. Verify all dropdown fields present',
      '7. Verify date range inputs',
      '8. Verify price range inputs',
      '9. Verify Cancel and Next buttons',
    ],
  });

  registerTest({
    id: 'TC-004',
    name: 'should select values in all Market Filters dropdowns',
    flow: 'Properties - Market Filters',
    specFile: 'tests/crex-agent-filters.spec.js',
    steps: [
      '1. Login and navigate to Properties',
      '2. Open Market Filters dialog',
      '3. Select MLS Board (first option)',
      '4. Wait for State dropdown to load → Select State',
      '5. Wait for County dropdown to load → Select County',
      '6. Select City',
      '7. Select Zip Code',
      '8. Select Property Status',
      '9. Verify all field labels visible',
      '10. Fill Min Price and Max Price from filterValues',
      '11. Verify Next button is visible',
    ],
  });

  registerTest({
    id: 'TC-005',
    name: 'should fill Market Filters and click Next to reach Features page',
    flow: 'Properties - Market Features Filters',
    specFile: 'tests/crex-agent-filters.spec.js',
    steps: [
      '1. Login and navigate to Properties',
      '2. Open Market Filters dialog',
      '3. Select MLS Board, State, County (required fields)',
      '4. Fill Min/Max Price from filterValues',
      '5. Click Next button',
      '6. Verify dialog title changes to "Market Features Filters"',
      '7. Verify "Market Features" section heading',
      '8. Verify "+ Add New Market Feature" button',
      '9. Verify table headers (Feature Type, Features, Description, Actions)',
      '10. Verify empty state "No market features added yet."',
      '11. Verify "+ Add Your First Feature" link',
      '12. Verify Previous, Cancel, Next buttons visible',
    ],
  });

  registerTest({
    id: 'TC-006',
    name: 'should add a market feature and navigate to Y-Factor Filters',
    flow: 'Properties - Market Features & Y-Factor',
    specFile: 'tests/crex-agent-features.spec.js',
    steps: [
      '1. Login and navigate to Properties',
      '2. Open Market Filters → fill required → Next to Market Features',
      '3. Click "Add New Market Feature" button',
      '4. Select Feature Type (Accessibility Features)',
      '5. Select Features from dropdown',
      '6. Verify Operator defaults to AND',
      '7. Click "Add Feature" button',
      '8. Verify feature appears in table with Operator: AND',
      '9. Click Next to reach Y-Factor Filters page',
      '10. Verify Y-Factor table headers (Y-factors, Min/Max Unit Value)',
      '11. Verify Y-Factor rows (Bedrooms, Bathrooms, Site Area, etc.)',
      '12. Verify Previous, Reset All Filters, Apply Filters buttons',
    ],
  });
}

// ============================================
// CLI DISPLAY HELPERS
// ============================================
function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
}

function printHeader() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🤖 CREX Agent - Smart Automation Runner                 ║');
  console.log('║   Powered by Claude AI + Playwright                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

function printDashboard() {
  const summary = getCoverageSummary();
  const registry = getRegistry();

  console.log('\n┌──────────────────────────────────────────────────────────┐');
  console.log('│                   📊 TEST DASHBOARD                      │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log(`│  Total Tests:  ${String(summary.total).padEnd(6)} Pass Rate: ${summary.passRate.padEnd(8)}        │`);
  console.log(`│  ✅ Passed:    ${String(summary.passed).padEnd(6)} ❌ Failed:  ${String(summary.failed).padEnd(6)}        │`);
  console.log(`│  ⏳ Pending:   ${String(summary.notStarted).padEnd(6)} ⏭️  Skipped: ${String(summary.skipped).padEnd(6)}        │`);
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│  FLOW COVERAGE:                                          │');

  for (const flow of summary.flows) {
    const fc = summary.flowCoverage[flow];
    const bar = '█'.repeat(fc.passed) + '░'.repeat(fc.total - fc.passed);
    console.log(`│    ${flow.padEnd(30)} [${bar}] ${fc.passed}/${fc.total}    │`);
  }

  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│  TEST CASES:                                             │');

  for (const test of registry.tests) {
    const icon = test.status === 'passed' ? '✅' :
                 test.status === 'failed' ? '❌' :
                 test.status === 'skipped' ? '⏭️' : '⏳';
    const lastRun = test.lastRun ? new Date(test.lastRun).toLocaleString() : 'Never';
    console.log(`│    ${icon} ${test.id} ${test.name.substring(0, 38).padEnd(38)}  │`);
    console.log(`│         Flow: ${test.flow.padEnd(20)} Last: ${lastRun.padEnd(18)}│`);
  }

  console.log('└──────────────────────────────────────────────────────────┘');

  // Show unresolved errors
  const errors = getUnresolvedErrors();
  if (errors.length > 0) {
    console.log('\n  ⚠️  UNRESOLVED ERRORS:');
    for (const err of errors.slice(0, 5)) {
      console.log(`    ${err.id} | ${err.testName}: ${(err.error || '').substring(0, 60)}`);
    }
  }
}

function printMenu() {
  console.log('\n┌──────────────────────────────────────────────────────────┐');
  console.log('│                     📋 MENU                              │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│  1. 🏃 Run a single test case                            │');
  console.log('│  2. 🔄 Run tests one-by-one (ask after each)             │');
  console.log('│  3. 🚀 Run all tests (bulk mode)                         │');
  console.log('│  4. 📊 View dashboard                                    │');
  console.log('│  5. 📝 View test steps for a case                        │');
  console.log('│  6. 📜 View execution history                            │');
  console.log('│  7. 🐛 View error log                                    │');
  console.log('│  8. 🔍 Analyze a failed test with AI                     │');
  console.log('│  9. ✅ Mark an error as resolved                          │');
  console.log('│  0. 🚪 Exit                                              │');
  console.log('└──────────────────────────────────────────────────────────┘');
}

function printTestList() {
  const registry = getRegistry();
  console.log('\n  Available Test Cases:');
  for (const test of registry.tests) {
    const icon = test.status === 'passed' ? '✅' :
                 test.status === 'failed' ? '❌' : '⏳';
    console.log(`    ${icon} ${test.id} - ${test.name}`);
  }
}

// ============================================
// CLI INTERACTION HANDLERS
// ============================================
const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function handleRunSingle() {
  printTestList();
  const testId = (await ask('\n  Enter test ID (e.g. TC-001): ')).trim().toUpperCase();

  const registry = getRegistry();
  const test = registry.tests.find(t => t.id === testId);
  if (!test) {
    console.log(`\n  ❌ Test "${testId}" not found.`);
    return;
  }

  console.log(`\n  Running "${test.name}"...`);
  console.log(`  Steps:`);
  for (const step of test.steps) {
    console.log(`    ${step}`);
  }

  const result = await runSingleTest(test.id, test.specFile, test.name);
  console.log(formatResult(result));

  // If failed, offer AI analysis
  if (result.status === 'failed') {
    const doAnalysis = (await ask('\n  🔍 Analyze this error with Claude AI? (y/n): ')).trim().toLowerCase();
    if (doAnalysis === 'y') {
      console.log('  Analyzing with Claude AI...');
      const analysis = await analyzeError({
        testName: test.name,
        testSteps: test.steps.join('\n'),
        error: result.error,
        screenshot: result.screenshot,
      });
      console.log(formatAnalysis(analysis));
    }
  }
}

async function handleRunOneByOne() {
  const registry = getRegistry();
  const tests = registry.tests;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n  [${i + 1}/${tests.length}] Next: ${test.id} - ${test.name}`);
    console.log(`  Flow: ${test.flow}`);

    const action = (await ask('  Run this test? (y=yes / s=skip / q=quit): ')).trim().toLowerCase();

    if (action === 'q') {
      console.log('  Stopped.');
      break;
    }
    if (action === 's') {
      console.log(`  ⏭️  Skipped ${test.id}`);
      continue;
    }

    const result = await runSingleTest(test.id, test.specFile, test.name);
    console.log(formatResult(result));

    // If failed, auto-analyze
    if (result.status === 'failed') {
      console.log('\n  🔍 Auto-analyzing with Claude AI...');
      const analysis = await analyzeError({
        testName: test.name,
        testSteps: test.steps.join('\n'),
        error: result.error,
        screenshot: result.screenshot,
      });
      console.log(formatAnalysis(analysis));
    }

    if (i < tests.length - 1) {
      const next = (await ask('\n  Continue to next test? (y/n): ')).trim().toLowerCase();
      if (next !== 'y') {
        console.log('  Stopped.');
        break;
      }
    }
  }

  // Print summary
  const summary = getCoverageSummary();
  console.log(`\n  Run complete. Pass rate: ${summary.passRate}`);
}

async function handleRunBulk() {
  const registry = getRegistry();
  console.log(`\n  🚀 Running ALL ${registry.tests.length} tests in bulk...`);

  const testIds = registry.tests.map(t => t.id);
  const results = await runBulkTests(testIds);
  console.log(formatBulkSummary(results));

  // Auto-analyze failures
  const failures = results.filter(r => r.status === 'failed');
  if (failures.length > 0) {
    const doAnalysis = (await ask(`\n  🔍 Analyze ${failures.length} failures with Claude AI? (y/n): `)).trim().toLowerCase();
    if (doAnalysis === 'y') {
      for (const fail of failures) {
        const test = registry.tests.find(t => t.id === fail.testId);
        console.log(`\n  Analyzing: ${fail.testName}...`);
        const analysis = await analyzeError({
          testName: fail.testName,
          testSteps: test?.steps?.join('\n') || '',
          error: fail.error,
          screenshot: fail.screenshot,
        });
        console.log(formatAnalysis(analysis));
      }
    }
  }
}

async function handleViewSteps() {
  printTestList();
  const testId = (await ask('\n  Enter test ID: ')).trim().toUpperCase();

  const registry = getRegistry();
  const test = registry.tests.find(t => t.id === testId);
  if (!test) {
    console.log(`\n  ❌ Test "${testId}" not found.`);
    return;
  }

  console.log(`\n  📝 ${test.id} - ${test.name}`);
  console.log(`  Flow: ${test.flow}`);
  console.log(`  File: ${test.specFile}`);
  console.log(`  Status: ${test.status}`);
  console.log(`  Run Count: ${test.runCount || 0}`);
  console.log(`\n  Steps:`);
  for (const step of test.steps) {
    console.log(`    ${step}`);
  }
}

async function handleViewHistory() {
  const history = getExecutionHistory();
  if (history.length === 0) {
    console.log('\n  No execution history yet.');
    return;
  }

  console.log('\n  📜 EXECUTION HISTORY (last 20):');
  console.log('  ' + '─'.repeat(55));

  const recent = history.slice(-20).reverse();
  for (const run of recent) {
    const icon = run.status === 'passed' ? '✅' : '❌';
    const time = new Date(run.timestamp).toLocaleString();
    const dur = ((run.duration || 0) / 1000).toFixed(1);
    console.log(`  ${icon} ${run.testId} | ${run.testName.substring(0, 30).padEnd(30)} | ${dur}s | ${time}`);
  }
}

async function handleViewErrors() {
  const log = getErrorLog();
  if (log.errors.length === 0) {
    console.log('\n  No errors logged yet. 🎉');
    return;
  }

  console.log('\n  🐛 ERROR LOG:');
  console.log('  ' + '─'.repeat(55));

  for (const err of log.errors.slice(-10).reverse()) {
    const icon = err.resolved ? '✅' : '❌';
    const time = new Date(err.timestamp).toLocaleString();
    console.log(`  ${icon} ${err.id} | ${err.testName}`);
    console.log(`     Error: ${(err.error || '').substring(0, 70)}`);
    if (err.aiAnalysis) console.log(`     AI Analysis: Available`);
    if (err.resolved) console.log(`     Resolved: ${err.resolution}`);
    console.log(`     Time: ${time}`);
    console.log('');
  }

  if (log.knownIssues.length > 0) {
    console.log('  📌 KNOWN ISSUES (will be auto-detected):');
    for (const ki of log.knownIssues) {
      console.log(`    • ${ki.pattern.substring(0, 50)} → ${ki.resolution}`);
    }
  }
}

async function handleAnalyzeFailure() {
  const failedTests = getTestsByStatus('failed');
  if (failedTests.length === 0) {
    console.log('\n  No failed tests to analyze.');
    return;
  }

  console.log('\n  Failed Tests:');
  for (const test of failedTests) {
    console.log(`    ❌ ${test.id} - ${test.name}`);
    if (test.lastError) console.log(`       Error: ${test.lastError.substring(0, 60)}`);
  }

  const testId = (await ask('\n  Enter test ID to analyze: ')).trim().toUpperCase();
  const test = failedTests.find(t => t.id === testId);
  if (!test) {
    console.log(`\n  ❌ Test "${testId}" not found in failed tests.`);
    return;
  }

  console.log(`\n  🔍 Analyzing "${test.name}" with Claude AI...`);
  const analysis = await analyzeError({
    testName: test.name,
    testSteps: test.steps.join('\n'),
    error: test.lastError || 'Unknown error',
  });
  console.log(formatAnalysis(analysis));
}

async function handleResolveError() {
  const errors = getUnresolvedErrors();
  if (errors.length === 0) {
    console.log('\n  No unresolved errors.');
    return;
  }

  console.log('\n  Unresolved Errors:');
  for (const err of errors) {
    console.log(`    ${err.id} | ${err.testName}: ${(err.error || '').substring(0, 50)}`);
  }

  const errorId = (await ask('\n  Enter error ID to resolve: ')).trim();
  const resolution = (await ask('  Resolution description: ')).trim();

  if (errorId && resolution) {
    markErrorResolved(errorId, resolution);
    console.log(`\n  ✅ Error ${errorId} marked as resolved.`);
    console.log('  This pattern will be auto-detected in future runs.');
  }
}

// ============================================
// MAIN LOOP
// ============================================
async function main() {
  // Initialize test registry
  initializeTests();

  clearScreen();
  printHeader();
  printDashboard();

  while (true) {
    printMenu();
    const choice = (await ask('\n  Select option (0-9): ')).trim();

    switch (choice) {
      case '1':
        await handleRunSingle();
        break;
      case '2':
        await handleRunOneByOne();
        break;
      case '3':
        await handleRunBulk();
        break;
      case '4':
        clearScreen();
        printHeader();
        printDashboard();
        break;
      case '5':
        await handleViewSteps();
        break;
      case '6':
        await handleViewHistory();
        break;
      case '7':
        await handleViewErrors();
        break;
      case '8':
        await handleAnalyzeFailure();
        break;
      case '9':
        await handleResolveError();
        break;
      case '0':
        console.log('\n  👋 Goodbye!\n');
        rl.close();
        process.exit(0);
      default:
        console.log('\n  Invalid option. Please enter 0-9.');
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
