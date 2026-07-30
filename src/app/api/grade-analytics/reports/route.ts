import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: List grade reports
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') ?? session.user?.schoolId ?? undefined;
    const type = searchParams.get('type');

    const role = session.user?.role;
    const isAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';
    const isTeacher = role === 'TEACHER';

    const where: Record<string, unknown> = {};
    if (schoolId) where.schoolId = schoolId;
    if (type) where.type = type;

    // Non-admin users can only see their own reports
    if (!isAdmin && !isTeacher) {
      where.generatedBy = session.userId;
    }

    const reports = await db.gradeReport.findMany({
      where,
      include: {
        generator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        dateRange: r.dateRange,
        classIds: r.classIds,
        subjectIds: r.subjectIds,
        metrics: r.metrics,
        status: r.status,
        generatedBy: r.generator ? `${r.generator.firstName} ${r.generator.lastName}` : 'Unknown',
        createdAt: r.createdAt,
        hasFileData: !!r.fileData,
      })),
    });
  } catch (error) {
    console.error('Grade reports list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Generate a new grade report
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = session.user?.role;
    const isAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';
    const isTeacher = role === 'TEACHER';

    if (!isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      type,
      dateRange,
      classIds,
      subjectIds,
      metrics,
    } = body;

    if (!title || !type || !dateRange) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const schoolId = body.schoolId ?? session.user?.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Build the grade data for the report
    const gradeWhere: Record<string, unknown> = {
      classGroup: { schoolId },
    };

    const parsedDateRange = typeof dateRange === 'string' ? JSON.parse(dateRange) : dateRange;
    if (parsedDateRange.from || parsedDateRange.to) {
      if (parsedDateRange.from) {
        gradeWhere.computedAt = { gte: new Date(parsedDateRange.from) };
      }
      if (parsedDateRange.to) {
        gradeWhere.computedAt = { ...(gradeWhere.computedAt as object || {}), lte: new Date(parsedDateRange.to) };
      }
    }

    const parsedClassIds = typeof classIds === 'string' ? JSON.parse(classIds) : classIds;
    const parsedSubjectIds = typeof subjectIds === 'string' ? JSON.parse(subjectIds) : subjectIds;
    const parsedMetrics = typeof metrics === 'string' ? JSON.parse(metrics) : metrics;

    if (parsedClassIds && Array.isArray(parsedClassIds) && parsedClassIds.length > 0) {
      gradeWhere.classGroupId = { in: parsedClassIds };
    }
    if (parsedSubjectIds && Array.isArray(parsedSubjectIds) && parsedSubjectIds.length > 0) {
      gradeWhere.subjectId = { in: parsedSubjectIds };
    }

    // Fetch grades for report
    const grades = await db.computedGrade.findMany({
      where: gradeWhere,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
      },
      orderBy: { computedAt: 'asc' },
    });

    // Generate report data
    const reportData: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      generatedBy: `${session.user?.firstName} ${session.user?.lastName}`,
      title,
      type,
      dateRange: parsedDateRange,
      totalGrades: grades.length,
    };

    // Include selected metrics
    if (!parsedMetrics || parsedMetrics.includes('distribution')) {
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        const rounded = Math.round(val);
        if (rounded >= 1 && rounded <= 6) distribution[rounded]++;
      });
      reportData.distribution = distribution;
    }

    if (!parsedMetrics || parsedMetrics.includes('averages')) {
      const avg = grades.length > 0
        ? Math.round((grades.reduce((s, g) => s + (g.overriddenValue ?? g.computedValue), 0) / grades.length) * 100) / 100
        : 0;
      reportData.averageGrade = avg;
    }

    if (!parsedMetrics || parsedMetrics.includes('classComparison')) {
      const classAvg: Record<string, { name: string; average: number; count: number }> = {};
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        if (!classAvg[g.classGroupId]) {
          classAvg[g.classGroupId] = { name: g.classGroup.name, average: 0, count: 0 };
        }
        classAvg[g.classGroupId].average += val;
        classAvg[g.classGroupId].count += 1;
      });
      Object.values(classAvg).forEach((c) => {
        c.average = c.count > 0 ? Math.round((c.average / c.count) * 100) / 100 : 0;
      });
      reportData.classComparison = classAvg;
    }

    if (!parsedMetrics || parsedMetrics.includes('subjectAnalysis')) {
      const subjectAvg: Record<string, { name: string; average: number; count: number }> = {};
      grades.forEach((g) => {
        const val = g.overriddenValue ?? g.computedValue;
        if (!subjectAvg[g.subjectId]) {
          subjectAvg[g.subjectId] = { name: g.subject.name, average: 0, count: 0 };
        }
        subjectAvg[g.subjectId].average += val;
        subjectAvg[g.subjectId].count += 1;
      });
      Object.values(subjectAvg).forEach((s) => {
        s.average = s.count > 0 ? Math.round((s.average / s.count) * 100) / 100 : 0;
      });
      reportData.subjectAnalysis = subjectAvg;
    }

    if (!parsedMetrics || parsedMetrics.includes('studentGrades')) {
      reportData.studentGrades = grades.map((g) => ({
        student: `${g.student.firstName} ${g.student.lastName}`,
        subject: g.subject.name,
        class: g.classGroup.name,
        grade: g.overriddenValue ?? g.computedValue,
        isFinalized: g.isFinalized,
        period: g.period,
      }));
    }

    // Create the report record
    const report = await db.gradeReport.create({
      data: {
        schoolId,
        generatedBy: session.userId,
        title,
        type,
        dateRange: typeof dateRange === 'string' ? dateRange : JSON.stringify(dateRange),
        classIds: classIds ? (typeof classIds === 'string' ? classIds : JSON.stringify(classIds)) : null,
        subjectIds: subjectIds ? (typeof subjectIds === 'string' ? subjectIds : JSON.stringify(subjectIds)) : null,
        metrics: metrics ? (typeof metrics === 'string' ? metrics : JSON.stringify(metrics)) : null,
        status: 'completed',
        fileData: JSON.stringify(reportData),
      },
    });

    return NextResponse.json({
      id: report.id,
      title: report.title,
      type: report.type,
      status: report.status,
      createdAt: report.createdAt,
      reportData,
    });
  } catch (error) {
    console.error('Grade report generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
