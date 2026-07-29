import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  clearSession,
} from '@/lib/auth';

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

export async function POST(request: Request) {
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

      const user = await db.user.findUnique({
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

      await createSession(user.id);

      return NextResponse.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        locale: user.locale,
        isDemo: user.isDemo,
      });
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

      await createSession(user.id);

      return NextResponse.json(
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
    }

    // ── Logout ──
    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ message: 'Logged out' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json(session.user);
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
