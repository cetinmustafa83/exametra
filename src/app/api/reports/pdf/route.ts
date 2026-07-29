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

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const report = await db.report.findUnique({
      where: { id: reportId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
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

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Generate a print-friendly HTML page
    const htmlContent = generatePrintHtml(report);

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

function generatePrintHtml(report: Record<string, unknown>): string {
  const student = report.student as { firstName: string; lastName: string };
  const classGroup = report.classGroup as { name: string; gradeLevel: number };
  const schoolYear = report.schoolYear as { label: string };
  const generatedByUser = report.generatedByUser as { firstName: string; lastName: string };
  const sections = (report.sections as Array<{
    order: number;
    generatedText: string;
    competencyCategory: { name: string; color: string | null } | null;
  }>).sort((a, b) => a.order - b.order);

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
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #10b981;
      font-size: 28px;
      margin-bottom: 8px;
    }
    .header h2 {
      color: #666;
      font-size: 18px;
      margin-bottom: 6px;
    }
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
      margin-bottom: 24px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .section-text {
      font-size: 14px;
      color: #444;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 16px;
      margin-top: 40px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-draft {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-final {
      background: #d1fae5;
      color: #065f46;
    }
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
      .section { break-inside: avoid; }
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
  <button class="print-btn no-print" onclick="window.print()">Drucken / Print</button>

  <div class="header">
    <h1>Kompetenzbericht</h1>
    <h2>${student.firstName} ${student.lastName}</h2>
    <span class="badge ${String(report.status) === 'FINAL' ? 'badge-final' : 'badge-draft'}">${String(report.status)}</span>
  </div>

  <div class="meta">
    <div><dt>Klasse:</dt> <dd>${classGroup.name} (Jahrgang ${classGroup.gradeLevel})</dd></div>
    <div><dt>Schuljahr:</dt> <dd>${schoolYear.label}</dd></div>
    <div><dt>Zeitraum:</dt> <dd>${String(report.period)}</dd></div>
    <div><dt>Erstellt von:</dt> <dd>${generatedByUser.firstName} ${generatedByUser.lastName}</dd></div>
    <div><dt>Datum:</dt> <dd>${new Date(String(report.generatedAt)).toLocaleDateString()}</dd></div>
    <div><dt>Noten inklusive:</dt> <dd>${String(report.includesGrades) === 'true' ? 'Ja' : 'Nein'}</dd></div>
  </div>

  ${sectionsHtml}

  <div class="footer">
    <p>CompetenceTrack — Kompetenzbericht · ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;
}
