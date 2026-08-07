import { Suspense } from 'react';
import { isGoogleAuthConfigured, isAuthRequired } from '@/lib/auth-mode';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  const googleEnabled = isGoogleAuthConfigured();
  const authRequired = isAuthRequired();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-400 text-sm">
          Loading…
        </div>
      }
    >
      <LoginForm googleEnabled={googleEnabled} authRequired={authRequired} />
    </Suspense>
  );
}
