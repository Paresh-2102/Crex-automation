/**
 * Smart Test Runner
 * 
 * Runs Playwright tests ONE AT A TIME:
 *   1. Launch browser
 *   2. Execute a single test
 *   3. Capture results / errors / screenshots
 *   4. Close browser
 *   5. Report back
 * 
 * Supports: single run, sequential (ask after each), bulk mode
 */
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  updateTestStatus,
  logExecution,
  logError,
  findKnownIssue,
  getRegistry,
} from './test-tracker.js';

const SCREENSHOTS_DIR = path.resolve('screenshots');
const TEST_RESULTS_DIR = path.resolve('test-results');

function ensureDirs() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  if (!fs.existsSync(TEST_RESULTS_DIR)) fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

/**
 * Run a single test case by its spec file and test name
 * Opens browser → runs test → closes browser → returns result
 */
export async function runSingleTest(testId, specFile, testName) {
  ensureDirs();
  const startTime = Date.now();

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Running: ${testName}`);
  console.log(`  File:    ${specFile}`);
  console.log(`${'─'.repeat(60)}`);

  // Build the playwright command to run just this one test
  // Using -g flag to grep for the specific test name
  const escapedName = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cmd = `npx playwright test "${specFile}" -g "${escapedName}" --reporter=json --output=${TEST_RESULTS_DIR}`;

  let result = {
    testId,
    testName,
    specFile,
    status: 'unknown',
    duration: 0,
    error: null,
    screenshot: null,
    stdout: '',
    stderr: '',
  };

  try {
    const output = execSync(cmd, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 120000, // 2 min max per test
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    result.stdout = output;
    result.status = 'passed';
    result.duration = Date.now() - startTime;

    // Try to parse JSON result
    try {
      const jsonResult = JSON.parse(output);
      if (jsonResult.suites?.[0]?.specs?.[0]?.tests?.[0]) {
        const testResult = jsonResult.suites[0].specs[0].tests[0];
        result.status = testResult.status === 'expected' ? 'passed' : 'failed';
        if (testResult.results?.[0]?.duration) {
          result.duration = testResult.results[0].duration;
        }
      }
    } catch { /* JSON parse failed, but command succeeded = passed */ }

  } catch (err) {
    result.duration = Date.now() - startTime;
    result.stderr = err.stderr || '';
    result.stdout = err.stdout || '';
    result.status = 'failed';

    // Extract error details
    try {
      const jsonOutput = JSON.parse(result.stdout);
      if (jsonOutput.suites?.[0]?.specs?.[0]?.tests?.[0]?.results?.[0]?.error) {
        const errorObj = jsonOutput.suites[0].specs[0].tests[0].results[0].error;
        result.error = errorObj.message || errorObj.snippet || err.message;
      } else {
        result.error = err.message;
      }
    } catch {
      result.error = err.message;
    }

    // Check for screenshot from failed test
    const screenshotPattern = path.join(TEST_RESULTS_DIR, '**/*.png');
    try {
      const files = fs.readdirSync(TEST_RESULTS_DIR, { recursive: true })
        .filter(f => f.endsWith('.png'));
      if (files.length > 0) {
        result.screenshot = path.join(TEST_RESULTS_DIR, files[files.length - 1]);
      }
    } catch { /* no screenshots */ }
  }

  // Update tracker
  updateTestStatus(testId, result.status, {
    duration: result.duration,
    error: result.error,
  });

  // Log execution
  logExecution({
    testId,
    testName,
    status: result.status,
    duration: result.duration,
    error: result.error,
    screenshot: result.screenshot,
  });

  // If failed, log error and check known issues
  if (result.status === 'failed' && result.error) {
    const knownIssue = findKnownIssue(result.error);
    if (knownIssue) {
      result.knownIssue = knownIssue;
      console.log(`\n  ⚠️  KNOWN ISSUE DETECTED: ${knownIssue.resolution}`);
    }

    logError({
      testId,
      testName,
      error: result.error,
      screenshot: result.screenshot,
    });
  }

  return result;
}

/**
 * Run multiple tests sequentially (bulk mode)
 * Returns array of results
 */
export async function runBulkTests(testIds) {
  const registry = getRegistry();
  const results = [];

  for (let i = 0; i < testIds.length; i++) {
    const test = registry.tests.find(t => t.id === testIds[i]);
    if (!test) {
      console.log(`\n  ⚠️  Test "${testIds[i]}" not found in registry.`);
      continue;
    }

    console.log(`\n  [${i + 1}/${testIds.length}] Running...`);
    const result = await runSingleTest(test.id, test.specFile, test.name);
    results.push(result);

    // Brief pause between tests
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

/**
 * Get a formatted result summary
 */
export function formatResult(result) {
  const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
  const duration = (result.duration / 1000).toFixed(1);

  let output = `\n  ${icon} ${result.testName}`;
  output += `\n     Status:   ${result.status.toUpperCase()}`;
  output += `\n     Duration: ${duration}s`;

  if (result.error) {
    output += `\n     Error:    ${result.error.split('\n')[0].substring(0, 100)}`;
  }
  if (result.knownIssue) {
    output += `\n     Known:    ${result.knownIssue.resolution}`;
  }
  if (result.screenshot) {
    output += `\n     Screenshot: ${result.screenshot}`;
  }

  return output;
}

/**
 * Get bulk run summary
 */
export function formatBulkSummary(results) {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

  let output = `\n${'═'.repeat(60)}`;
  output += `\n  BULK RUN SUMMARY`;
  output += `\n${'═'.repeat(60)}`;
  output += `\n  Total:    ${total}`;
  output += `\n  Passed:   ${passed} ✅`;
  output += `\n  Failed:   ${failed} ❌`;
  output += `\n  Duration: ${(totalDuration / 1000).toFixed(1)}s`;
  output += `\n  Pass Rate: ${total > 0 ? ((passed / total) * 100).toFixed(0) : 0}%`;
  output += `\n${'═'.repeat(60)}`;

  if (failed > 0) {
    output += `\n\n  Failed Tests:`;
    for (const r of results.filter(r => r.status === 'failed')) {
      output += `\n    ❌ ${r.testName}: ${(r.error || '').split('\n')[0].substring(0, 80)}`;
    }
  }

  return output;
}
