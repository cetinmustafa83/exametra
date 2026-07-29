import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Check if a student belongs to the current user (STUDENT role).
 * Uses userId (direct link) with name-matching fallback for legacy data.
 */
function isOwnStudent(
  student: { userId: string | null; firstName: string; lastName: string; schoolId: string | null },
  user: { id: string; firstName: string; lastName: string; schoolId: string | null }
): boolean {
  if (student.userId === user.id) return true;
  // Fallback: match by name + school for legacy records without userId
  if (
    student.userId === null &&
    student.firstName === user.firstName &&
    student.lastName === user.lastName &&
    student.schoolId === user.schoolId
  ) {
    return true;
  }
  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const goal = await db.studentGoal.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, schoolId: true, userId: true },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Verify access
    if (session.user?.role === 'STUDENT') {
      if (!isOwnStudent(goal.student, session.user)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.user?.role !== 'SUPER_ADMIN') {
      if (goal.student.schoolId !== session.user?.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('StudentGoal GET by ID error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, targetDate, progress, status } = body;

    const existingGoal = await db.studentGoal.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, schoolId: true, userId: true },
        },
      },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Verify access
    if (session.user?.role === 'STUDENT') {
      if (!isOwnStudent(existingGoal.student, session.user)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.user?.role !== 'SUPER_ADMIN') {
      if (existingGoal.student.schoolId !== session.user?.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (progress !== undefined) updateData.progress = Math.min(100, Math.max(0, progress));
    if (status !== undefined) updateData.status = status;

    // Auto-complete if progress reaches 100
    if (progress !== undefined && progress >= 100) {
      updateData.status = 'completed';
      updateData.progress = 100;
    }

    const goal = await db.studentGoal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('StudentGoal PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const existingGoal = await db.studentGoal.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, schoolId: true, userId: true },
        },
      },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Verify access
    if (session.user?.role === 'STUDENT') {
      if (!isOwnStudent(existingGoal.student, session.user)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.user?.role !== 'SUPER_ADMIN') {
      if (existingGoal.student.schoolId !== session.user?.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await db.studentGoal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('StudentGoal DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
