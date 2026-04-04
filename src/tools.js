// ============================================
// TOOLS - Agent's superpowers for locator extraction
// ============================================
// Tools for: browsing, logging in, extracting DOM, analyzing elements,
// and saving locators to Page Object files.

import { navigateTo, getPage, extractPageSnapshot, closeBrowser } from "./browser.js";
import { saveLocators, appendLocators } from "./locator-store.js";

// --- Tool Definitions (sent to Claude so it knows what tools exist) ---

export const toolDefinitions = [
  {
    name: "open_url",
    description:
      "Open a URL in the browser. Use this as the first step to navigate to a web page. The browser will be visible so you can see what's happening.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to open, e.g. 'https://example.com/login'",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "fill_input",
    description:
      "Type text into an input field on the page. Use CSS selector, placeholder, or label to identify the field.",
    input_schema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector, placeholder text, or label text to find the input field. Examples: '#username', '[placeholder=\"Email\"]', 'input[name=\"password\"]'",
        },
        value: {
          type: "string",
          description: "The text to type into the input field",
        },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "click_element",
    description:
      "Click on an element on the page (button, link, checkbox, etc). Use CSS selector or text content to identify it.",
    input_schema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector or text to find the element. Examples: '#login-btn', 'button:has-text(\"Submit\")', 'a:has-text(\"Sign In\")'",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "wait_for_navigation",
    description:
      "Wait for the page to finish loading after a click or form submission. Use after clicking login/submit buttons.",
    input_schema: {
      type: "object",
      properties: {
        timeout: {
          type: "number",
          description: "Max time to wait in milliseconds (default: 5000)",
        },
      },
      required: [],
    },
  },
  {
    name: "extract_page_elements",
    description:
      "Extract all interactive elements from the current page. Returns a structured snapshot of inputs, buttons, links, forms, etc. with their attributes. Use this to analyze the page and find locators.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_page_info",
    description: "Get basic info about the current page: URL, title, and element count.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "save_locators_to_file",
    description:
      "Save extracted locators to a Page Object file. The file will be created under the /locators/ folder and can be imported in Playwright tests. Each locator should have: name (camelCase variable name), selector, method (getByTestId|getByRole|getByLabel|getByPlaceholder|getByText|locator), description (what the element does), tag (HTML tag), type (input type if applicable), label (visible label text).",
    input_schema: {
      type: "object",
      properties: {
        pageName: {
          type: "string",
          description: "Human-readable page name, e.g. 'Login Page', 'Dashboard', 'User Settings'",
        },
        url: {
          type: "string",
          description: "The URL of the page these locators belong to",
        },
        locators: {
          type: "array",
          description: "Array of locator objects to save",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "camelCase variable name, e.g. 'usernameInput', 'loginButton'",
              },
              selector: {
                type: "string",
                description: "The locator value - CSS selector, test ID, label text, etc.",
              },
              method: {
                type: "string",
                enum: ["getByTestId", "getByRole", "getByLabel", "getByPlaceholder", "getByText", "locator"],
                description: "Which Playwright locator method to use",
              },
              description: {
                type: "string",
                description: "Functional description of what this element does",
              },
              tag: {
                type: "string",
                description: "HTML tag name (input, button, a, select, etc.)",
              },
              type: {
                type: "string",
                description: "Input type if applicable (text, password, email, submit, etc.)",
              },
              label: {
                type: "string",
                description: "Visible label text associated with this element",
              },
              fallbackSelector: {
                type: "string",
                description: "A backup CSS selector in case the primary one fails",
              },
            },
            required: ["name", "selector", "method", "description", "tag"],
          },
        },
      },
      required: ["pageName", "url", "locators"],
    },
  },
  {
    name: "append_locators_to_file",
    description:
      "Add new locators to an existing Page Object file. Use this when visiting a new section of the same page or adding locators for new features.",
    input_schema: {
      type: "object",
      properties: {
        pageName: {
          type: "string",
          description: "The page name (must match an existing file), e.g. 'Login Page'",
        },
        locators: {
          type: "array",
          description: "Array of new locator objects to append (same format as save_locators_to_file)",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              selector: { type: "string" },
              method: { type: "string" },
              description: { type: "string" },
              tag: { type: "string" },
              type: { type: "string" },
              label: { type: "string" },
              fallbackSelector: { type: "string" },
            },
            required: ["name", "selector", "method", "description", "tag"],
          },
        },
      },
      required: ["pageName", "locators"],
    },
  },
  {
    name: "take_screenshot",
    description: "Take a screenshot of the current page. Useful for debugging or verifying the page state.",
    input_schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Filename for the screenshot (saved in /screenshots/ folder)",
        },
      },
      required: [],
    },
  },
  {
    name: "close_browser",
    description: "Close the browser when done with all tasks.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// --- Tool Handlers ---

const toolHandlers = {
  async open_url({ url }) {
    try {
      await navigateTo(url);
      const page = getPage();
      const title = await page.title();
      return { success: true, url, title, message: `Opened ${url} - Page title: "${title}"` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async fill_input({ selector, value }) {
    const page = getPage();
    if (!page) return { success: false, error: "Browser not open. Use open_url first." };
    try {
      let element;
      if (selector.startsWith("#") || selector.startsWith("[") || selector.startsWith("input") || selector.startsWith(".")) {
        element = page.locator(selector);
      } else {
        element = page.getByPlaceholder(selector).or(page.getByLabel(selector));
      }
      await element.first().fill(value);
      return {
        success: true,
        message: `Filled "${selector}" with value`,
      };
    } catch (err) {
      return { success: false, error: `Could not fill "${selector}": ${err.message}` };
    }
  },

  async click_element({ selector }) {
    const page = getPage();
    if (!page) return { success: false, error: "Browser not open. Use open_url first." };
    try {
      let element;
      if (selector.startsWith("#") || selector.startsWith("[") || selector.startsWith(".") || selector.includes(":has-text")) {
        element = page.locator(selector);
      } else {
        element = page.getByText(selector, { exact: false }).or(page.getByRole("button", { name: selector }));
      }
      await element.first().click();
      await page.waitForTimeout(1000);
      return { success: true, message: `Clicked "${selector}"` };
    } catch (err) {
      return { success: false, error: `Could not click "${selector}": ${err.message}` };
    }
  },

  async wait_for_navigation({ timeout = 5000 }) {
    const page = getPage();
    if (!page) return { success: false, error: "Browser not open." };
    try {
      await page.waitForLoadState("domcontentloaded", { timeout });
      await page.waitForTimeout(2000);
      const url = page.url();
      const title = await page.title();
      return { success: true, url, title };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async extract_page_elements() {
    try {
      const snapshot = await extractPageSnapshot();
      return {
        success: true,
        url: snapshot.url,
        title: snapshot.title,
        totalElements: snapshot.elementCount,
        elements: snapshot.elements,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async get_page_info() {
    const page = getPage();
    if (!page) return { success: false, error: "Browser not open." };
    const url = page.url();
    const title = await page.title();
    return { success: true, url, title };
  },

  async save_locators_to_file({ pageName, url, locators }) {
    try {
      const result = saveLocators(pageName, url, locators);
      return { success: true, ...result, message: `Saved ${locators.length} locators for "${pageName}"` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async append_locators_to_file({ pageName, locators }) {
    try {
      const result = appendLocators(pageName, locators);
      if (result.error) return { success: false, error: result.error };
      return { success: true, ...result, message: `Appended ${locators.length} locators to "${pageName}"` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async take_screenshot({ filename = "screenshot" }) {
    const page = getPage();
    if (!page) return { success: false, error: "Browser not open." };
    try {
      const { existsSync, mkdirSync } = await import("fs");
      const dir = "screenshots";
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const path = `${dir}/${filename.replace(/[^a-z0-9_-]/gi, "_")}.png`;
      await page.screenshot({ path, fullPage: true });
      return { success: true, path, message: `Screenshot saved to ${path}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async close_browser() {
    await closeBrowser();
    return { success: true, message: "Browser closed." };
  },
};

// --- Execute a tool by name ---

export async function executeTool(name, args) {
  const handler = toolHandlers[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }
  console.log(`\n🔧 Tool: ${name}`);
  console.log(`   Input: ${JSON.stringify(args).substring(0, 200)}`);
  const result = await handler(args);
  const resultStr = JSON.stringify(result);
  console.log(`   Output: ${resultStr.substring(0, 300)}${resultStr.length > 300 ? "..." : ""}`);
  return result;
}
