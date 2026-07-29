import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.userId;

    // Fetch user profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
        schoolId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch school info
    const school = user.schoolId
      ? await db.school.findUnique({
          where: { id: user.schoolId },
          select: { id: true, name: true, schoolType: true, address: true },
        })
      : null;

    // Fetch class groups the user is associated with
    const classGroupTeachers = await db.classGroupTeacher.findMany({
      where: { userId },
      include: {
        classGroup: {
          select: { id: true, name: true, gradeLevel: true, schoolType: true },
        },
      },
    });

    // Fetch learning progress entries created by the user
    const learningProgressEntries = await db.learningProgressEntry.findMany({
      where: { teacherId: userId },
      select: {
        id: true,
        competencyId: true,
        level: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch assessments created by the user
    const assessments = await db.assessment.findMany({
      where: { teacherId: userId },
      select: {
        id: true,
        title: true,
        type: true,
        date: true,
        createdAt: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch generated reports
    const reports = await db.report.findMany({
      where: { generatedByUserId: userId },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch audit log entries
    const auditLogs = await db.auditLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch data export requests
    const dataExportRequests = await db.dataExportRequest.findMany({
      where: { requestedByUserId: userId },
      select: {
        id: true,
        scope: true,
        status: true,
        requestedAt: true,
        completedAt: true,
      },
      take: 100,
      orderBy: { requestedAt: 'desc' },
    });

    // Fetch teacher notes
    const teacherNotes = await db.teacherNote.findMany({
      where: { userId },
      select: {
        id: true,
        content: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch attendance sessions
    const attendanceSessions = await db.attendanceSession.findMany({
      where: { teacherId: userId },
      select: {
        id: true,
        date: true,
        status: true,
        createdAt: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch notifications
    const notifications = await db.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        read: true,
        createdAt: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch notebooks
    const notebooks = await db.notebook.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch homework
    const homeworks = await db.homework.findMany({
      where: { createdById: userId },
      select: {
        id: true,
        title: true,
        dueDate: true,
        createdAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    // For students: fetch their own data
    let studentData = null;
    if (user.role === 'STUDENT') {
      const student = await db.student.findFirst({
        where: { email: user.email, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          enrollments: {
            select: {
              id: true,
              classGroup: { select: { name: true, gradeLevel: true } },
              startDate: true,
              endDate: true,
            },
          },
          learningProgressEntries: {
            select: {
              id: true,
              level: true,
              comment: true,
              createdAt: true,
            },
            take: 200,
            orderBy: { createdAt: 'desc' },
          },
          assessmentResults: {
            select: {
              id: true,
              score: true,
              comment: true,
              createdAt: true,
            },
            take: 200,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      studentData = student;
    }

    // For parents: fetch linked students
    let parentLinks = null;
    if (user.role === 'PARENT') {
      parentLinks = await db.parentStudentLink.findMany({
        where: { userId },
        select: {
          id: true,
          relationship: true,
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    // Construct the export data
    const exportData: Record<string, unknown> = {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        platform: 'CompetenceTrack',
        legalBasis: 'DSGVO Art. 20 - Recht auf Datenübertragbarkeit',
        userId: user.id,
      },
      userProfile: user,
      school,
      classAssociations: classGroupTeachers.map((cgt) => ({
        role: cgt.role,
        classGroup: cgt.classGroup,
      })),
      learningProgress: learningProgressEntries,
      assessments,
      reports,
      auditLogs,
      dataExportRequests,
      teacherNotes,
      attendanceSessions,
      notifications,
      notebooks,
      homeworks,
    };

    if (studentData) {
      exportData.studentData = studentData;
    }

    if (parentLinks) {
      exportData.parentLinks = parentLinks;
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="competencetrack-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('GDPR data export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
