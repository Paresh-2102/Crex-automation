// ============================================================
// utils/helpers.js
// Non-Playwright utility helpers shared across tests.
//
// Rules:
//   ✓ Pure JS helpers (math, string, file I/O)
//   ✗ No Playwright calls — those belong in pages/
//   ✗ No test assertions — those belong in spec files
// ============================================================

import { writeFileSync, mkdirSync, readFileSync } from 'fs';

// ─── File I/O ─────────────────────────────────────────────────────────────────

/**
 * Save a JSON object to disk, creating parent directories as needed.
 * @param {string} filePath - Full path (e.g. 'output/tc007-s1.json')
 * @param {object} data
 */
export function saveJson(filePath, data) {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Load and parse a JSON file.
 * Throws an error with a helpful message if the file is not found.
 * @param {string} filePath
 * @param {string} [hint] - Extra context shown in the error message
 * @returns {object}
 */
export function loadJson(filePath, hint = '') {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    const msg = hint ? ` — ${hint}` : '';
    throw new Error(`File not found: ${filePath}${msg}`);
  }
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

/**
 * Compute factor-to-total ratios.
 * @param {Record<string, number>} factors  - e.g. { View: 250, Condition: 300 }
 * @param {number|null} total              - denominator (OriginalOpinionTotal)
 * @returns {Record<string, number>}
 */
export function computeRatios(factors, total) {
  const ratios = {};
  for (const [name, val] of Object.entries(factors)) {
    ratios[name] = total && total !== 0
      ? parseFloat((val / total).toFixed(6))
      : 0;
  }
  return ratios;
}

/**
 * Apply saved ratios to a new total to get expected factor values.
 * @param {Record<string, number>} ratios
 * @param {number|null} newTotal
 * @returns {Record<string, number|null>}
 */
export function applyRatios(ratios, newTotal) {
  const result = {};
  for (const [name, ratio] of Object.entries(ratios)) {
    result[name] = newTotal !== null && newTotal !== 0
      ? parseFloat((ratio * newTotal).toFixed(4))
      : null;
  }
  return result;
}

/**
 * Sum all values in a numeric object.
 * @param {Record<string, number|null>} obj
 * @returns {number}
 */
export function sumValues(obj) {
  return Object.values(obj).reduce((s, v) => s + (v || 0), 0);
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Convert a scenario name to a safe file slug (max 40 chars).
 * @param {string} name
 * @returns {string}
 */
export function toSlug(name) {
  return (name || 'scenario')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .slice(0, 40);
}

/**
 * Extract a numeric value from a panel text using a regex.
 * @param {string} text
 * @param {RegExp} pattern - Must have a capture group for the number
 * @returns {number|null}
 */
export function extractNumber(text, pattern) {
  const match = text.match(pattern);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
}

// ─── Opinion ID extractor ─────────────────────────────────────────────────────

/**
 * Extract the opinion ID from a save-opinion API response body.
 * @param {object|null} body
 * @returns {number|string|null}
 */
export function extractOpinionId(body) {
  if (!body) return null;
  return body.id ?? body.data?.id ?? body.opinion?.id ?? body.opinionId ?? null;
}

// ─── Opinion result file helpers ──────────────────────────────────────────────

export function saveAdminOpinionResult(data) {
  saveJson('output/admin-opinion-result.json', data);
}

export function saveAfmOpinionResult(data) {
  saveJson('output/affiliate-manager-opinion-result.json', data);
}

export function saveSubAgentOpinionResult(data) {
  saveJson('output/sub-agent-opinion-result.json', data);
}

/**
 * Merge new fields into the shared opinion data file.
 * Creates the file on first call.
 * @param {object} data
 */
export function saveSharedOpinionData(data) {
  const filePath = 'output/shared-opinion-data.json';
  let existing = {};
  try { existing = loadJson(filePath); } catch { /* first write */ }
  saveJson(filePath, { ...existing, ...data, updatedAt: new Date().toISOString() });
}

/**
 * Read the shared opinion data file written by previous tests.
 * Returns an empty object if the file does not exist yet.
 * @returns {object}
 */
export function readSharedOpinionData() {
  try { return loadJson('output/shared-opinion-data.json'); } catch { return {}; }
}
