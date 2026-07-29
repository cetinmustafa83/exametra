import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
});

export async function DELETE(req: NextRequest) {
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

  const parsed = batchDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const { ids } = parsed.data;

  try {
    const result = await db.learningProgressEntry.deleteMany({
      where: {
        id: { in: ids },
        teacherId: session.userId,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: session.user.schoolId,
        action: 'BATCH_DELETE',
        entityType: 'LearningProgressEntry',
        metadata: JSON.stringify({ count: result.count, ids }),
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json({ error: 'Failed to delete entries' }, { status: 500 });
  }
}
