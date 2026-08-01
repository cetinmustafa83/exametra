import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const sendSchema = z.object({
  templateId: z.string().optional(),
  schoolId: z.string().min(1),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  isTest: z.boolean().default(false),
});

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
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Replace template variables with sample data
    const replaceVariables = (text: string, vars: Record<string, string>) => {
      let result = text;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
      return result;
    };

    const sampleVars: Record<string, string> = {
      studentName: parsed.data.recipientName || 'Max Mustermann',
      className: 'Klasse 5a',
      teacherName: `${session.user?.firstName || 'Frau'} ${session.user?.lastName || 'Muster'}`,
      date: new Date().toLocaleDateString('de-DE'),
      score: '85%',
      schoolName: 'SchulOS Schule',
      subjectName: 'Mathematik',
      behaviorDescription: 'Beschreibung des Vorfalls',
      behaviorCategory: 'Störung',
      attendanceStatus: 'Fehlend',
      email: parsed.data.recipientEmail,
      competencyProgress: 'Alle Kompetenzen auf dem erwarteten Niveau',
    };

    const processedSubject = replaceVariables(parsed.data.subject, sampleVars);
    const processedBody = replaceVariables(parsed.data.body, sampleVars);

    // Create email log entry
    const emailLog = await db.emailLog.create({
      data: {
        schoolId: parsed.data.schoolId,
        templateId: parsed.data.templateId || null,
        recipientEmail: parsed.data.recipientEmail,
        recipientName: parsed.data.recipientName || null,
        subject: processedSubject,
        body: processedBody,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // In production, this would use an actual email sending service
    // For now, we log the email as "sent" and return success
    console.log(`[Email] ${parsed.data.isTest ? '[TEST] ' : ''}To: ${parsed.data.recipientEmail}, Subject: ${processedSubject}`);

    return NextResponse.json({
      success: true,
      logId: emailLog.id,
      message: parsed.data.isTest
        ? 'Test email logged successfully'
        : 'Email logged successfully',
    });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
