import bcrypt from 'bcryptjs';
import argon2 from 'argon2';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'ct_session';
const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const parsedSessionMaxAge = Number.parseInt(process.env.SESSION_MAX_AGE_SECONDS ?? '', 10);
export const SESSION_COOKIE_MAX_AGE = Number.isFinite(parsedSessionMaxAge) && parsedSessionMaxAge >= 60
  ? parsedSessionMaxAge
  : DEFAULT_SESSION_MAX_AGE;

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

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
  return argon2.hash(password, { ...ARGON2_OPTIONS, raw: false });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (hash.startsWith('$argon2')) {
    return argon2.verify(hash, password);
  }
  return bcrypt.compare(password, hash);
}

export function needsPasswordRehash(hash: string): boolean {
  return !hash.startsWith('$argon2');
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
  twoFactorSecret: true,
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

// ─── Module L: Access Control & DPO Role ───────────────────────────────

/**
 * Check if user has DPO (Data Protection Officer) role
 */
export async function isDPORole(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionUserId || sessionUserId !== userId) {
    return false;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'DPO';
}

/**
 * Check if user has admin role (SCHOOL_ADMIN or higher)
 */
export async function isAdminRole(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
}

/**
 * Check if user can access compliance features (DPO or Admin)
 */
export async function canAccessCompliance(userId: string): Promise<boolean> {
  const isDPO = await isDPORole(userId);
  const isAdmin = await isAdminRole(userId);
  return isDPO || isAdmin;
}

/**
 * Verify user can perform compliance actions
 * Returns { allowed: boolean, reason?: string }
 */
export async function verifyComplianceAccess(
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await db.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { role: true, schoolId: true },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (user.role !== 'DPO' && user.role !== 'SCHOOL_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return {
      allowed: false,
      reason: 'Only DPO and administrators can access compliance features',
    };
  }

  if (!user.schoolId) {
    return { allowed: false, reason: 'User not associated with a school' };
  }

  return { allowed: true };
}

/**
 * Check if user can view audit logs
 * Only DPO and admins can view full audit logs
 */
export async function canViewAuditLogs(userId: string): Promise<boolean> {
  const canAccess = await canAccessCompliance(userId);
  return canAccess;
}

/**
 * Check if user can approve deletion flags
 * Only DPO can approve data deletion
 */
export async function canApproveDeletion(userId: string): Promise<boolean> {
  const isDPO = await isDPORole(userId);
  return isDPO;
}
