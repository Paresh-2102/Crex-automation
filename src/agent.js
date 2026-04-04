// ============================================
// AGENT - Locator extraction brain powered by Claude
// ============================================
// This agent:
//   1. Opens websites in a real browser
//   2. Logs in with credentials
//   3. Extracts DOM elements
//   4. Uses Claude to pick the best, unique Playwright locators
//   5. Saves them to Page Object files

import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeTool } from "./tools.js";

// --- Initialize the Anthropic client ---
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// --- System prompt: tells the agent its purpose and locator strategy ---
const SYSTEM_PROMPT = `You are an expert Playwright test automation engineer.
Your job is to browse websites, analyze their DOM, and extract the BEST locators for Playwright automation.

LOCATOR PRIORITY (best to worst):
1. data-testid → Most stable, won't break with UI changes
2. getByRole (with accessible name) → Accessible and resilient
3. getByLabel → Great for form inputs with labels
4. getByPlaceholder → Good for inputs with placeholder text
5. getByText → For buttons/links with unique text
6. CSS selector (id, name, unique class) → Fallback option

RULES FOR GOOD LOCATORS:
- NEVER use auto-generated classes (e.g. 'css-1a2b3c', 'sc-abc123', 'MuiButton-root')
- NEVER use indexes/nth-child unless absolutely no other option
- Each locator MUST be unique on the page (no duplicates)
- Use descriptive camelCase names: 'loginButton', 'emailInput', 'forgotPasswordLink'
- Add a clear functional description for each locator
- Include the visible label text when available
- Provide a fallback CSS selector when possible

WORKFLOW:
1. Open the URL with open_url
2. If credentials are provided, fill them in and log in
3. Wait for page to load
4. Use extract_page_elements to get the DOM snapshot
5. Analyze all elements and select the best locators
6. Save locators using save_locators_to_file
7. Report what you found

Always explain your locator choices and why they're reliable.`;

// --- The Agent class ---
export class Agent {
  constructor() {
    this.messages = [];
    this.maxIterations = 20; // More iterations needed for browser workflows
  }

  async chat(userMessage) {
    this.messages.push({ role: "user", content: userMessage });

    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;
      console.log(`\n--- Agent thinking (iteration ${iterations}/${this.maxIterations}) ---`);

      // Call Claude with conversation history + available tools
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: this.messages,
        tools: toolDefinitions,
      });

      // Check the stop reason to understand what Claude wants to do
      if (response.stop_reason === "tool_use") {
        // Claude wants to use tools - process all tool calls
        const assistantContent = response.content;
        this.messages.push({ role: "assistant", content: assistantContent });

        // Execute each tool call and collect results
        const toolResults = [];
        for (const block of assistantContent) {
          if (block.type === "tool_use") {
            const result = await executeTool(block.name, block.input);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        // Feed tool results back to Claude
        this.messages.push({ role: "user", content: toolResults });
        continue;
      }

      // Claude is done - extract the text response
      const textBlocks = response.content.filter((b) => b.type === "text");
      const finalResponse = textBlocks.map((b) => b.text).join("\n");

      this.messages.push({ role: "assistant", content: response.content });
      return finalResponse;
    }

    return "Hit the maximum iteration limit. The task may need to be broken into smaller steps.";
  }

  reset() {
    this.messages = [];
    console.log("\n🔄 Conversation reset.\n");
  }
}
