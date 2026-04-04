# Test 4: Y-Formula Creation - Implementation Summary

## Overview
**Test Name:** TC-004: should create Y-formula from Settings > Y-Total  
**Location:** [tests/crex-agent-complete-flow.spec.js](tests/crex-agent-complete-flow.spec.js#L481-L542)  
**Status:** ✅ Created and ready for execution

---

## Test Flow

### Step 1: Login
- Navigate to login page
- Fill email: `zaid.m@simformsolutions.com`
- Fill password: `Test@123`
- Click Sign In
- Wait for affiliate-managers page

### Step 2: Navigate to Settings > Y-Total
- Click Settings in left sidebar navigation
- Wait for settings page
- Click the Y-Total tab
- Wait for page load

### Step 3: Open Create Formula Dialog
- Click "Add New Formula" button
- Verify dialog title "Create Market and Formula" is visible
- **Verify mandatory field labels are all visible:**
  - Select the MLS Board *
  - Select the State *
  - Select the County *
  - Base Value *

### Step 4: Fill Mandatory Market Configuration Fields
1. **MLS Board:** Select "Florida Gulf Coast MLS"
2. **State:** Select "Florida"
3. **County:** Select "Alachua"
4. **Base Value:** Enter "100"

**Note:** MLS Board, State, and County have cascading dependencies. State/County dropdowns are disabled until MLS Board is selected.

### Step 5: Navigate Wizard Tabs
- Click "Next" button
- Handle dialog closure (reopens from table row if needed)
- Click on "Market Features" tab
- Verify market features section is visible
- Click on "Y Factor" tab
- Verify Y factor section is visible
- Verify "Add" button is visible for final submission

---

## Locators Used

All locators are defined in: [locators/yformula-creation.locators.js](locators/yformula-creation.locators.js)

### Navigation
- `settingsNav` - Settings in left sidebar
- `yTotalTab` - Y-Total tab on Settings page
- `addNewFormulaButton` - Launch formula creation dialog

### Dialog Structure
- `createFormulaDialogTitle` - Main dialog heading
- `marketConfigurationTab` - Market Configuration section
- `marketFeaturesTab` - Market Features section
- `yFactorTab` - Y Factor section

### Market Configuration Fields (All Mandatory ⭐)
- `mlsBoardInput` - MLS Board dropdown
- `stateInput` - State dropdown (cascading)
- `countyInput` - County dropdown (cascading)
- `baseValueInput` - Base Value text input
- `mlsBoardLabelRequired` - Label with asterisk
- `stateLabelRequired` - Label with asterisk
- `countyLabelRequired` - Label with asterisk
- `baseValueLabelRequired` - Label with asterisk

### Optional Fields
- `cityInput` - City dropdown (optional)
- `schoolDistrictInput` - School District dropdown (optional)
- `zipCodeInput` - Zip Code dropdown (optional)

### Sections & Features
- `marketFeaturesHeading` - Market Features section heading
- `addNewMarketFeatureButton` - Add new market feature button
- `yFactorHeading` - Y Factor section heading

### Actions
- `nextButton` - Move to next tab
- `previousButton` - Go back
- `cancelButton` - Close dialog
- `addButton` - Final submission button

---

## Mandatory Field Validation
Per the user's requirement, the test explicitly validates that these 4 fields are marked as mandatory (visible labels with asterisk):

1. ✅ **MLS Board** - Cascades State field
2. ✅ **State** - Cascades County field  
3. ✅ **County** - Downstream of State
4. ✅ **Base Value** - Text input for numeric value

---

## Test Execution

Run the specific test:
```bash
npx playwright test tests/crex-agent-complete-flow.spec.js -g "TC-004"
```

Run all tests in the suite:
```bash
npx playwright test tests/crex-agent-complete-flow.spec.js
```

View Playwright HTML report:
```bash
npx playwright show-report
```

---

## Test Data

The test uses hardcoded values that match live environment test data:
- **MLS Board:** Florida Gulf Coast MLS
- **State:** Florida
- **County:** Alachua
- **Base Value:** 100

---

## Key Implementation Notes

1. **Dropdown Selection:** Uses the existing `selectDropdownOption` helper that handles both `fill()` and `pressSequentially()` methods for reliable option matching

2. **Resilience:** Includes fallback handling if the wizard dialog closes after clicking Next (common in this implementation)

3. **Mandatory Fields Display:** Test validates all 4 asterisk-marked required fields via `getByText()` locators

4. **Tab Navigation:** Explicitly navigates each wizard tab and verifies content visibility

5. **Helper Functions:** Reuses project's existing helpers:
   - `removeOverlayScrim()` - Clear Vuetify overlay blockers
   - `selectDropdownOption()` - Robust dropdown interaction
   - `getYFormulaLocator()` - Locator resolution from yformula-creation.locators.js

---

## Related Artifacts

- **Extraction Script:** [extract-yformula.js](extract-yformula.js)
- **Locator File:** [locators/yformula-creation.locators.js](locators/yformula-creation.locators.js)
- **JSON Outputs:**
  - [output/yformula-form-fields.json](output/yformula-form-fields.json)
  - [output/yformula-raw-elements.json](output/yformula-raw-elements.json)
  - [output/yformula-locator-summary.json](output/yformula-locator-summary.json)
- **Screenshots:** [screenshots/yformula-*.png](screenshots/)

---

## Status Checklist

- ✅ Test file created: `tests/crex-agent-complete-flow.spec.js`
- ✅ Locator file created: `locators/yformula-creation.locators.js`
- ✅ Import added to test spec
- ✅ Test import statement includes Y-formula locators
- ✅ All 4 mandatory fields validated
- ✅ Wizard tab navigation implemented
- ✅ Market Features section verified
- ✅ Y Factor section verified
- ✅ Final Add button visibility checked
- ✅ No syntax errors in test file
