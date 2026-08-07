'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export function LoginForm({
  googleEnabled,
  authRequired,
}: {
  googleEnabled: boolean;
  authRequired: boolean;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portal';
  const safeCallback = callbackUrl.startsWith('/') ? callbackUrl : '/portal';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const onGoogle = async () => {
    setError('');
    setPending(true);
    try {
      await signIn('google', { callbackUrl: safeCallback });
    } catch {
      setError('Could not start Google sign-in. Try again.');
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white">
          AgentForces
        </Link>
        <h1 className="mt-10 text-2xl font-medium tracking-tight text-white">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
          {googleEnabled
            ? 'Continue with Google to open your portal and mesh projects.'
            : 'Google is not configured on this deployment. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET on Vercel.'}
        </p>

        {googleEnabled ? (
          <button
            type="button"
            onClick={onGoogle}
            disabled={pending}
            className="mt-10 w-full h-11 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {pending ? 'Redirecting…' : 'Continue with Google'}
          </button>
        ) : null}

        {!authRequired && (
          <Link
            href={safeCallback}
            className={`w-full h-11 rounded-lg border border-zinc-600 text-sm text-zinc-200 hover:text-white hover:border-zinc-400 transition-colors flex items-center justify-center ${
              googleEnabled ? 'mt-3' : 'mt-10'
            }`}
          >
            Continue as guest
          </Link>
        )}

        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

        <p className="mt-8 text-[11px] text-zinc-500 leading-relaxed">
          Redirect URI (Google Console):{' '}
          <code className="text-zinc-400">
            https://agentxforces.com/api/auth/callback/google
          </code>
        </p>
      </div>
    </div>
  );
}
