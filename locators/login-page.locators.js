// ============================================
// Page: Login Page
// URL:  https://stage.crexagent.com/login
// App:  CREX Agent (Vuetify-based)
// Generated: 2026-03-29
// ============================================
// Usage in Playwright:
//   import { locators, getLocator } from './locators/login-page.locators.js';
//   await getLocator(page, 'emailInput').fill('user@example.com');
//   await getLocator(page, 'passwordInput').fill('Test@123');
//   await getLocator(page, 'signInButton').click();
// ============================================

export const pageName = "Login Page";

export const pageUrl = "https://stage.crexagent.com/login";

export const locators = {
  // Email address input field for user authentication
  // Element: <input> | Type: text
  // Label: Email
  emailInput: {
    selector: 'Email',
    method: 'getByLabel',
    fallback: 'input[placeholder="E.g. john.doe@crexagent.com"]',
  },

  // Password input field for user authentication
  // Element: <input> | Type: password
  // Label: Password
  passwordInput: {
    selector: 'Password',
    method: 'getByLabel',
    fallback: 'input[type="password"]',
  },

  // Toggle password visibility (eye icon) next to password field
  // Element: <i> | Role: button
  // Label: appended action
  passwordVisibilityToggle: {
    selector: '.v-field__append-inner [role="button"]',
    method: 'locator',
    fallback: 'i[aria-label=" appended action"]',
  },

  // Remember login checkbox to stay signed in for 30 days
  // Element: <input> | Type: checkbox
  // Label: Remember for 30 days
  rememberCheckbox: {
    selector: 'Remember for 30 days',
    method: 'getByLabel',
    fallback: 'input[aria-label="Remember for 30 days"]',
  },

  // Link to navigate to the forgot password page
  // Element: <a> | href: /forgot-password
  // Label: Forgot password ?
  forgotPasswordLink: {
    selector: 'Forgot password ?',
    method: 'getByText',
    fallback: 'a.forgot-password-link',
  },

  // Primary sign in / submit button to authenticate
  // Element: <button> | Type: submit
  // Label: Sign in
  signInButton: {
    selector: 'Sign in',
    method: 'getByRole',
    role: 'button',
    fallback: 'button[type="submit"].signin-btn',
  },

  // Login form container wrapping all authentication fields
  // Element: <form>
  loginForm: {
    selector: 'form.login-form',
    method: 'locator',
  },

  // Page heading "Login to your account"
  // Element: <h1>
  pageHeading: {
    selector: 'Login to your account',
    method: 'getByText',
    fallback: 'h1.text-heading-sm-600',
  },
};

// Helper: get Playwright locator from page
export function getLocator(page, name) {
  const loc = locators[name];
  if (!loc) throw new Error(`Locator "${name}" not found in ${pageName}`);
  switch (loc.method) {
    case 'getByRole':      return page.getByRole(loc.role, { name: loc.selector });
    case 'getByTestId':    return page.getByTestId(loc.selector);
    case 'getByLabel':     return page.getByLabel(loc.selector);
    case 'getByPlaceholder': return page.getByPlaceholder(loc.selector);
    case 'getByText':      return page.getByText(loc.selector);
    case 'locator':        return page.locator(loc.selector);
    default:               return page.locator(loc.selector);
  }
}
