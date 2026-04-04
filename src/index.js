// ============================================
// ENTRY POINT - Playwright Locator Extraction Agent
// ============================================
// Run with: npm start
// The agent will open a browser, navigate pages, and extract locators.
// Type "exit" to quit, "reset" to clear conversation.

import "dotenv/config";
import { createInterface } from "readline";
import { Agent } from "./agent.js";
import { closeBrowser } from "./browser.js";

// --- Check for API key ---
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-anthropic-api-key-here") {
  console.error("\n❌ ERROR: Please set your Anthropic API key in the .env file!");
  console.error("   1. Go to https://console.anthropic.com/settings/keys");
  console.error("   2. Create a new API key");
  console.error("   3. Paste it in the .env file\n");
  process.exit(1);
}

// --- Create the agent ---
const agent = new Agent();

// --- Set up the interactive terminal ---
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question("\n🧑 You: ", async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      prompt();
      return;
    }

    if (trimmed.toLowerCase() === "exit") {
      console.log("\n🌐 Closing browser...");
      await closeBrowser();
      console.log("👋 Goodbye!\n");
      rl.close();
      return;
    }

    if (trimmed.toLowerCase() === "reset") {
      agent.reset();
      prompt();
      return;
    }

    try {
      const response = await agent.chat(trimmed);
      console.log(`\n🤖 Agent: ${response}`);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (error.message.includes("401") || error.message.includes("authentication")) {
        console.error("   → Check your ANTHROPIC_API_KEY in .env");
      }
    }

    prompt();
  });
}

// Handle Ctrl+C gracefully
process.on("SIGINT", async () => {
  console.log("\n\n🌐 Closing browser...");
  await closeBrowser();
  console.log("👋 Goodbye!\n");
  process.exit(0);
});

// --- Start the agent ---
console.log("╔════════════════════════════════════════════════════╗");
console.log("║   🔍 Playwright Locator Extraction Agent           ║");
console.log("║   Powered by Claude                                ║");
console.log("╠════════════════════════════════════════════════════╣");
console.log("║  Commands:                                         ║");
console.log("║    exit  - Close browser & quit                    ║");
console.log("║    reset - Clear conversation history              ║");
console.log("║                                                    ║");
console.log("║  Example prompts:                                  ║");
console.log("║    'Open https://demo.site/login and find all      ║");
console.log("║     locators on the login page'                    ║");
console.log("║                                                    ║");
console.log("║    'Login with user admin@test.com pass Test123    ║");
console.log("║     then extract dashboard locators'               ║");
console.log("║                                                    ║");
console.log("║    'Add locators for the sidebar navigation'       ║");
console.log("║                                                    ║");
console.log("║  Locators are saved to: /locators/ folder          ║");
console.log("╚════════════════════════════════════════════════════╝");

prompt();
