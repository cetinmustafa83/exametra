import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const studentId = searchParams.get('studentId');
    const template = searchParams.get('template') ?? 'full'; // short, full, custom

    if (!reportId && !studentId) {
      return NextResponse.json({ error: 'reportId or studentId is required' }, { status: 400 });
    }

    let report;
    if (reportId) {
      report = await db.report.findUnique({
        where: { id: reportId },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          classGroup: { select: { id: true, name: true, gradeLevel: true } },
          schoolYear: { select: { id: true, label: true } },
          generatedByUser: { select: { id: true, firstName: true, lastName: true } },
          sections: {
            orderBy: { order: 'asc' },
            include: {
              competencyCategory: { select: { id: true, name: true, color: true } },
            },
          },
        },
      });
    } else if (studentId) {
      // Generate a report on-the-fly for this student
      const student = await db.student.findUnique({
        where: { id: studentId, deletedAt: null },
        include: {
          enrollments: {
            where: { endDate: null },
            take: 1,
            include: { classGroup: { select: { id: true, name: true, gradeLevel: true } } },
          },
          learningProgressEntries: {
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              competency: { select: { code: true, title: true } },
              teacher: { select: { firstName: true, lastName: true } },
            },
          },
          assessmentResults: {
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              assessment: { select: { title: true, type: true } },
            },
          },
        },
      });

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      const classGroup = student.enrollments[0]?.classGroup;
      report = {
        id: 'on-the-fly',
        student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
        classGroup: classGroup ?? { id: '', name: 'N/A', gradeLevel: 0 },
        schoolYear: { id: '', label: new Date().getFullYear().toString() },
        generatedByUser: { id: session.userId ?? '', firstName: session.user?.firstName ?? '', lastName: session.user?.lastName ?? '' },
        period: 'Aktuell',
        status: 'DRAFT',
        includesGrades: true,
        generatedAt: new Date().toISOString(),
        sections: student.learningProgressEntries.map((entry, idx) => ({
          order: idx,
          generatedText: `${entry.competency?.title ?? 'Kompetenz'}: ${entry.level ?? 'N/A'}`,
          competencyCategory: { id: entry.competency?.id ?? '', name: entry.competency?.code ?? '', color: '#10b981' },
        })),
        _studentData: student,
        _classGroup: classGroup,
      };
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const htmlContent = generatePrintHtml(report, template);

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Report PDF error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generatePrintHtml(report: Record<string, unknown>, template: string): string {
  const student = report.student as { firstName: string; lastName: string };
  const classGroup = report.classGroup as { name: string; gradeLevel: number };
  const schoolYear = report.schoolYear as { label: string };
  const generatedByUser = report.generatedByUser as { firstName: string; lastName: string };
  const sections = (report.sections as Array<{
    order: number;
    generatedText: string;
    competencyCategory: { name: string; color: string | null } | null;
  }>).sort((a, b) => a.order - b.order);

  const isShort = template === 'short';
  const initials = student.firstName[0] + student.lastName[0];

  const sectionsHtml = sections.map((s) => {
    const catName = s.competencyCategory?.name ?? '';
    const catColor = s.competencyCategory?.color ?? '#10b981';
    return `
      <div class="section">
        ${catName ? `<h3 class="section-title" style="color: ${catColor}">${catName}</h3>` : ''}
        <p class="section-text">${s.generatedText}</p>
      </div>
    `;
  }).join('\n');

  // Grades table for full template
  const studentData = report._studentData as {
    assessmentResults?: Array<{
      score: number | null;
      grade: string | null;
      assessment: { title: string; type: string };
    }>;
  } | undefined;

  const gradesHtml = !isShort && studentData?.assessmentResults?.length
    ? `
      <div class="grades-section">
        <h3 class="section-title" style="color: #10b981">Notenubersicht</h3>
        <table class="grades-table">
          <thead>
            <tr>
              <th>Uberprufung</th>
              <th>Typ</th>
              <th>Punkte</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${studentData.assessmentResults!.map((r) => `
              <tr>
                <td>${r.assessment.title}</td>
                <td>${r.assessment.type}</td>
                <td>${r.score ?? '—'}</td>
                <td>${r.grade ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Kompetenzbericht — ${student.firstName} ${student.lastName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      position: relative;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 3px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #14b8a6);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .header-text h1 {
      color: #10b981;
      font-size: 24px;
      margin-bottom: 4px;
    }
    .header-text h2 {
      color: #666;
      font-size: 18px;
      margin-bottom: 6px;
    }
    .template-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-short { background: #fef3c7; color: #92400e; }
    .badge-full { background: #d1fae5; color: #065f46; }
    .badge-custom { background: #ede9fe; color: #5b21b6; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .badge-final { background: #d1fae5; color: #065f46; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
      color: #555;
      margin-bottom: 24px;
    }
    .meta dt {
      font-weight: 600;
      color: #333;
    }
    .section {
      margin-bottom: 20px;
      padding: 14px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .section-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .section-text {
      font-size: 14px;
      color: #444;
    }
    .grades-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .grades-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 13px;
    }
    .grades-table th {
      text-align: left;
      padding: 6px 10px;
      border-bottom: 2px solid #e5e7eb;
      color: #555;
      font-weight: 600;
    }
    .grades-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #f3f4f6;
    }
    .grade-value {
      font-weight: 700;
      color: #10b981;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 16px;
      margin-top: 40px;
    }
    .eco-footer {
      text-align: center;
      font-size: 11px;
      color: #10b981;
      margin-top: 8px;
      font-style: italic;
    }
    .watermark {
      position: fixed;
      bottom: 50%;
      right: -60px;
      transform: rotate(-45deg);
      font-size: 72px;
      color: rgba(16, 185, 129, 0.04);
      font-weight: 900;
      pointer-events: none;
      z-index: -1;
    }
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
      .section { break-inside: avoid; }
      .grades-section { break-inside: avoid; }
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    .print-btn:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="watermark">CompetenceTrack</div>
  <button class="print-btn no-print" onclick="window.print()">Drucken / Print</button>

  <div class="header">
    <div class="avatar">${initials}</div>
    <div class="header-text">
      <h1>Kompetenzbericht</h1>
      <h2>${student.firstName} ${student.lastName}</h2>
      <span class="template-badge ${template === 'short' ? 'badge-short' : template === 'custom' ? 'badge-custom' : 'badge-full'}">${template === 'short' ? 'Kurzbericht' : template === 'custom' ? 'Individuell' : 'Vollstandig'}</span>
      <span class="template-badge ${String(report.status) === 'FINAL' ? 'badge-final' : 'badge-draft'}" style="margin-left: 6px">${String(report.status)}</span>
    </div>
  </div>

  <div class="meta">
    <div><dt>Klasse:</dt> <dd>${classGroup.name}${classGroup.gradeLevel ? ` (Jahrgang ${classGroup.gradeLevel})` : ''}</dd></div>
    <div><dt>Schuljahr:</dt> <dd>${schoolYear.label}</dd></div>
    <div><dt>Zeitraum:</dt> <dd>${String(report.period)}</dd></div>
    <div><dt>Erstellt von:</dt> <dd>${generatedByUser.firstName} ${generatedByUser.lastName}</dd></div>
    <div><dt>Datum:</dt> <dd>${new Date(String(report.generatedAt)).toLocaleDateString('de-DE')}</dd></div>
    <div><dt>Noten inklusive:</dt> <dd>${String(report.includesGrades) === 'true' ? 'Ja' : 'Nein'}</dd></div>
  </div>

  ${sectionsHtml}

  ${gradesHtml}

  <div class="footer">
    <p>CompetenceTrack — Kompetenzbericht · ${new Date().toLocaleDateString('de-DE')}</p>
  </div>
  <div class="eco-footer">
    Digital erstellt — Papier sparen, Umwelt schutzen
  </div>
</body>
</html>`;
}
