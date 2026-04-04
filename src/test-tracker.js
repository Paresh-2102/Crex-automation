/**
 * Test Tracker & Document Manager
 * 
 * Tracks all test cases, their status, coverage, execution history,
 * and errors. Persists to JSON so progress is never lost.
 */
import fs from 'fs';
import path from 'path';

const TRACKER_DIR = path.resolve('test-tracker');
const TRACKER_FILE = path.join(TRACKER_DIR, 'test-registry.json');
const ERROR_LOG_FILE = path.join(TRACKER_DIR, 'error-log.json');
const EXECUTION_LOG_FILE = path.join(TRACKER_DIR, 'execution-history.json');

function ensureDir() {
  if (!fs.existsSync(TRACKER_DIR)) fs.mkdirSync(TRACKER_DIR, { recursive: true });
}

// ============================================
// TEST REGISTRY — all known test cases
// ============================================
function loadRegistry() {
  ensureDir();
  if (fs.existsSync(TRACKER_FILE)) {
    return JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf-8'));
  }
  return { tests: [], flows: [], lastUpdated: null };
}

function saveRegistry(registry) {
  ensureDir();
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(registry, null, 2));
}

export function registerTest({ id, name, flow, steps, specFile, status = 'not-started' }) {
  const registry = loadRegistry();
  const existing = registry.tests.find(t => t.id === id);
  if (existing) {
    Object.assign(existing, { name, flow, steps, specFile, status });
  } else {
    registry.tests.push({
      id,
      name,
      flow,
      steps,
      specFile,
      status, // not-started | passed | failed | skipped
      lastRun: null,
      runCount: 0,
      errorCount: 0,
      createdAt: new Date().toISOString(),
    });
  }
  // Track unique flows
  if (flow && !registry.flows.includes(flow)) {
    registry.flows.push(flow);
  }
  saveRegistry(registry);
}

export function updateTestStatus(testId, status, details = {}) {
  const registry = loadRegistry();
  const test = registry.tests.find(t => t.id === testId);
  if (test) {
    test.status = status;
    test.lastRun = new Date().toISOString();
    test.runCount = (test.runCount || 0) + 1;
    if (status === 'failed') test.errorCount = (test.errorCount || 0) + 1;
    if (details.duration) test.lastDuration = details.duration;
    if (details.error) test.lastError = details.error;
    else delete test.lastError;
  }
  saveRegistry(registry);
}

export function getRegistry() {
  return loadRegistry();
}

export function getTestById(testId) {
  const registry = loadRegistry();
  return registry.tests.find(t => t.id === testId);
}

export function getTestsByStatus(status) {
  const registry = loadRegistry();
  return registry.tests.filter(t => t.status === status);
}

export function getTestsByFlow(flow) {
  const registry = loadRegistry();
  return registry.tests.filter(t => t.flow === flow);
}

// ============================================
// ERROR LOG — captures all errors with AI analysis
// ============================================
function loadErrorLog() {
  ensureDir();
  if (fs.existsSync(ERROR_LOG_FILE)) {
    return JSON.parse(fs.readFileSync(ERROR_LOG_FILE, 'utf-8'));
  }
  return { errors: [], knownIssues: [] };
}

function saveErrorLog(log) {
  ensureDir();
  fs.writeFileSync(ERROR_LOG_FILE, JSON.stringify(log, null, 2));
}

export function logError({ testId, testName, error, screenshot, aiAnalysis, resolution }) {
  const log = loadErrorLog();
  const entry = {
    id: `ERR-${Date.now()}`,
    testId,
    testName,
    error: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? null : error.stack,
    screenshot: screenshot || null,
    aiAnalysis: aiAnalysis || null,
    resolution: resolution || null,
    timestamp: new Date().toISOString(),
    resolved: false,
  };
  log.errors.push(entry);
  saveErrorLog(log);
  return entry;
}

export function markErrorResolved(errorId, resolution) {
  const log = loadErrorLog();
  const err = log.errors.find(e => e.id === errorId);
  if (err) {
    err.resolved = true;
    err.resolution = resolution;
    err.resolvedAt = new Date().toISOString();
    // Add to known issues so it won't repeat
    if (!log.knownIssues.find(k => k.pattern === err.error)) {
      log.knownIssues.push({
        pattern: err.error,
        resolution,
        testId: err.testId,
        addedAt: new Date().toISOString(),
      });
    }
  }
  saveErrorLog(log);
}

export function getKnownIssues() {
  const log = loadErrorLog();
  return log.knownIssues;
}

export function getUnresolvedErrors() {
  const log = loadErrorLog();
  return log.errors.filter(e => !e.resolved);
}

export function getErrorLog() {
  return loadErrorLog();
}

export function findKnownIssue(errorMessage) {
  const log = loadErrorLog();
  return log.knownIssues.find(k => errorMessage.includes(k.pattern) || k.pattern.includes(errorMessage.substring(0, 50)));
}

// ============================================
// EXECUTION HISTORY — full run history
// ============================================
function loadExecutionHistory() {
  ensureDir();
  if (fs.existsSync(EXECUTION_LOG_FILE)) {
    return JSON.parse(fs.readFileSync(EXECUTION_LOG_FILE, 'utf-8'));
  }
  return { runs: [] };
}

function saveExecutionHistory(history) {
  ensureDir();
  fs.writeFileSync(EXECUTION_LOG_FILE, JSON.stringify(history, null, 2));
}

export function logExecution({ testId, testName, status, duration, error, screenshot }) {
  const history = loadExecutionHistory();
  history.runs.push({
    testId,
    testName,
    status,
    duration,
    error: error || null,
    screenshot: screenshot || null,
    timestamp: new Date().toISOString(),
  });
  saveExecutionHistory(history);
}

export function getExecutionHistory(testId = null) {
  const history = loadExecutionHistory();
  if (testId) return history.runs.filter(r => r.testId === testId);
  return history.runs;
}

// ============================================
// COVERAGE SUMMARY
// ============================================
export function getCoverageSummary() {
  const registry = loadRegistry();
  const total = registry.tests.length;
  const passed = registry.tests.filter(t => t.status === 'passed').length;
  const failed = registry.tests.filter(t => t.status === 'failed').length;
  const notStarted = registry.tests.filter(t => t.status === 'not-started').length;
  const skipped = registry.tests.filter(t => t.status === 'skipped').length;

  const flowCoverage = {};
  for (const flow of registry.flows) {
    const flowTests = registry.tests.filter(t => t.flow === flow);
    flowCoverage[flow] = {
      total: flowTests.length,
      passed: flowTests.filter(t => t.status === 'passed').length,
      failed: flowTests.filter(t => t.status === 'failed').length,
      notStarted: flowTests.filter(t => t.status === 'not-started').length,
    };
  }

  return {
    total,
    passed,
    failed,
    notStarted,
    skipped,
    passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%',
    flows: registry.flows,
    flowCoverage,
  };
}
