# CREX Agent — Playwright Automation Framework

A **Page Object Model (POM)** automation framework for the [CREX Agent](https://stage.crexagent.com) web application, built with Playwright + JavaScript.

---

## 📁 Project Structure

```
crex-automation/
│
├── tests/                          # Spec files — test logic & assertions only
│   ├── crex-agent-complete-flow.spec.js  # Full E2E flow (TC-001 → TC-007)
│   ├── crex-agent-login.spec.js          # Login & navigation smoke tests
│   └── crex-agent-filters.spec.js        # Market filters / features / Y-factors
│
├── pages/                          # Page Object Model classes
│   ├── BasePage.js                 # Shared helpers (wait, dropdown, scroll…)
│   ├── LoginPage.js                # Login page — email, password, sign-in
│   ├── SidebarNavPage.js           # Sidebar navigation
│   ├── PropertiesPage.js           # Properties filters & map interactions
│   ├── YFormulaPage.js             # Settings > Y-Total — formula wizard
│   └── OpinionPage.js              # Set Opinion form — fields & photos
│
├── locators/                       # Locator registries (selector definitions)
│   ├── login-page.locators.js
│   ├── sidebar-nav.locators.js
│   ├── properties-market-filters.locators.js
│   ├── market-features-filters.locators.js
│   ├── yfactor-filters.locators.js
│   ├── yformula-creation.locators.js
│   └── add-market-feature.locators.js
│
├── fixtures/
│   └── index.js                    # Playwright custom fixtures (auto-inject page objects)
│
├── utils/
│   ├── testData.js                 # Static constants — credentials, URLs, timeouts, factor defs
│   └── helpers.js                  # Pure JS helpers — math, file I/O, string utils
│
├── test-data/
│   ├── filter-input-template.xlsx  # Excel test data (market filters, features, scenarios)
│   └── read-excel-data.js          # Excel reader — returns typed data objects
│
├── output/                         # Auto-created test artefacts (JSON results)
├── test-results/                   # Screenshots / traces (Playwright output)
├── playwright-report/              # HTML test report
└── playwright.config.js            # Playwright configuration
```

---

## 🏗️ Architecture — POM Rules

| Layer | File location | Contains | Must NOT contain |
|---|---|---|---|
| **Locators** | `locators/*.js` | Selector strings & `getLocator()` factory | Assertions, actions |
| **Page Objects** | `pages/*.js` | Page actions & locator wrappers | Assertions, test data |
| **Fixtures** | `fixtures/index.js` | Page object injection | Actions, assertions |
| **Utils** | `utils/testData.js` | Constants / static data | Locators, actions |
| **Utils** | `utils/helpers.js` | Pure functions (math, I/O) | Playwright calls |
| **Specs** | `tests/*.spec.js` | Assertions & test flow | Raw locators, credentials |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- Chromium browser (installed via Playwright)

### Install & setup

```bash
npm install
npx playwright install chromium
```

### Run all tests

```bash
npx playwright test
```

### Run a single spec

```bash
npx playwright test tests/crex-agent-login.spec.js
```

### Run only TC-001

```bash
npx playwright test --grep "TC-001"
```

### Run with UI mode (headed + trace)

```bash
npx playwright test --ui
```

### View HTML report

```bash
npx playwright show-report
```

---

## 📊 Test Data

All test input is driven from `test-data/filter-input-template.xlsx`.  
The workbook contains five sheets:

| Sheet | Contents |
|---|---|
| Market Filters | MLS Board, State, County, City, Price range, etc. |
| Market Features Filters | Feature types, feature values, operators |
| Y-Factor Filters | Min/Max values per Y-factor |
| Y-Formula | Formula-level market configuration |
| BVT Scenarios | Multi-scenario base-value + Y-factor edit test cases |

Preview the data:
```bash
node test-data/read-excel-data.js
```

---

## 🧪 Test Cases

| ID | Description | Status |
|---|---|---|
| TC-001 | Login | `test.only` (active) |
| TC-002 | Full filter flow | `test.skip` |
| TC-003 | Click blue dot & view detail | `test.skip` |
| TC-004 | Create Y-Formula | `test.skip` |
| TC-005 | Set Opinion flow | `test.skip` |
| TC-006 | Edit Y-Formula → verify opinion updates | `test.skip` |
| TC-007 | BVT scenarios from Excel | Active |
| TC-L-001 | Login page elements | Active |
| TC-L-002 | Successful login | Active |
| TC-L-003 | Properties dialog smoke | Active |
| TC-F-001 | Fill all market filters | Active |
| TC-F-002 | Add market features | Active |
| TC-F-003 | Full filter pipeline | Active |

---

## 🔧 Configuration

Edit `playwright.config.js` to change:
- `baseURL` — switch between `stage` and `prod`
- `headless` — `true` for CI, `false` for local development
- `workers` — increase for parallel execution (currently `1`)
- `timeout` — global per-test timeout

---

## ✅ POM Best Practices Used

- ✅ Locators are **private** (prefixed `_`) inside page classes
- ✅ Page actions encapsulate all Playwright interactions
- ✅ Spec files contain **only** test flow and `expect()` assertions
- ✅ Custom fixtures inject page objects automatically
- ✅ `BasePage` provides shared utilities (waits, dropdowns, scroll)
- ✅ `utils/testData.js` is the single source of truth for constants
- ✅ `utils/helpers.js` contains reusable pure functions
- ✅ No raw credentials or selectors in spec files
