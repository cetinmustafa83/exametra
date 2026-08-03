import { NextResponse, type NextRequest } from 'next/server';
import { isCsrfProtectedRequest, isTrustedRequestOrigin } from '@/lib/csrf';

export function middleware(request: NextRequest) {
  if (isCsrfProtectedRequest(request) && !isTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
