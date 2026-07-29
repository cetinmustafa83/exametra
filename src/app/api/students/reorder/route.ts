import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const reorderSchema = z.object({
  classGroupId: z.string(),
  studentIds: z.array(z.string()).min(1),
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'SCHOOL_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const { classGroupId, studentIds } = parsed.data;

  // Verify the class belongs to the teacher's school
  const classGroup = await db.classGroup.findUnique({
    where: { id: classGroupId },
  });
  if (!classGroup) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
  if (session.user.schoolId && classGroup.schoolId !== session.user.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await db.classGroup.update({
      where: { id: classGroupId },
      data: {
        seatingOrder: JSON.stringify(studentIds),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: session.user.schoolId,
        action: 'REORDER_STUDENTS',
        entityType: 'ClassGroup',
        entityId: classGroupId,
        metadata: JSON.stringify({ studentIds }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder students error:', error);
    return NextResponse.json({ error: 'Failed to reorder students' }, { status: 500 });
  }
}
