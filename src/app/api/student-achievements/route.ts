import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const studentIdParam = searchParams.get('studentId');

    let schoolId: string | undefined;
    if (session.user?.role === 'SCHOOL_ADMIN') {
      schoolId = session.user.schoolId ?? undefined;
    } else {
      schoolId = schoolIdParam ?? session.user?.schoolId ?? undefined;
    }

    if (!schoolId) return NextResponse.json([]);

    // If student is requesting their own data
    if (session.user?.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { userId: session.userId, schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!student) return NextResponse.json({ badges: [], character: null, leaderboard: [] });

      const studentId = student.id;

      // Get student's earned badges
      const studentBadges = await db.studentBadge.findMany({
        where: { schoolId, studentId },
        orderBy: { awardedAt: 'desc' },
        include: {
          badge: true,
          awardedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Get all available badges for the school
      const allBadges = await db.badge.findMany({
        where: { schoolId, deletedAt: null },
        orderBy: { category: 'asc' },
      });

      // Get virtual character
      const character = await db.virtualCharacter.findUnique({
        where: { userId: session.userId },
      });

      // Get class-level leaderboard (students in same class, ordered by XP)
      const enrollment = await db.enrollment.findFirst({
        where: { studentId, endDate: null },
        select: { classGroupId: true },
      });

      let leaderboard: Array<{ studentId: string; firstName: string; lastName: string; xp: number; level: number; badgeCount: number }> = [];
      if (enrollment) {
        const classStudents = await db.enrollment.findMany({
          where: { classGroupId: enrollment.classGroupId, endDate: null },
          select: { studentId: true },
        });
        const classStudentIds = classStudents.map(e => e.studentId);

        const studentData = await db.student.findMany({
          where: { id: { in: classStudentIds }, deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            studentBadges: { select: { id: true } },
          },
        });

        const charData = await db.virtualCharacter.findMany({
          where: { userId: { in: studentData.map(s => s.userId).filter(Boolean) as string[] } },
          select: { userId: true, xp: true, level: true },
        });

        const charMap = new Map(charData.map(c => [c.userId, c]));
        leaderboard = studentData
          .map(s => {
            const char = s.userId ? charMap.get(s.userId) : null;
            return {
              studentId: s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              xp: char?.xp ?? 0,
              level: char?.level ?? 1,
              badgeCount: s.studentBadges.length,
            };
          })
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 20);
      }

      return NextResponse.json({
        badges: allBadges.map(b => ({
          ...b,
          earned: studentBadges.some(sb => sb.badgeId === b.id),
          earnedAt: studentBadges.find(sb => sb.badgeId === b.id)?.awardedAt ?? null,
        })),
        earnedBadges: studentBadges,
        character,
        leaderboard,
        totalXP: character?.xp ?? 0,
        level: character?.level ?? 1,
      });
    }

    // Teacher/Admin view
    if (studentIdParam) {
      const studentBadges = await db.studentBadge.findMany({
        where: { schoolId, studentId: studentIdParam },
        orderBy: { awardedAt: 'desc' },
        include: {
          badge: true,
          student: { select: { id: true, firstName: true, lastName: true } },
          awardedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const allBadges = await db.badge.findMany({
        where: { schoolId, deletedAt: null },
        orderBy: { category: 'asc' },
      });

      return NextResponse.json({
        badges: allBadges.map(b => ({
          ...b,
          earned: studentBadges.some(sb => sb.badgeId === b.id),
          earnedAt: studentBadges.find(sb => sb.badgeId === b.id)?.awardedAt ?? null,
        })),
        earnedBadges: studentBadges,
      });
    }

    // Return all badges for school
    const allBadges = await db.badge.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { category: 'asc' },
    });

    return NextResponse.json({ badges: allBadges });
  } catch (error) {
    console.error('StudentAchievements GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { action, schoolId, studentId, badgeId, xpAmount, characterData } = body;

    if (action === 'award_badge') {
      if (!schoolId || !studentId || !badgeId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check if already awarded
      const existing = await db.studentBadge.findUnique({
        where: { studentId_badgeId: { studentId, badgeId } },
      });
      if (existing) return NextResponse.json({ error: 'Badge already awarded' }, { status: 409 });

      const badge = await db.badge.findUnique({ where: { id: badgeId, deletedAt: null } });
      if (!badge) return NextResponse.json({ error: 'Badge not found' }, { status: 404 });

      const studentBadge = await db.studentBadge.create({
        data: {
          schoolId,
          studentId,
          badgeId,
          awardedBy: session.userId,
        },
        include: { badge: true },
      });

      // Award XP for badge
      const student = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } });
      if (student?.userId) {
        await upsertVirtualCharacter(student.userId, schoolId, 50);
      }

      return NextResponse.json(studentBadge, { status: 201 });
    }

    if (action === 'add_xp') {
      if (!schoolId || !studentId || xpAmount === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const student = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } });
      if (!student?.userId) return NextResponse.json({ error: 'Student has no user account' }, { status: 400 });

      const character = await upsertVirtualCharacter(student.userId, schoolId, xpAmount);
      return NextResponse.json(character);
    }

    if (action === 'update_character') {
      if (!characterData) {
        return NextResponse.json({ error: 'Missing characterData' }, { status: 400 });
      }

      const character = await db.virtualCharacter.upsert({
        where: { userId: session.userId },
        update: {
          characterId: characterData.characterId ?? undefined,
          name: characterData.name ?? undefined,
          color: characterData.color ?? undefined,
          mood: characterData.mood ?? undefined,
        },
        create: {
          userId: session.userId,
          schoolId: schoolId ?? session.user?.schoolId ?? '',
          characterId: characterData.characterId ?? 'owl',
          name: characterData.name ?? 'My Companion',
          color: characterData.color ?? '#10b981',
          mood: characterData.mood ?? 'happy',
        },
      });

      return NextResponse.json(character);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('StudentAchievements POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function upsertVirtualCharacter(userId: string, schoolId: string, xpGain: number) {
  const existing = await db.virtualCharacter.findUnique({ where: { userId } });

  if (existing) {
    const newXp = existing.xp + xpGain;
    const newLevel = Math.floor(newXp / 100) + 1;

    return db.virtualCharacter.update({
      where: { userId },
      data: {
        xp: newXp,
        level: newLevel,
        mood: newLevel > existing.level ? 'celebrating' : 'happy',
      },
    });
  }

  return db.virtualCharacter.create({
    data: {
      userId,
      schoolId,
      characterId: 'owl',
      name: 'My Companion',
      xp: xpGain,
      level: Math.floor(xpGain / 100) + 1,
      mood: 'happy',
    },
  });
}
