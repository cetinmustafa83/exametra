import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const studentItemSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

const bulkCreateSchema = z.object({
  schoolId: z.string().min(1),
  classGroupId: z.string().optional(),
  schoolYearId: z.string().optional(),
  students: z.array(studentItemSchema).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN' &&
      session.user?.role !== 'TEACHER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { schoolId, classGroupId, schoolYearId, students } = parsed.data;

    // Validate class & school year
    if (classGroupId) {
      const cls = await db.classGroup.findUnique({ where: { id: classGroupId } });
      if (!cls) {
        return NextResponse.json(
          { error: 'Class not found' },
          { status: 404 }
        );
      }
      if (cls.schoolId !== schoolId) {
        return NextResponse.json(
          { error: 'Class does not belong to the specified school' },
          { status: 400 }
        );
      }
    }

    if (classGroupId && !schoolYearId) {
      return NextResponse.json(
        { error: 'schoolYearId is required when classGroupId is provided' },
        { status: 400 }
      );
    }

    let created = 0;
    let enrolled = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Process each student one at a time, capturing errors per row
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        // Use externalId uniqueness if provided, otherwise just create
        let student: Awaited<ReturnType<typeof db.student.findFirst>> = null;
        if (s.externalId) {
          student = await db.student.findFirst({
            where: { externalId: s.externalId, schoolId },
          });
        }

        if (!student) {
          student = await db.student.create({
            data: {
              schoolId,
              firstName: s.firstName,
              lastName: s.lastName,
              dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : null,
              externalId: s.externalId ?? null,
            },
          });
          created++;
        }

        if (classGroupId && schoolYearId) {
          // Check existing enrollment before creating
          const existing = await db.enrollment.findFirst({
            where: {
              studentId: student.id,
              classGroupId,
              endDate: null,
            },
          });
          if (!existing) {
            await db.enrollment.create({
              data: {
                studentId: student.id,
                classGroupId,
                schoolYearId,
                startDate: new Date(),
              },
            });
            enrolled++;
          }
        }
      } catch (err) {
        errors.push({
          row: i + 1,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Audit log entry
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId,
        action: 'CREATE',
        entityType: 'Student',
        entityId: null,
        metadata: JSON.stringify({
          bulkImport: true,
          classGroupId: classGroupId ?? null,
          totalRequested: students.length,
          created,
          enrolled,
          errors: errors.length,
        }),
      },
    });

    return NextResponse.json({ created, enrolled, errors }, { status: 201 });
  } catch (error) {
    console.error('Bulk students POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
