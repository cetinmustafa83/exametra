import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'ct_session';
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Determine whether the Secure flag should be set on cookies.
 * Returns true when:
 *  - NODE_ENV is production, OR
 *  - the request came through an HTTPS proxy (x-forwarded-proto: https)
 */
export function isSecureRequest(request: Request): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const forwarded = request.headers.get('x-forwarded-proto');
  return forwarded === 'https';
}

/**
 * Returns the cookie options object for the session cookie.
 */
export function getSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, secure?: boolean): Promise<void> {
  const cookieStore = await cookies();
  const cookieSecure = secure ?? (process.env.NODE_ENV === 'production');
  cookieStore.set(SESSION_COOKIE_NAME, userId, getSessionCookieOptions(cookieSecure));
}

const sessionUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  schoolId: true,
  locale: true,
  isDemo: true,
  createdAt: true,
  updatedAt: true,
});

export type SessionUser = Prisma.UserGetPayload<{ select: typeof sessionUserSelect }>;

export async function getSession(): Promise<{
  userId: string;
  user: SessionUser | null;
} | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId) return null;

  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: sessionUserSelect,
  });

  if (!user) return null;

  return { userId, user };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
