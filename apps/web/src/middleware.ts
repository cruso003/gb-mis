import { NextResponse } from 'next/server';
import type { NextRequest, NextMiddleware } from 'next/server';

import { auth } from './auth';

// next-auth's auth() returns a middleware-compatible function; cast to public type for isolatedModules.
export default auth((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/auth');

  if (isApiRoute) return NextResponse.next();
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}) as unknown as NextMiddleware;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
