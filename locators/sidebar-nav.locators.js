// ============================================
// Page: Sidebar Navigation (Common across all pages)
// URL:  https://stage.crexagent.com/*
// App:  CREX Agent (Vuetify v-navigation-drawer)
// Generated: 2026-03-29
// ============================================
// Usage in Playwright:
//   import { locators, getLocator } from './locators/sidebar-nav.locators.js';
//   await getLocator(page, 'propertiesNav').click();
//   await getLocator(page, 'settingsNav').click();
// ============================================

export const pageName = "Sidebar Navigation";

export const pageUrl = "https://stage.crexagent.com";

export const locators = {
  // Main sidebar / left navigation drawer container
  // Element: <nav> | Vuetify: v-navigation-drawer
  sidebarNav: {
    selector: 'nav.v-navigation-drawer',
    method: 'locator',
  },

  // Affiliate Managers navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Affiliate Managers
  affiliateManagersNav: {
    selector: 'Affiliate Managers',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Affiliate Managers")',
  },

  // Sub Agents navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Sub Agents
  subAgentsNav: {
    selector: 'Sub Agents',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Sub Agents")',
  },

  // Properties navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Properties
  propertiesNav: {
    selector: 'Properties',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Properties")',
  },

  // Saved Opinions navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Saved Opinions
  savedOpinionsNav: {
    selector: 'Saved Opinions',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Saved Opinions")',
  },

  // Saved Valuations navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Saved Valuations
  savedValuationsNav: {
    selector: 'Saved Valuations',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Saved Valuations")',
  },

  // Settings navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Settings
  settingsNav: {
    selector: 'Settings',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Settings")',
  },

  // Transactions navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Transactions
  transactionsNav: {
    selector: 'Transactions',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Transactions")',
  },

  // Knowledge Base navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Knowledge Base
  knowledgeBaseNav: {
    selector: 'Knowledge Base',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Knowledge Base")',
  },

  // Enquiry Submitted navigation item in left sidebar
  // Element: <div> | v-list-item
  // Label: Enquiry Submitted
  enquirySubmittedNav: {
    selector: 'Enquiry Submitted',
    method: 'getByText',
    fallback: 'nav .v-list-item:has-text("Enquiry Submitted")',
  },

  // Home breadcrumb link at top of page
  // Element: <a> | href: /
  homeBreadcrumb: {
    selector: 'a.v-breadcrumbs-item--link:has-text("Home")',
    method: 'locator',
    fallback: 'a[href="/"]',
  },

  // Notification bell icon in top header
  // Element: <button> or <i>
  notificationBell: {
    selector: '.v-toolbar button.v-btn--icon:first-of-type',
    method: 'locator',
  },

  // User profile / avatar dropdown in top-right corner
  // Element: <div>
  userProfileDropdown: {
    selector: '.v-toolbar .v-avatar',
    method: 'locator',
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
