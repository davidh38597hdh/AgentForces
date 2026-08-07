'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Logo } from '@/components/Logo';

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
      // Always attempt; NextAuth errors if provider missing
      const res = await signIn('google', { callbackUrl: safeCallback, redirect: true });
      if (res?.error) {
        setError(
          googleEnabled
            ? `Sign-in failed: ${res.error}`
            : 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel, then redeploy.'
        );
        setPending(false);
      }
    } catch {
      setError(
        googleEnabled
          ? 'Could not start Google sign-in. Try again.'
          : 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel, then redeploy.'
      );
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen af-page-bg text-[var(--foreground)] flex items-center justify-center px-5 relative overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #4c1d95 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="w-full max-w-sm af-card rounded-2xl px-6 py-8 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
        >
          <Logo size={24} />
          AgentForces
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight af-title-gradient">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Continue with Google to open your portal and mesh projects.
          {!googleEnabled && (
            <span className="block mt-2 text-amber-500/90">
              Server is missing Google env vars — button is visible but sign-in will fail until
              configured.
            </span>
          )}
        </p>

        {/* Always show Google button */}
        <button
          type="button"
          onClick={onGoogle}
          disabled={pending}
          className="af-btn-primary w-full mt-10 disabled:opacity-60 gap-2"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
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

        {/* Guest only in non-production when auth is not required */}
        {!authRequired && (
          <Link href={safeCallback} className="af-btn-ghost w-full mt-3">
            Continue as guest (local/dev only)
          </Link>
        )}

        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

        <p className="mt-8 text-[11px] text-zinc-600 leading-relaxed">
          Redirect URI in Google Console:{' '}
          <code className="text-zinc-400">
            https://agentxforces.com/api/auth/callback/google
          </code>
        </p>
      </div>
    </div>
  );
}
