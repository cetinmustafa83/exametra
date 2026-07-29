import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { differenceInCalendarDays } from 'date-fns';

// ── GET: Returns dashboard data for the parent ────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user?.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden - Parent role required' }, { status: 403 });
    }

    const parentId = session.userId;
    const schoolId = session.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 });
    }

    // Get all children linked to this parent
    const parentLinks = await db.parentStudentLink.findMany({
      where: { parentId },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            enrollments: {
              include: {
                classGroup: {
                  select: { id: true, name: true, gradeLevel: true },
                },
              },
            },
          },
        },
      },
    });

    const children = parentLinks.map((link) => ({
      studentId: link.student.id,
      firstName: link.student.firstName,
      lastName: link.student.lastName,
      relationship: link.relationship,
      userId: link.student.userId,
      classGroups: link.student.enrollments.map((e) => ({
        id: e.classGroup.id,
        name: e.classGroup.name,
        gradeLevel: e.classGroup.gradeLevel,
      })),
    }));

    // For each child, gather data
    const childrenData = [];

    for (const child of children) {
      const studentId = child.studentId;
      const classIds = child.classGroups.map((c) => c.id);

      // Illness reports
      const illnessReports = await db.illnessReport.findMany({
        where: { studentId, schoolId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          reason: true,
          description: true,
          startDate: true,
          endDate: true,
          parentApprovalStatus: true,
          status: true,
          reporterType: true,
          documentUrl: true,
          createdAt: true,
        },
      });

      // Upcoming exams (calendar events with type 'exam')
      const upcomingExams = classIds.length > 0
        ? await db.calendarEvent.findMany({
            where: {
              schoolId,
              eventType: 'exam',
              classGroupId: { in: classIds },
              date: { gte: new Date() },
            },
            include: {
              subject: { select: { id: true, name: true } },
              classGroup: { select: { id: true, name: true } },
            },
            orderBy: { date: 'asc' },
            take: 10,
          })
        : [];

      // Recent grades (computed grades)
      const recentGrades = await db.computedGrade.findMany({
        where: { studentId },
        include: {
          subject: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
        },
        orderBy: { computedAt: 'desc' },
        take: 10,
      });

      // Attendance summary
      const attendanceRecords = await db.attendanceRecord.findMany({
        where: {
          studentId,
          session: { classGroupId: { in: classIds } },
        },
        select: { status: true },
      });

      const attendanceSummary = {
        total: attendanceRecords.length,
        present: attendanceRecords.filter((r) => r.status === 'PRESENT').length,
        absent: attendanceRecords.filter((r) => r.status === 'ABSENT').length,
        excused: attendanceRecords.filter((r) => r.status === 'EXCUSED').length,
        late: attendanceRecords.filter((r) => r.status === 'LATE').length,
      };

      // Counseling appointments
      const counselingAppointments = child.userId
        ? await db.counselingAppointment.findMany({
            where: { studentId: child.userId, schoolId },
            orderBy: { scheduledAt: 'desc' },
            take: 5,
            select: {
              id: true,
              requestType: true,
              status: true,
              scheduledAt: true,
              description: true,
              counselor: { select: { firstName: true, lastName: true } },
            },
          })
        : [];

      // Disciplinary cases
      const disciplinaryCases = await db.disciplinaryCase.findMany({
        where: { studentId, schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          caseType: true,
          description: true,
          status: true,
          createdAt: true,
          resolution: true,
        },
      });

      // Homework due
      const homeworkDue = classIds.length > 0
        ? await db.homework.findMany({
            where: {
              schoolId,
              classGroupId: { in: classIds },
              dueDate: { gte: new Date() },
              isPublished: true,
              deletedAt: null,
            },
            include: {
              subject: { select: { id: true, name: true } },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
          })
        : [];

      childrenData.push({
        ...child,
        illnessReports,
        upcomingExams: upcomingExams.map((exam) => ({
          ...exam,
          daysUntil: differenceInCalendarDays(new Date(exam.date), new Date()),
        })),
        recentGrades,
        attendanceSummary,
        counselingAppointments,
        disciplinaryCases,
        homeworkDue: homeworkDue.map((h) => ({
          id: h.id,
          title: h.title,
          dueDate: h.dueDate.toISOString(),
          subject: h.subject ? { id: h.subject.id, name: h.subject.name } : null,
        })),
      });
    }

    // Pending approvals (illness reports that need parent approval)
    const pendingApprovals = await db.illnessReport.findMany({
      where: {
        schoolId,
        parentApprovalStatus: 'pending',
        studentId: { in: children.map((c) => c.studentId) },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // School announcements for parents
    const announcements = await db.announcement.findMany({
      where: {
        schoolId,
        deletedAt: null,
        OR: [
          { targetAudience: 'all' },
          { targetAudience: 'parents' },
        ],
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Communication rooms for this parent's children
    const childUserIds = children
      .filter((c) => c.userId)
      .map((c) => c.userId as string);

    const communicationRooms = childUserIds.length > 0
      ? await db.communicationRoom.findMany({
          where: {
            studentId: { in: childUserIds },
            status: { in: ['requested', 'active'] },
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, content: true, createdAt: true, senderId: true },
            },
          },
        })
      : [];

    // School events
    const schoolEvents = await db.schoolEvent.findMany({
      where: {
        schoolId,
        deletedAt: null,
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        startDate: true,
        eventType: true,
        location: true,
      },
    });

    return NextResponse.json({
      children: childrenData,
      pendingApprovals,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        announcementType: a.announcementType,
        isPinned: a.isPinned,
        createdAt: a.createdAt.toISOString(),
        author: a.author ? { firstName: a.author.firstName, lastName: a.author.lastName } : null,
      })),
      communicationRooms: communicationRooms.map((r) => ({
        id: r.id,
        status: r.status,
        roomType: r.roomType,
        student: r.student,
        teacher: r.teacher,
        lastMessage: r.messages[0] ? {
          id: r.messages[0].id,
          content: r.messages[0].content,
          createdAt: r.messages[0].createdAt.toISOString(),
          senderId: r.messages[0].senderId,
        } : null,
        updatedAt: r.updatedAt.toISOString(),
      })),
      schoolEvents: schoolEvents.map((e) => ({
        ...e,
        startDate: e.startDate.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Parent Portal GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
