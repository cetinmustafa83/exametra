import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createSlotSchema = z.object({
  schoolId: z.string().min(1),
  classGroupId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(4),
  period: z.number().int().min(1).max(8),
  subjectId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  isBreak: z.boolean().optional().default(false),
});

const batchCreateSchema = z.object({
  schoolId: z.string().min(1),
  classGroupId: z.string().min(1),
  slots: z.array(createSlotSchema.omit({ schoolId: true, classGroupId: true })),
});

function isTeacherOrAdmin(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const classGroupId = searchParams.get('classGroupId');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { schoolId, deletedAt: null };
    if (classGroupId && classGroupId !== 'all') where.classGroupId = classGroupId;

    const slots = await db.timetableSlot.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Timetable GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Check if this is a batch create request
    if (Array.isArray(body.slots)) {
      const parsed = batchCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { schoolId, classGroupId, slots } = parsed.data;

      // Verify school
      const school = await db.school.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
      }
      if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Verify classGroup
      const classGroup = await db.classGroup.findUnique({ where: { id: classGroupId } });
      if (!classGroup || classGroup.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Class group not found in this school' }, { status: 404 });
      }

      const created = await db.timetableSlot.createMany({
        data: slots.map((slot) => ({
          schoolId,
          classGroupId,
          dayOfWeek: slot.dayOfWeek,
          period: slot.period,
          subjectId: slot.subjectId || null,
          teacherId: slot.teacherId || null,
          roomId: slot.roomId || null,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBreak: slot.isBreak,
        })),
        skipDuplicates: true,
      });

      return NextResponse.json({ count: created.count }, { status: 201 });
    }

    // Single slot create
    const parsed = createSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, classGroupId, subjectId, teacherId, ...rest } = parsed.data;

    // Verify school
    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    if (session.user?.role === 'SCHOOL_ADMIN' && session.user.schoolId && school.id !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify classGroup
    const classGroup = await db.classGroup.findUnique({ where: { id: classGroupId } });
    if (!classGroup || classGroup.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Class group not found in this school' }, { status: 404 });
    }

    // Verify subject if provided
    if (subjectId) {
      const subject = await db.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
    }

    // Verify teacher if provided
    if (teacherId) {
      const teacher = await db.user.findUnique({ where: { id: teacherId, deletedAt: null } });
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }
    }

    const slot = await db.timetableSlot.create({
      data: {
        schoolId,
        classGroupId,
        subjectId: subjectId || null,
        teacherId: teacherId || null,
        roomId: rest.roomId || null,
        dayOfWeek: rest.dayOfWeek,
        period: rest.period,
        startTime: rest.startTime,
        endTime: rest.endTime,
        isBreak: rest.isBreak,
      },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    console.error('Timetable POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
