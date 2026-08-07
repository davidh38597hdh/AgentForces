import { NextResponse } from 'next/server';
import { isGoogleAuthConfigured, isAuthRequired } from '@/lib/auth-mode';

/** Debug: confirms whether Google OAuth env is visible to the server. */
export async function GET() {
  return NextResponse.json({
    googleConfigured: isGoogleAuthConfigured(),
    authRequired: isAuthRequired(),
    hasClientId: !!process.env.GOOGLE_CLIENT_ID?.trim(),
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET?.trim(),
    hasAuthSecret: !!process.env.AUTH_SECRET?.trim(),
  });
}
