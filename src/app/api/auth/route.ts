import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  clearSession,
  isSecureRequest,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';
import { withRateLimit, checkRateLimit, getRateLimitKey, getRateLimitHeaders, createRateLimitResponse } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  schoolId: z.string().optional(),
  role: z.enum(['TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN']).default('TEACHER'),
});

export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Login ──
    if (action === 'login') {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { email, password } = parsed.data;

      const user = await db.user.findFirst({
        where: { email, deletedAt: null },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const secure = isSecureRequest(request);
      await createSession(user.id, secure);

      // Also set cookie on the response object to guarantee the Set-Cookie
      // header is included. In some Next.js App Router scenarios, cookies().set()
      // alone may not propagate to the NextResponse body.
      const response = NextResponse.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        locale: user.locale,
        isDemo: user.isDemo,
      });
      response.cookies.set(SESSION_COOKIE_NAME, user.id, getSessionCookieOptions(secure));
      return response;
    }

    // ── Register ──
    if (action === 'register') {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { email, password, firstName, lastName, schoolId, role } =
        parsed.data;

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(password);

      const user = await db.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          schoolId: schoolId ?? null,
          role,
        },
      });

      const secure = isSecureRequest(request);
      await createSession(user.id, secure);

      const response = NextResponse.json(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          schoolId: user.schoolId,
          locale: user.locale,
          isDemo: user.isDemo,
        },
        { status: 201 }
      );
      response.cookies.set(SESSION_COOKIE_NAME, user.id, getSessionCookieOptions(secure));
      return response;
    }

    // ── Logout ──
    if (action === 'logout') {
      await clearSession();

      const response = NextResponse.json({ message: 'Logged out' });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Auth POST error:', error);

    // Return more specific error info for debugging
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    const isZod = error instanceof z.ZodError;
    const isPrisma =
      error instanceof Error &&
      (error.message.includes('Prisma') || error.constructor.name.includes('Prisma'));

    if (isZod) {
      return NextResponse.json(
        { error: 'Validation error', details: (error as z.ZodError).issues },
        { status: 400 }
      );
    }

    if (isPrisma) {
      return NextResponse.json(
        { error: 'Database error', detail: message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500 }
    );
  }
}, 'auth');

export async function GET(request: Request) {
  // Apply rate limit for auth check endpoint — 120 per minute
  const key = getRateLimitKey(request);
  const result = checkRateLimit(key, 120, 60 * 1000);

  if (!result.allowed) {
    const rateLimitResponse = createRateLimitResponse(result);
    return NextResponse.json(rateLimitResponse.body, {
      status: rateLimitResponse.status,
      headers: rateLimitResponse.headers,
    });
  }

  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = NextResponse.json(session.user);
    const rateLimitHeaders = getRateLimitHeaders(result);
    for (const [headerKey, headerValue] of rateLimitHeaders.entries()) {
      response.headers.set(headerKey, headerValue);
    }
    return response;
  } catch (error) {
    console.error('Auth GET error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500 }
    );
  }
}
