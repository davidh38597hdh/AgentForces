import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

export const maxDuration = 60;

type Agent = {
  name: string;
  system: string;
};

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentxForce/1.0)',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return `[Failed to fetch ${url}: ${res.status}]`;
    const text = await res.text();
    const cleaned = text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
    return cleaned || `[No readable content from ${url}]`;
  } catch {
    return `[Could not fetch ${url}]`;
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.XAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'XAI_API_KEY is not set in Vercel environment variables.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const agents: Agent[] = body.agents || [];
    const task: string = body.task || '';
    const contextText: string = body.contextText || '';
    const urls: string[] = body.urls || [];

    if (!agents.length || !task.trim()) {
      return new Response(
        JSON.stringify({ error: 'Agents and task are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let urlContent = '';
    if (urls.length > 0) {
      const fetched = await Promise.all(
        urls.slice(0, 2).map(async (url) => {
          const content = await fetchUrlContent(url);
          return `### Source: ${url}\n${content}`;
        })
      );
      urlContent = fetched.join('\n\n');
    }

    let context = `Original task: ${task}\n\n`;
    if (contextText.trim()) {
      context += `### User-provided context / notes\n${contextText.trim()}\n\n`;
    }
    if (urlContent) {
      context += `### Fetched web content\n${urlContent}\n\n`;
    }

    const log: { agent: string; output: string }[] = [];

    // Limit to 3 agents max for reliability on serverless
    const agentsToRun = agents.slice(0, 3);

    for (const agent of agentsToRun) {
      const result = await generateText({
        model: xai('grok-3'),
        system: agent.system,
        prompt: `${context}\nYou are the next agent in a multi-agent team. Your role is: ${agent.name}.\n\nBased on the original task, any provided context/sources, and previous agents' work above, provide your contribution. Be concise and useful.`,
      });

      const output = result.text;
      log.push({ agent: agent.name, output });
      context += `\n### ${agent.name}\n${output}\n`;
    }

    return new Response(
      JSON.stringify({ log, final: log[log.length - 1]?.output || '' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Orchestrate error:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Orchestration failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
