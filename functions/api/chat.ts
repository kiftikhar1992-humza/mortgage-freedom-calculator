import { CacheService } from '../_shared/services/cache';
import { FREDService } from '../_shared/services/fred';
import { ClaudeService } from '../_shared/services/claude';

interface Env {
  FRED_CACHE: KVNamespace;
  FRED_API_KEY: string;
  ANTHROPIC_API_KEY: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: ChatRequest = await request.json();

    if (!body.message || typeof body.message !== 'string') {
      return Response.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    if (body.message.length > 2000) {
      return Response.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    const history = (body.conversationHistory || []).slice(-10);

    // Initialize services
    const cacheService = new CacheService(env.FRED_CACHE);
    const fredService = new FREDService(env.FRED_API_KEY, cacheService);
    const claudeService = new ClaudeService(env.ANTHROPIC_API_KEY, fredService);

    const result = await claudeService.chat(body.message, history);

    return Response.json({
      response: result.response,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Chat error:', error);

    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
};
