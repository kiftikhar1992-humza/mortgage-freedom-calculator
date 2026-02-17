import { CacheService } from '../_shared/services/cache.js';
import { FREDService } from '../_shared/services/fred.js';
import { WorkersAIService } from '../_shared/services/workers-ai.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();

    if (!body.message || typeof body.message !== 'string') {
      return Response.json(
        { error: 'Missing required field: message' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.message.length > 2000) {
      return Response.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const history = (body.conversationHistory || []).slice(-10);

    const cacheService = new CacheService(env.FRED_CACHE);
    const fredService = new FREDService(env.FRED_API_KEY, cacheService);
    const aiService = new WorkersAIService(env.AI, fredService);

    const result = await aiService.chat(body.message, history);

    return Response.json({
      response: result.response,
      usage: result.usage,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Chat error:', error);

    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
    }

    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500, headers: corsHeaders }
    );
  }
}
