// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canCreateDirectRoom, canCreateGroupRoom, escalationEligibleAt } from '@/lib/communication-policy';
import { getTeacherClassIds } from '@/lib/access-policy';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const role = session.user?.role;
    const userId = session.userId;

    const where: Record<string, unknown> = {};

    if (role === 'STUDENT') {
      where.studentId = userId;
    } else if (role === 'TEACHER') {
      where.teacherId = userId;
    } else if (role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') {
      where.schoolId = session.user?.schoolId;
    } else if (role === 'SUPER_ADMIN') {
      // Can see all
    } else if (role === 'PARENT') {
      // Parents can see rooms for their children
      const parentLinks = await db.parentStudentLink.findMany({
        where: { parentId: userId },
        select: { studentId: true },
      });
      const childUserIds: string[] = [];
      for (const link of parentLinks) {
        const student = await db.student.findUnique({
          where: { id: link.studentId },
          select: { userId: true },
        });
        if (student?.userId) childUserIds.push(student.userId);
      }
      where.studentId = { in: childUserIds };
    }

    if (status) where.status = status;

    const rooms = await db.communicationRoom.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, messageType: true, createdAt: true, senderId: true },
        },
      },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('CommunicationRoom GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    const userId = session.userId;

    const body = await request.json();
    const { reason, classGroupId, audienceType = 'direct' } = body;

    if (audienceType !== 'direct') {
      if (!canCreateGroupRoom(role)) {
        return NextResponse.json({ error: 'Only teachers and administrators can create groups' }, { status: 403 });
      }
      if (!classGroupId) {
        return NextResponse.json({ error: 'classGroupId is required for groups' }, { status: 400 });
      }

      if (role === 'TEACHER') {
        const classIds = await getTeacherClassIds(userId);
        if (!classIds.includes(classGroupId)) {
          return NextResponse.json({ error: 'Teachers can only create groups for their own classes' }, { status: 403 });
        }
      }

      const classGroup = await db.classGroup.findUnique({
        where: { id: classGroupId },
        select: { id: true, schoolId: true, responsibleTeacherId: true, enrollments: { where: { endDate: null }, select: { student: { select: { userId: true } } } } },
      });
      if (!classGroup || (session.user?.schoolId && classGroup.schoolId !== session.user.schoolId)) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      }

      const participantIds = classGroup.enrollments.flatMap((enrollment) => enrollment.student.userId ? [enrollment.student.userId] : []);
      const moderatorId = classGroup.responsibleTeacherId ?? userId;
      const room = await db.communicationRoom.create({
        data: {
          schoolId: classGroup.schoolId,
          studentId: userId,
          teacherId: moderatorId,
          roomType: 'chat',
          audienceType,
          classGroupId,
          status: 'active',
          requestedBy: userId,
          acceptedAt: new Date(),
        },
      });
      await db.communicationRoomMember.createMany({
        data: [...new Set([userId, moderatorId, ...participantIds])].map((memberId) => ({
          roomId: room.id,
          userId: memberId,
          role: memberId === moderatorId ? 'moderator' : 'member',
        })),
        skipDuplicates: true,
      });
      return NextResponse.json(room, { status: 201 });
    }

    if (!canCreateDirectRoom(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (role === 'TEACHER') {
      return NextResponse.json({ error: 'Teachers should use staff communication channels' }, { status: 400 });
    }

    // Student direct messages target their own profile. Parent direct messages
    // must explicitly name one linked child.
    const requestedStudentId = body.studentId as string | undefined;
    if (role === 'PARENT' && !requestedStudentId) {
      return NextResponse.json({ error: 'studentId is required for parent conversations' }, { status: 400 });
    }
    const studentWhere = role === 'PARENT'
      ? { id: requestedStudentId, parentStudentLinks: { some: { parentId: userId } } }
      : {
          OR: [
            { userId },
            {
              userId: null,
              firstName: session.user?.firstName,
              lastName: session.user?.lastName,
              schoolId: session.user?.schoolId,
            },
          ],
        };
    const student = await db.student.findFirst({
      where: studentWhere,
      include: {
        enrollments: {
          where: { endDate: null },
          take: 1,
          include: {
            classGroup: {
              include: {
                responsibleTeacher: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const currentEnrollment = student.enrollments[0];
    if (!currentEnrollment) {
      return NextResponse.json({ error: 'No active class enrollment found' }, { status: 400 });
    }

    const teacher = currentEnrollment.classGroup.responsibleTeacher;
    if (!teacher) {
      return NextResponse.json({ error: 'No class teacher assigned' }, { status: 400 });
    }

    // Check if there's already an active/requested room
    const existingRoom = await db.communicationRoom.findFirst({
      where: {
        studentId: role === 'PARENT' ? student.userId ?? userId : userId,
        teacherId: teacher.id,
        status: { in: ['requested', 'active'] },
      },
    });

    if (existingRoom) {
      return NextResponse.json({ error: 'Active conversation already exists with this teacher' }, { status: 400 });
    }

    const room = await db.communicationRoom.create({
      data: {
        schoolId: student.schoolId,
        studentId: role === 'PARENT' ? student.userId ?? userId : userId,
        teacherId: teacher.id,
        roomType: 'chat',
        status: 'requested',
        requestedBy: userId,
        audienceType: 'direct',
        classGroupId: currentEnrollment.classGroup.id,
        escalationEligibleAt: escalationEligibleAt(new Date()),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Create room members
    await db.communicationRoomMember.createMany({
      data: [
        { roomId: room.id, userId, role: 'member' },
        { roomId: room.id, userId: teacher.id, role: 'moderator' },
      ],
    });

    // If there's a reason, send it as the first message
    if (reason) {
      await db.communicationMessage.create({
        data: {
          roomId: room.id,
          senderId: userId,
          content: reason,
          messageType: 'text',
        },
      });
    }

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('CommunicationRoom POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// @ts-nocheck
