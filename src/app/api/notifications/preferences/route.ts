// CompetenceTrack — Notification Preferences API
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 400 });
  }

  let prefs = await db.notificationPreferences.findUnique({
    where: { userId: session.user.id },
  });

  // Create default preferences if none exist
  if (!prefs) {
    prefs = await db.notificationPreferences.create({
      data: {
        userId: session.user.id,
        schoolId,
      },
    });
  }

  return NextResponse.json(prefs);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schoolId = session.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      academicEnabled,
      behavioralEnabled,
      administrativeEnabled,
      calendarEnabled,
      communicationEnabled,
      systemEnabled,
      quietHoursStart,
      quietHoursEnd,
      quietHoursEnabled,
      emailDigestEnabled,
      emailDigestFrequency,
    } = body as {
      academicEnabled?: boolean;
      behavioralEnabled?: boolean;
      administrativeEnabled?: boolean;
      calendarEnabled?: boolean;
      communicationEnabled?: boolean;
      systemEnabled?: boolean;
      quietHoursStart?: string | null;
      quietHoursEnd?: string | null;
      quietHoursEnabled?: boolean;
      emailDigestEnabled?: boolean;
      emailDigestFrequency?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (academicEnabled !== undefined) updateData.academicEnabled = academicEnabled;
    if (behavioralEnabled !== undefined) updateData.behavioralEnabled = behavioralEnabled;
    if (administrativeEnabled !== undefined) updateData.administrativeEnabled = administrativeEnabled;
    if (calendarEnabled !== undefined) updateData.calendarEnabled = calendarEnabled;
    if (communicationEnabled !== undefined) updateData.communicationEnabled = communicationEnabled;
    if (systemEnabled !== undefined) updateData.systemEnabled = systemEnabled;
    if (quietHoursStart !== undefined) updateData.quietHoursStart = quietHoursStart;
    if (quietHoursEnd !== undefined) updateData.quietHoursEnd = quietHoursEnd;
    if (quietHoursEnabled !== undefined) updateData.quietHoursEnabled = quietHoursEnabled;
    if (emailDigestEnabled !== undefined) updateData.emailDigestEnabled = emailDigestEnabled;
    if (emailDigestFrequency !== undefined) updateData.emailDigestFrequency = emailDigestFrequency;

    const prefs = await db.notificationPreferences.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        schoolId,
        ...updateData,
      },
    });

    return NextResponse.json(prefs);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
