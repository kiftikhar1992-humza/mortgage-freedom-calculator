import { ClaudeService } from '../services/claude';

export interface ChatRouteContext {
  claudeService: ClaudeService;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function handleChat(
  request: Request,
  ctx: ChatRouteContext
): Promise<Response> {
  // Only accept POST
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: ChatRequest = await request.json();

    if (!body.message || typeof body.message !== 'string') {
      return Response.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Limit message length
    if (body.message.length > 2000) {
      return Response.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // Limit conversation history
    const history = (body.conversationHistory || []).slice(-10);

    const result = await ctx.claudeService.chat(body.message, history);

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
}

// Streaming endpoint for better UX
export async function handleChatStream(
  request: Request,
  ctx: ChatRouteContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

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

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of ctx.claudeService.chatStream(
            body.message,
            history
          )) {
            const data = `data: ${JSON.stringify({ text: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          const errorData = `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return Response.json(
      { error: 'Failed to start stream' },
      { status: 500 }
    );
  }
}
