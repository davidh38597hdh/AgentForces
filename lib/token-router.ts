/**
 * Token Router — single control point for API key resolution.
 *
 * Priority:
 *  1. Control plane (TOKEN_CONTROL_URL) — future central vault
 *  2. User-provided keys (BYOK from client)
 *  3. Server environment keys
 */

export type ProviderId = 'xai' | 'openai' | 'anthropic';

export type UserKeyBag = Partial<Record<ProviderId, string>>;

export type TokenContext = {
  userId?: string | null;
  userEmail?: string | null;
  userKeys?: UserKeyBag;
};

export type TokenSource = 'user' | 'env' | 'control_plane';

export type ResolvedToken = {
  key: string;
  source: TokenSource;
  provider: ProviderId;
};

const ENV_MAP: Record<ProviderId, string> = {
  xai: 'XAI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

async function fromControlPlane(
  provider: ProviderId,
  ctx: TokenContext
): Promise<string | null> {
  const url = process.env.TOKEN_CONTROL_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TOKEN_CONTROL_SECRET || ''}`,
      },
      body: JSON.stringify({
        provider,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.apiKey === 'string' ? data.apiKey : null;
  } catch {
    return null;
  }
}

export async function resolveProviderKey(
  provider: ProviderId,
  ctx: TokenContext = {}
): Promise<ResolvedToken> {
  const controlKey = await fromControlPlane(provider, ctx);
  if (controlKey) {
    return { key: controlKey, source: 'control_plane', provider };
  }

  const userKey = ctx.userKeys?.[provider]?.trim();
  if (userKey) {
    return { key: userKey, source: 'user', provider };
  }

  const envKey = process.env[ENV_MAP[provider]]?.trim();
  if (envKey) {
    return { key: envKey, source: 'env', provider };
  }

  throw new Error(
    `No API key for ${provider}. Add it in Settings (API keys) or set ${ENV_MAP[provider]}.`
  );
}

/** Redact key-like substrings from log/error strings. */
export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, '[redacted]')
    .replace(/xai-[a-zA-Z0-9_-]{10,}/gi, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}
