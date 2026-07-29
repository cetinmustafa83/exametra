import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const {
      schoolId,
      studentId,
      studyPlanId,
      subjectId,
      subjectName,
      startTime,
      plannedDuration,
      type,
      pomodoroLength,
      breakLength,
      notes,
    } = body;

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify access
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: { userId: true, schoolId: true },
      });
      if (!student || student.userId !== session.userId || student.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const studySession = await db.studySession.create({
      data: {
        schoolId,
        studentId,
        studyPlanId: studyPlanId || null,
        subjectId: subjectId || null,
        subjectName: subjectName || null,
        startTime: startTime ? new Date(startTime) : new Date(),
        plannedDuration: plannedDuration || null,
        type: type || 'pomodoro',
        pomodoroLength: pomodoroLength || 25,
        breakLength: breakLength || 5,
        notes: notes || null,
        status: 'in_progress',
      },
    });

    // Award XP for starting a study session
    const student = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (student?.userId) {
      const existing = await db.virtualCharacter.findUnique({ where: { userId: student.userId } });
      if (existing) {
        await db.virtualCharacter.update({
          where: { userId: student.userId },
          data: { xp: existing.xp + 5, level: Math.floor((existing.xp + 5) / 100) + 1 },
        });
      } else {
        await db.virtualCharacter.create({
          data: {
            userId: student.userId,
            schoolId,
            characterId: 'owl',
            name: 'My Companion',
            xp: 5,
            level: 1,
            mood: 'happy',
          },
        });
      }
    }

    return NextResponse.json(studySession, { status: 201 });
  } catch (error) {
    console.error('StudySession POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { sessionId, endTime, duration, pomodorosCompleted, focusScore, status, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const existing = await db.studySession.findUnique({ where: { id: sessionId } });
    if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Verify access
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId, schoolId: existing.schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!student || student.id !== existing.studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updated = await db.studySession.update({
      where: { id: sessionId },
      data: {
        endTime: endTime ? new Date(endTime) : undefined,
        duration: duration ?? undefined,
        pomodorosCompleted: pomodorosCompleted ?? undefined,
        focusScore: focusScore ?? undefined,
        status: status ?? undefined,
        notes: notes ?? undefined,
      },
    });

    // Award XP for completing a study session
    if (status === 'completed' && duration) {
      const xpGain = Math.floor(duration / 5); // 1 XP per 5 minutes
      const student = await db.student.findUnique({ where: { id: existing.studentId }, select: { userId: true } });
      if (student?.userId) {
        const char = await db.virtualCharacter.findUnique({ where: { userId: student.userId } });
        if (char) {
          const newXp = char.xp + xpGain;
          await db.virtualCharacter.update({
            where: { userId: student.userId },
            data: { xp: newXp, level: Math.floor(newXp / 100) + 1 },
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('StudySession PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
