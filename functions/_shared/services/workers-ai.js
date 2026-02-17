import { runWithTools } from '@cloudflare/ai-utils';
import { toolDefinitions, executeTool } from '../tools/index.js';
import { getSystemPrompt } from '../prompts/system-prompt.js';

export class WorkersAIService {
  constructor(ai, fredService) {
    this.ai = ai;
    this.fredService = fredService;
    this.model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  }

  async chat(userMessage, conversationHistory = []) {
    // Pre-fetch current rates to inject into system prompt
    let ratesContext = '';
    try {
      const rates = await this.fredService.getCurrentRates();
      ratesContext = `## Current Rates (Live Data)\n- 30-year fixed: ${rates.rate30Year}% (as of ${rates.date})\n- 15-year fixed: ${rates.rate15Year}% (as of ${rates.date})\nSource: Federal Reserve (FRED)\nYou can reference these rates directly without calling the get_current_rates tool.`;
    } catch (e) {
      // Rates unavailable — tools can still fetch them
    }

    const systemPrompt = getSystemPrompt(ratesContext);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const tools = this.buildTools();

    const response = await runWithTools(this.ai, this.model, {
      messages,
      tools,
    });

    const responseText = typeof response === 'string'
      ? response
      : response?.response || '';

    return {
      response: responseText || 'I apologize, I was unable to generate a response. Please try again.',
      usage: { input: 0, output: 0 },
    };
  }

  buildTools() {
    const fredService = this.fredService;

    return toolDefinitions.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
      function: async (args) => {
        try {
          const result = await executeTool(tool.name, args, fredService);
          return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (error) {
          return JSON.stringify({ error: error.message || 'Tool execution failed' });
        }
      },
    }));
  }
}
