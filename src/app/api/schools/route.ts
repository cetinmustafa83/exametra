import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const createSchoolSchema = z.object({
  name: z.string().min(1),
  schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER']),
  country: z.string().default('DE'),
  timezone: z.string().default('Europe/Berlin'),
  // Branding fields
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  customCss: z.string().optional(),
  motto: z.string().optional(),
  websiteUrl: z.string().optional(),
  emailDomain: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolType = searchParams.get('schoolType');
    const includeBranding = searchParams.get('includeBranding') === 'true';

    const where: Record<string, unknown> = {};
    if (schoolType) where.schoolType = schoolType;

    // If user is not super admin, only show their school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId) {
      where.id = session.user.schoolId;
    }

    const schools = await db.school.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            classGroups: true,
            students: { where: { deletedAt: null } },
          },
        },
        ...(includeBranding ? {} : {}),
      },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error('Schools GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const school = await db.school.create({
      data: parsed.data,
    });

    // Seed default email templates for the new school
    const defaultTemplates = [
      {
        schoolId: school.id,
        name: 'weekly_report',
        subject: 'Wochenbericht {{studentName}}',
        body: '<h1>Wochenbericht für {{studentName}}</h1><p>Klasse: {{className}}</p><p>Lehrkraft: {{teacherName}}</p><p>Datum: {{date}}</p><h2>Kompetenzfortschritt</h2><p>{{competencyProgress}}</p><p>Mit freundlichen Grüßen,<br>{{schoolName}}</p>',
        isDefault: true,
      },
      {
        schoolId: school.id,
        name: 'assessment_reminder',
        subject: 'Bewertung am {{date}}',
        body: '<h1>Bewertungserinnerung</h1><p>Hallo {{teacherName}},</p><p>am {{date}} steht eine Bewertung an für {{className}}.</p><p>Betreff: {{subjectName}}</p><p>Mit freundlichen Grüßen,<br>{{schoolName}}</p>',
        isDefault: true,
      },
      {
        schoolId: school.id,
        name: 'behavior_alert',
        subject: 'Verhaltensnotice für {{studentName}}',
        body: '<h1>Verhaltensnotice</h1><p>Schüler/in: {{studentName}}</p><p>Klasse: {{className}}</p><p>Datum: {{date}}</p><p>Vorfall: {{behaviorDescription}}</p><p>Kategorie: {{behaviorCategory}}</p><p>Mit freundlichen Grüßen,<br>{{schoolName}}</p>',
        isDefault: true,
      },
      {
        schoolId: school.id,
        name: 'attendance_notice',
        subject: 'Anwesenheits-Notice',
        body: '<h1>Anwesenheitsnotice</h1><p>Schüler/in: {{studentName}}</p><p>Klasse: {{className}}</p><p>Datum: {{date}}</p><p>Status: {{attendanceStatus}}</p><p>Mit freundlichen Grüßen,<br>{{schoolName}}</p>',
        isDefault: true,
      },
      {
        schoolId: school.id,
        name: 'welcome',
        subject: 'Willkommen bei SchulOS',
        body: '<h1>Willkommen bei SchulOS!</h1><p>Hallo {{studentName}},</p><p>du wurdest für die Schule {{schoolName}} registriert.</p><p>Deine Zugangsdaten:</p><p>E-Mail: {{email}}</p><p>Bitte melde dich an und ändere dein Passwort.</p><p>Mit freundlichen Grüßen,<br>{{schoolName}}</p>',
        isDefault: true,
      },
    ];

    await db.emailTemplate.createMany({ data: defaultTemplates });

    return NextResponse.json(school, { status: 201 });
  } catch (error) {
    console.error('Schools POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const updateSchoolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER']).optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  // Branding fields
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
  secondaryColor: z.string().nullable().optional(),
  accentColor: z.string().nullable().optional(),
  fontFamily: z.string().nullable().optional(),
  customCss: z.string().nullable().optional(),
  motto: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  emailDomain: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user?.role !== 'SUPER_ADMIN' &&
      session.user?.role !== 'SCHOOL_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    // Verify user has access to this school
    if (session.user?.role !== 'SUPER_ADMIN' && session.user?.schoolId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const school = await db.school.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            classGroups: true,
            students: { where: { deletedAt: null } },
          },
        },
      },
    });

    // Create audit log entry
    await db.auditLog.create({
      data: {
        userId: session.userId,
        schoolId: id,
        action: 'UPDATE',
        entityType: 'School',
        entityId: id,
        metadata: JSON.stringify(updateData),
      },
    });

    return NextResponse.json(school);
  } catch (error) {
    console.error('Schools PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
