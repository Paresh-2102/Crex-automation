/**
 * Claude AI Error Analyzer
 * 
 * When a test fails, sends the error details to Claude AI to get:
 *   1. Root cause analysis
 *   2. Suggested fix
 *   3. Prevention strategy
 * 
 * Also checks against known issues to avoid repeat analysis.
 */
import Anthropic from '@anthropic-ai/sdk';
import { findKnownIssue, markErrorResolved, logError } from './test-tracker.js';

let anthropic = null;

function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

const ANALYSIS_PROMPT = `You are a senior Playwright test automation expert. Analyze this test failure and provide:

1. **Root Cause**: What exactly went wrong and why
2. **Fix Suggestion**: Specific code changes to fix it
3. **Prevention**: How to prevent this in the future

Be concise and actionable. Focus on Playwright-specific issues like:
- Selector problems (element not found, multiple matches, timing)
- Navigation/loading issues
- Vuetify component quirks (overlay scrims, v-autocomplete dual elements)
- Network/timeout issues
- State management between tests

Format your response clearly with the 3 sections.`;

/**
 * Analyze a test error using Claude AI
 */
export async function analyzeError({ testName, testSteps, error, screenshot }) {
  // First check if this is a known issue
  const known = findKnownIssue(typeof error === 'string' ? error : error.message);
  if (known) {
    return {
      isKnown: true,
      knownResolution: known.resolution,
      analysis: null,
    };
  }

  const client = getClient();
  if (!client) {
    return {
      isKnown: false,
      analysis: {
        rootCause: 'Claude AI not available (no API key). Set ANTHROPIC_API_KEY in .env',
        fixSuggestion: 'Add your Anthropic API key to analyze errors automatically.',
        prevention: 'N/A',
      },
    };
  }

  const errorText = typeof error === 'string' ? error : `${error.message}\n\nStack:\n${error.stack || ''}`;

  const userMessage = `Test Failed: "${testName}"

Test Steps:
${testSteps || 'Not provided'}

Error:
${errorText}

${screenshot ? `Screenshot saved at: ${screenshot}` : 'No screenshot available.'}

Please analyze this failure.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Parse the 3 sections from Claude's response
    const analysis = parseAnalysis(text);

    return {
      isKnown: false,
      analysis,
      rawResponse: text,
    };
  } catch (err) {
    return {
      isKnown: false,
      analysis: {
        rootCause: `AI analysis failed: ${err.message}`,
        fixSuggestion: 'Check your API key and try again.',
        prevention: 'N/A',
      },
    };
  }
}

/**
 * Parse Claude's analysis into structured sections
 */
function parseAnalysis(text) {
  const sections = {
    rootCause: '',
    fixSuggestion: '',
    prevention: '',
  };

  // Try to extract sections by headers
  const rootMatch = text.match(/\*?\*?Root Cause\*?\*?:?\s*([\s\S]*?)(?=\*?\*?Fix|$)/i);
  const fixMatch = text.match(/\*?\*?Fix Suggestion\*?\*?:?\s*([\s\S]*?)(?=\*?\*?Prevention|$)/i);
  const preventMatch = text.match(/\*?\*?Prevention\*?\*?:?\s*([\s\S]*?)$/i);

  sections.rootCause = rootMatch?.[1]?.trim() || text.substring(0, 200);
  sections.fixSuggestion = fixMatch?.[1]?.trim() || '';
  sections.prevention = preventMatch?.[1]?.trim() || '';

  return sections;
}

/**
 * Format error analysis for display
 */
export function formatAnalysis(result) {
  if (result.isKnown) {
    return `
  ⚠️  KNOWN ISSUE
  Resolution: ${result.knownResolution}
  (This error was seen before and tracked)`;
  }

  const a = result.analysis;
  return `
  🔍 AI ERROR ANALYSIS
  ${'─'.repeat(50)}
  
  Root Cause:
    ${(a.rootCause || 'Unknown').split('\n').join('\n    ')}
  
  Fix Suggestion:
    ${(a.fixSuggestion || 'None').split('\n').join('\n    ')}
  
  Prevention:
    ${(a.prevention || 'None').split('\n').join('\n    ')}
  ${'─'.repeat(50)}`;
}
