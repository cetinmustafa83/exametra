import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  needsPasswordRehash,
  createSession,
  getSession,
  clearSession,
  isSecureRequest,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';
import { withRateLimit, checkRateLimit, getRateLimitKey, getRateLimitHeaders, createRateLimitResponse } from '@/lib/rate-limit';
import { createPasswordResetToken, hashResetToken, passwordResetExpiry } from '@/lib/password-reset';

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
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(40),
  password: z.string().min(12),
});

export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'request-password-reset') {
      const parsed = requestPasswordResetSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

      const key = `password-reset:${getRateLimitKey(request)}`;
      const result = checkRateLimit(key, 5, 60 * 60 * 1000);
      if (!result.allowed) {
        const response = createRateLimitResponse(result);
        return NextResponse.json(response.body, { status: response.status, headers: response.headers });
      }

      const user = await db.user.findFirst({ where: { email: parsed.data.email, deletedAt: null } });
      let developmentToken: string | undefined;
      if (user) {
        await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
        const { token, tokenHash } = createPasswordResetToken();
        await db.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt: passwordResetExpiry() },
        });
        if (process.env.NODE_ENV !== 'production' || process.env.AUTH_SHOW_RESET_TOKEN === 'true') {
          developmentToken = token;
        }
      }

      return NextResponse.json({
        message: 'If the account exists, reset instructions have been prepared.',
        ...(developmentToken ? { developmentToken } : {}),
      });
    }

    if (action === 'reset-password') {
      const parsed = resetPasswordSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

      const reset = await db.passwordResetToken.findFirst({
        where: { tokenHash: hashResetToken(parsed.data.token), usedAt: null, expiresAt: { gt: new Date() } },
        include: { user: true },
      });
      if (!reset || reset.user.deletedAt) {
        return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
      }

      await db.$transaction([
        db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
        db.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      ]);
      return NextResponse.json({ message: 'Password reset complete' });
    }

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

      if (needsPasswordRehash(user.passwordHash)) {
        await db.user.update({
          where: { id: user.id },
          data: { passwordHash: await hashPassword(password) },
        });
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

      const { email, password, firstName, lastName, schoolId } = parsed.data;

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
          role: 'TEACHER',
          emailVerifiedAt: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true' ? null : new Date(),
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
