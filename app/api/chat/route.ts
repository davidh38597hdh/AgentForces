import { xai } from '@ai-sdk/xai';
import { streamText, convertToCoreMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const system =
      body.system ||
      'You are a helpful AI agent in a multi-agent team on AgentForces.';

    const result = streamText({
      model: xai('grok-3'),
      system,
      messages: convertToCoreMessages(messages),
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to stream response',
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
