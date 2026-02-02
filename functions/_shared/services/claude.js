import { toolDefinitions, executeTool } from '../tools/index.js';
import { SYSTEM_PROMPT } from '../prompts/system-prompt.js';

export class ClaudeService {
  constructor(apiKey, fredService) {
    this.apiKey = apiKey;
    this.fredService = fredService;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-sonnet-4-20250514';
  }

  async chat(userMessage, conversationHistory = []) {
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: 'user',
      content: userMessage,
    });

    let response = await this.makeRequest(messages);
    let totalInputTokens = response.usage.input_tokens;
    let totalOutputTokens = response.usage.output_tokens;

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        block => block.type === 'tool_use'
      );

      const toolResults = await Promise.all(
        toolUseBlocks.map(async toolUse => {
          try {
            const result = await executeTool(
              toolUse.name,
              toolUse.input,
              this.fredService
            );
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            };
          } catch (error) {
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            };
          }
        })
      );

      messages.push({
        role: 'assistant',
        content: response.content,
      });

      messages.push({
        role: 'user',
        content: toolResults,
      });

      response = await this.makeRequest(messages);
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
    }

    const textBlocks = response.content.filter(
      block => block.type === 'text'
    );
    const responseText = textBlocks.map(block => block.text).join('\n');

    return {
      response: responseText,
      usage: {
        input: totalInputTokens,
        output: totalOutputTokens,
      },
    };
  }

  async makeRequest(messages) {
    const request = {
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    return response.json();
  }
}
