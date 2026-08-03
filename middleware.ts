import { NextResponse, type NextRequest } from 'next/server';
import { isCsrfProtectedRequest, isTrustedRequestOrigin } from '@/lib/csrf';

export function middleware(request: NextRequest) {
  console.log('[middleware] path:', request.nextUrl.pathname, 'method:', request.method, 'origin:', request.headers.get('origin'));
  const csrfProtected = isCsrfProtectedRequest(request);
  const trusted = isTrustedRequestOrigin(request);
  console.log('[middleware] csrfProtected:', csrfProtected, 'trusted:', trusted);
  if (csrfProtected && !trusted) {
    console.log('[middleware] BLOCKING request');
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  console.log('[middleware] ALLOWING request');
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
