import { auth } from '@/auth';
import { isAuthRequired } from '@/lib/auth-mode';

export type AppSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
} | null;

/** Returns session or a 401 Response when auth is required and missing. */
export async function requireSession(): Promise<
  { ok: true; session: AppSession } | { ok: false; response: Response }
> {
  const session = (await auth().catch(() => null)) as AppSession;
  if (isAuthRequired() && !session?.user) {
    return {
      ok: false,
      response: Response.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  return { ok: true, session };
}
