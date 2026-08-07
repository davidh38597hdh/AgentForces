import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isAuthRoute = pathname.startsWith('/login');
  const isProtected =
    pathname.startsWith('/portal') || pathname.startsWith('/dashboard');

  if (isProtected && !isLoggedIn) {
    const url = new URL('/login', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/portal', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/portal/:path*', '/dashboard/:path*', '/login'],
};
