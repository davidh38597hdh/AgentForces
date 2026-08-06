import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

export const maxDuration = 60;

type Agent = {
  name: string;
  system: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const agents: Agent[] = body.agents || [];
    const task: string = body.task || '';

    if (!agents.length || !task.trim()) {
      return new Response(
        JSON.stringify({ error: 'Agents and task are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const log: { agent: string; output: string }[] = [];
    let context = `Original task: ${task}\n\n`;

    for (const agent of agents) {
      const result = await generateText({
        model: xai('grok-3'),
        system: agent.system,
        prompt: `${context}\nYou are the next agent in a multi-agent team. Your role is: ${agent.name}.\n\nBased on the original task and previous agents' work above, provide your contribution.`,
      });

      const output = result.text;
      log.push({ agent: agent.name, output });
      context += `\n### ${agent.name}\n${output}\n`;
    }

    return new Response(JSON.stringify({ log, final: log[log.length - 1]?.output || '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Orchestrate error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Orchestration failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
