// ============================================
// LOCATOR STORE - Page Object file manager
// ============================================
// Generates and updates Page Object files with locators.
// Each page gets its own file under /locators/ folder.
// Format is ready-to-use with Playwright.

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, resolve } from "path";

const LOCATORS_DIR = resolve("locators");

// Ensure the locators directory exists
function ensureDir() {
  if (!existsSync(LOCATORS_DIR)) {
    mkdirSync(LOCATORS_DIR, { recursive: true });
  }
}

// Convert a page name to a valid filename: "Login Page" → "login-page.locators.js"
function toFileName(pageName) {
  return (
    pageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + ".locators.js"
  );
}

// Build the file content from locators array
function buildFileContent(pageName, url, locators) {
  const lines = [];
  lines.push(`// ============================================`);
  lines.push(`// Page: ${pageName}`);
  lines.push(`// URL:  ${url}`);
  lines.push(`// Generated: ${new Date().toISOString()}`);
  lines.push(`// ============================================`);
  lines.push(`// Usage in Playwright:`);
  lines.push(`//   import { locators } from './locators/${toFileName(pageName)}';`);
  lines.push(`//   await page.locator(locators.usernameInput.selector).fill('admin');`);
  lines.push(`// ============================================\n`);
  lines.push(`export const pageName = "${pageName}";\n`);
  lines.push(`export const pageUrl = "${url}";\n`);
  lines.push(`export const locators = {`);

  for (const loc of locators) {
    lines.push(`  // ${loc.description}`);
    lines.push(`  // Element: <${loc.tag}> | Type: ${loc.type || "N/A"}`);
    if (loc.label) {
      lines.push(`  // Label: ${loc.label}`);
    }
    lines.push(`  ${loc.name}: {`);
    lines.push(`    selector: '${loc.selector.replace(/'/g, "\\'")}',`);
    lines.push(`    method: '${loc.method}', // ${getMethodHint(loc.method)}`);
    if (loc.fallbackSelector) {
      lines.push(`    fallback: '${loc.fallbackSelector.replace(/'/g, "\\'")}',`);
    }
    lines.push(`  },\n`);
  }

  lines.push(`};\n`);

  // Add a helper to get Playwright locator
  lines.push(`// Helper: get Playwright locator from page`);
  lines.push(`export function getLocator(page, name) {`);
  lines.push(`  const loc = locators[name];`);
  lines.push(`  if (!loc) throw new Error(\`Locator "\${name}" not found in ${pageName}\`);`);
  lines.push(`  switch (loc.method) {`);
  lines.push(`    case 'getByRole':      return page.getByRole(loc.role, { name: loc.selector });`);
  lines.push(`    case 'getByTestId':    return page.getByTestId(loc.selector);`);
  lines.push(`    case 'getByLabel':     return page.getByLabel(loc.selector);`);
  lines.push(`    case 'getByPlaceholder': return page.getByPlaceholder(loc.selector);`);
  lines.push(`    case 'getByText':      return page.getByText(loc.selector);`);
  lines.push(`    case 'locator':        return page.locator(loc.selector);`);
  lines.push(`    default:               return page.locator(loc.selector);`);
  lines.push(`  }`);
  lines.push(`}\n`);

  return lines.join("\n");
}

function getMethodHint(method) {
  const hints = {
    getByTestId: "Most stable - uses data-testid attribute",
    getByRole: "Accessible - uses ARIA role + name",
    getByLabel: "Form fields - uses associated label",
    getByPlaceholder: "Input fields - uses placeholder text",
    getByText: "Text content - visible text match",
    locator: "CSS/XPath selector - use as fallback",
  };
  return hints[method] || "CSS selector";
}

// Save locators to a page object file
export function saveLocators(pageName, url, locators) {
  ensureDir();
  const fileName = toFileName(pageName);
  const filePath = join(LOCATORS_DIR, fileName);
  const content = buildFileContent(pageName, url, locators);
  writeFileSync(filePath, content, "utf-8");
  console.log(`\n💾 Locators saved to: locators/${fileName}`);
  return { filePath, fileName, locatorCount: locators.length };
}

// Append new locators to an existing page object file
export function appendLocators(pageName, newLocators) {
  ensureDir();
  const fileName = toFileName(pageName);
  const filePath = join(LOCATORS_DIR, fileName);

  if (!existsSync(filePath)) {
    return { error: `File not found: ${fileName}. Use save_locators first.` };
  }

  let content = readFileSync(filePath, "utf-8");

  // Find the closing brace of the locators object
  const closingIndex = content.lastIndexOf("};");
  if (closingIndex === -1) {
    return { error: "Could not find locators object in file." };
  }

  // Build new locator entries
  const newLines = [];
  for (const loc of newLocators) {
    newLines.push(`  // ${loc.description}`);
    newLines.push(`  // Element: <${loc.tag}> | Type: ${loc.type || "N/A"}`);
    if (loc.label) {
      newLines.push(`  // Label: ${loc.label}`);
    }
    newLines.push(`  ${loc.name}: {`);
    newLines.push(`    selector: '${loc.selector.replace(/'/g, "\\'")}',`);
    newLines.push(`    method: '${loc.method}',`);
    if (loc.fallbackSelector) {
      newLines.push(`    fallback: '${loc.fallbackSelector.replace(/'/g, "\\'")}',`);
    }
    newLines.push(`  },\n`);
  }

  // Insert before the closing brace
  content = content.slice(0, closingIndex) + newLines.join("\n") + "\n" + content.slice(closingIndex);

  writeFileSync(filePath, content, "utf-8");
  console.log(`\n💾 Appended ${newLocators.length} locators to: locators/${fileName}`);
  return { filePath, fileName, appendedCount: newLocators.length };
}

// List all existing locator files
export function listLocatorFiles() {
  ensureDir();
  const files = readdirSync(LOCATORS_DIR).filter((f) => f.endsWith(".locators.js"));
  return files;
}
