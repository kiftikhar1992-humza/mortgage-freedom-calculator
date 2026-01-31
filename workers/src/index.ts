import { CacheService } from './services/cache';
import { FREDService } from './services/fred';
import { ClaudeService } from './services/claude';
import { handleGetRates, handleGetRateHistory } from './routes/rates';
import { handleGetAffordability, handleGetHomePrices } from './routes/economic';
import { handleChat, handleChatStream } from './routes/chat';

export interface Env {
  FRED_CACHE: KVNamespace;
  FRED_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  ENVIRONMENT: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Initialize services
    const cacheService = new CacheService(env.FRED_CACHE);
    const fredService = new FREDService(env.FRED_API_KEY, cacheService);
    const claudeService = new ClaudeService(env.ANTHROPIC_API_KEY, fredService);

    let response: Response;

    try {
      // Route requests
      switch (true) {
        // Health check
        case path === '/health' || path === '/':
          response = Response.json({
            status: 'ok',
            service: 'mortgage-mcp-server',
            timestamp: new Date().toISOString(),
          });
          break;

        // Chat endpoints
        case path === '/api/chat':
          response = await handleChat(request, { claudeService });
          break;

        case path === '/api/chat/stream':
          response = await handleChatStream(request, { claudeService });
          break;

        // Rate endpoints
        case path === '/api/rates':
          if (request.method !== 'GET') {
            response = new Response('Method not allowed', { status: 405 });
          } else {
            response = await handleGetRates(request, { fredService });
          }
          break;

        case path === '/api/rates/history':
          if (request.method !== 'GET') {
            response = new Response('Method not allowed', { status: 405 });
          } else {
            response = await handleGetRateHistory(request, { fredService });
          }
          break;

        // Economic data endpoints
        case path === '/api/affordability':
          if (request.method !== 'GET') {
            response = new Response('Method not allowed', { status: 405 });
          } else {
            response = await handleGetAffordability(request, { fredService });
          }
          break;

        case path === '/api/home-prices':
          if (request.method !== 'GET') {
            response = new Response('Method not allowed', { status: 405 });
          } else {
            response = await handleGetHomePrices(request, { fredService });
          }
          break;

        // API documentation
        case path === '/api':
          response = Response.json({
            name: 'Mortgage Freedom Calculator API',
            version: '1.0.0',
            endpoints: {
              'GET /health': 'Health check',
              'POST /api/chat': 'Chat with AI mortgage advisor',
              'POST /api/chat/stream': 'Chat with streaming response',
              'GET /api/rates': 'Get current mortgage rates',
              'GET /api/rates/history': 'Get historical rate data',
              'GET /api/affordability': 'Get housing affordability index',
              'GET /api/home-prices': 'Get home price index data',
            },
            documentation: {
              chat: {
                method: 'POST',
                body: {
                  message: 'string (required)',
                  conversationHistory: 'array of {role, content} (optional)',
                },
              },
              rates: {
                method: 'GET',
                params: {
                  type: '30yr | 15yr | all (optional, default: all)',
                },
              },
              rateHistory: {
                method: 'GET',
                params: {
                  series: 'MORTGAGE30US | MORTGAGE15US (required)',
                  start: 'YYYY-MM-DD (required)',
                  end: 'YYYY-MM-DD (optional)',
                },
              },
              homePrices: {
                method: 'GET',
                params: {
                  months: 'number 1-120 (optional, default: 12)',
                },
              },
            },
          });
          break;

        // 404 for unknown routes
        default:
          response = Response.json(
            { error: 'Not found', path },
            { status: 404 }
          );
      }
    } catch (error) {
      console.error('Unhandled error:', error);
      response = Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return addCorsHeaders(response);
  },
};
