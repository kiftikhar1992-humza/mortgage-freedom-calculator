import { toolDefinitions, executeTool } from '../tools';
import { FREDService } from './fred';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}

interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

type ContentBlock = TextBlock | ToolUseBlock;

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system: string;
  tools: typeof toolDefinitions;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | ContentBlock[] | ToolResultBlock[];
  }>;
}

export class ClaudeService {
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';
  private readonly model = 'claude-sonnet-4-20250514';

  constructor(
    private apiKey: string,
    private fredService: FREDService
  ) {}

  async chat(
    userMessage: string,
    conversationHistory: Message[] = []
  ): Promise<{ response: string; usage: { input: number; output: number } }> {
    // Build messages array
    const messages: ClaudeRequest['messages'] = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add new user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    let response = await this.makeRequest(messages);
    let totalInputTokens = response.usage.input_tokens;
    let totalOutputTokens = response.usage.output_tokens;

    // Handle tool use in a loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use'
      );

      // Execute all tool calls
      const toolResults: ToolResultBlock[] = await Promise.all(
        toolUseBlocks.map(async toolUse => {
          try {
            const result = await executeTool(
              toolUse.name,
              toolUse.input,
              this.fredService
            );
            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: result,
            };
          } catch (error) {
            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            };
          }
        })
      );

      // Add assistant response with tool use
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Add tool results
      messages.push({
        role: 'user',
        content: toolResults,
      });

      // Get next response
      response = await this.makeRequest(messages);
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
    }

    // Extract text from final response
    const textBlocks = response.content.filter(
      (block): block is TextBlock => block.type === 'text'
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

  private async makeRequest(
    messages: ClaudeRequest['messages']
  ): Promise<ClaudeResponse> {
    const request: ClaudeRequest = {
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

  // Streaming version for better UX
  async *chatStream(
    userMessage: string,
    conversationHistory: Message[] = []
  ): AsyncGenerator<string, void, unknown> {
    // For simplicity, we'll use non-streaming and yield the full response
    // A full streaming implementation would use SSE
    const result = await this.chat(userMessage, conversationHistory);
    yield result.response;
  }
}
