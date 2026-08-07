'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const emailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setStatus('');
    try {
      const res = await signIn('nodemailer', {
        email: email.trim(),
        callbackUrl: '/dashboard',
        redirect: false,
      });
      if (res?.error) {
        setStatus('Email sign-in is not configured. Set EMAIL_SERVER + EMAIL_FROM, or use Google.');
      } else {
        setStatus('Check your email for the sign-in link.');
      }
    } catch {
      setStatus('Email sign-in failed. Use Google or configure EMAIL_SERVER.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm font-medium text-zinc-300">AgentForce</Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">Google or email magic link</p>

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="mt-8 w-full h-10 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[11px] text-zinc-600">or email</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <form onSubmit={emailSignIn} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-40"
          >
            {loading ? 'Sending…' : 'Email me a link'}
          </button>
        </form>

        {status && <p className="mt-4 text-sm text-zinc-400">{status}</p>}

        <p className="mt-8 text-[11px] text-zinc-600">
          You can use the dashboard without signing in. Sign-in enables identity for future token control.
        </p>
      </div>
    </div>
  );
}
