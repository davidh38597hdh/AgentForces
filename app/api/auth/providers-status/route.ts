import { NextResponse } from 'next/server';
import {
  isGoogleAuthConfigured,
  isAuthRequired,
  isProduction,
} from '@/lib/auth-mode';
import { requireSession } from '@/lib/require-session';

/**
 * Debug: Google OAuth env visibility.
 * Production: requires session. Never returns secret values.
 */
export async function GET() {
  if (isProduction()) {
    const gate = await requireSession();
    if (!gate.ok) return gate.response;
  }

  return NextResponse.json({
    googleConfigured: isGoogleAuthConfigured(),
    authRequired: isAuthRequired(),
    production: isProduction(),
    hasClientId: !!process.env.GOOGLE_CLIENT_ID?.trim(),
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET?.trim(),
    hasAuthSecret: !!process.env.AUTH_SECRET?.trim(),
  });
}
