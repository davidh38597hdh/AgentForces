import { NextResponse } from 'next/server';
import { getDeployTarget } from '@/lib/deploy';

/**
 * Liveness for Docker / Fly / Render / load balancers.
 * Does not check LLM keys or auth — only that the Node process is up.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'agentforces',
      deployTarget: getDeployTarget(),
      protocol: 'AMEP/1',
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
