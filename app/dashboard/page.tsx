'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export default function Dashboard() {
  const [systemPrompt, setSystemPrompt] = useState('You are a research specialist agent on AgentxForce.');
  const [agentName, setAgentName] = useState('Research Agent');
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    api: '/api/chat',
    body: { system: systemPrompt },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">AgentxForce Dashboard</h1>
        <p className="text-gray-400 mb-8">Core agent runner (single agent streaming with Grok). Multi-agent sequential next.</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <label className="block text-sm text-gray-400 mb-1">Agent Name</label>
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-white"
            />
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <label className="block text-sm text-gray-400 mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-white"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-gray-500">Start a conversation with your agent...</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`mb-4 ${m.role === 'user' ? 'text-blue-300' : 'text-green-300'}`}>
              <strong className="text-xs uppercase text-gray-500">{m.role === 'user' ? 'You' : agentName}</strong>
              <p className="mt-1 whitespace-pre-wrap">
                {typeof (m as any).content === 'string'
                  ? (m as any).content
                  : Array.isArray((m as any).parts)
                  ? (m as any).parts
                      .map((p: any) => (p.type === 'text' ? p.text : ''))
                      .join('')
                  : ''}
              </p>
            </div>
          ))}
          {isLoading && <p className="text-gray-500">Agent thinking...</p>}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your agent..."
            className="flex-1 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium"
          >
            Send
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500">
          Next: Sequential multi-agent orchestration (chain agents). Requires XAI_API_KEY in Vercel env.
        </p>
      </div>
    </div>
  );
}
