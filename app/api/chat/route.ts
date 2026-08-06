import { xai } from '@ai-sdk/xai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, system } = await req.json();

    const result = streamText({
      model: xai('grok-3'),
      system: system || 'You are a helpful AI agent in a multi-agent team on AgentxForce.',
      messages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to stream response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
