'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portal';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm font-medium text-zinc-500">
          AgentForces
        </Link>
        <h1 className="mt-10 text-2xl font-medium tracking-tight text-zinc-200">
          Open mesh
        </h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Google sign-in is not enabled yet. You can use the portal and dashboard without an
          account. Auth will land in a later release.
        </p>

        <Link
          href={callbackUrl.startsWith('/') ? callbackUrl : '/portal'}
          className="mt-10 w-full h-11 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white transition-colors flex items-center justify-center"
        >
          Continue to portal
        </Link>

        <p className="mt-8 text-[11px] text-zinc-600 leading-relaxed">
          Optional later: set <code className="text-zinc-500">GOOGLE_CLIENT_ID</code>,{' '}
          <code className="text-zinc-500">GOOGLE_CLIENT_SECRET</code>, and{' '}
          <code className="text-zinc-500">AUTH_SECRET</code>, then set{' '}
          <code className="text-zinc-500">AUTH_REQUIRED=true</code> to enforce login.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-500 text-sm">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
