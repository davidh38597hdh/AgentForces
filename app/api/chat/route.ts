import { xai } from '@ai-sdk/xai';
import { streamText, convertToCoreMessages } from 'ai';
import { requireSession } from '@/lib/require-session';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const gate = await requireSession();
    if (!gate.ok) return gate.response;

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Chat API error:', message.replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]'));
    return new Response(
      JSON.stringify({
        error: 'Failed to stream response',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
