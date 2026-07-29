import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ── PUT: Update seating arrangement (drag-and-drop, randomize, smart arrange) ──
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user?.role;
    if (
      userRole !== 'TEACHER' &&
      userRole !== 'SCHOOL_ADMIN' &&
      userRole !== 'VICE_PRINCIPAL' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const chart = await db.seatingChart.findFirst({ where: { id } });

    if (!chart) {
      return NextResponse.json({ error: 'Seating chart not found' }, { status: 404 });
    }

    // Only the creator or admin can edit
    if (userRole === 'TEACHER' && chart.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, arrangement, studentId, fromRow, fromCol, toRow, toCol } = body;

    let currentArrangement: Array<{ studentId: string; row: number; col: number }> = [];
    if (chart.arrangement) {
      try {
        currentArrangement = JSON.parse(chart.arrangement);
      } catch { /* ignore */ }
    }

    if (action === 'move' && studentId) {
      // Move a single student from one seat to another
      const existingTarget = currentArrangement.find(
        (a) => a.row === toRow && a.col === toCol
      );
      const existingSource = currentArrangement.find(
        (a) => a.studentId === studentId
      );

      if (existingSource) {
        if (existingTarget) {
          // Swap: move target student to source position
          existingTarget.row = existingSource.row;
          existingTarget.col = existingSource.col;
        }
        existingSource.row = toRow;
        existingSource.col = toCol;
      } else {
        // New placement
        if (existingTarget) {
          // Remove target from their seat (they become unassigned)
          currentArrangement = currentArrangement.filter(
            (a) => a.studentId !== existingTarget.studentId
          );
        }
        currentArrangement.push({ studentId, row: toRow, col: toCol });
      }
    } else if (action === 'randomize') {
      // Shuffle all assigned students randomly
      const assignedStudents = currentArrangement.map((a) => a.studentId);
      // Fisher-Yates shuffle
      for (let i = assignedStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [assignedStudents[i], assignedStudents[j]] = [assignedStudents[j], assignedStudents[i]];
      }
      // Reassign to seats
      const positions = currentArrangement.map((a) => ({ row: a.row, col: a.col }));
      currentArrangement = assignedStudents.map((studentId, i) => ({
        studentId,
        row: positions[i]?.row ?? Math.floor(i / chart.columns),
        col: positions[i]?.col ?? i % chart.columns,
      }));
    } else if (action === 'smart-arrange') {
      // Smart arrange: keep problem students apart based on behavior data
      const enrolledStudents = await db.enrollment.findMany({
        where: { classGroupId: chart.classGroupId, endDate: null },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const studentIds = enrolledStudents.map((e) => e.student.id);

      // Get behavior data
      const behaviorIncidents = await db.behaviorIncident.findMany({
        where: {
          studentId: { in: studentIds },
          severity: { in: ['major', 'severe'] },
        },
        select: { studentId: true, severity: true },
      });

      const behaviorScore = new Map<string, number>();
      for (const incident of behaviorIncidents) {
        const weight = incident.severity === 'severe' ? 3 : 1;
        behaviorScore.set(incident.studentId, (behaviorScore.get(incident.studentId) || 0) + weight);
      }

      // Sort: high behavior score students first, to place them first
      const sortedStudents = [...studentIds].sort((a, b) => {
        return (behaviorScore.get(b) || 0) - (behaviorScore.get(a) || 0);
      });

      // Generate all seat positions
      const allPositions: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < chart.rows; r++) {
        for (let c = 0; c < chart.columns; c++) {
          allPositions.push({ row: r, col: c });
        }
      }

      // Place high-behavior students with maximum distance
      const newArrangement: Array<{ studentId: string; row: number; col: number }> = [];
      const usedPositions = new Set<string>();

      for (const sId of sortedStudents) {
        let bestPos = allPositions[0];
        let bestMinDist = -1;

        for (const pos of allPositions) {
          const key = `${pos.row}-${pos.col}`;
          if (usedPositions.has(key)) continue;

          // Calculate minimum distance to already-placed high-behavior students
          let minDist = Infinity;
          for (const placed of newArrangement) {
            const placedScore = behaviorScore.get(placed.studentId) || 0;
            if (placedScore >= 2) {
              const dist = Math.abs(placed.row - pos.row) + Math.abs(placed.col - pos.col);
              minDist = Math.min(minDist, dist);
            }
          }

          if (minDist > bestMinDist) {
            bestMinDist = minDist;
            bestPos = pos;
          }
        }

        const posKey = `${bestPos.row}-${bestPos.col}`;
        usedPositions.add(posKey);
        newArrangement.push({ studentId: sId, row: bestPos.row, col: bestPos.col });
      }

      currentArrangement = newArrangement;
    } else if (action === 'assign' && arrangement) {
      // Full arrangement replacement
      currentArrangement = arrangement;
    } else if (action === 'clear') {
      // Clear all assignments
      currentArrangement = [];
    } else if (action === 'assign-all') {
      // Assign all unassigned students to empty seats
      const enrolledStudents = await db.enrollment.findMany({
        where: { classGroupId: chart.classGroupId, endDate: null },
        include: {
          student: { select: { id: true } },
        },
      });

      const assignedIds = new Set(currentArrangement.map((a) => a.studentId));
      const unassigned = enrolledStudents
        .map((e) => e.student.id)
        .filter((sId) => !assignedIds.has(sId));

      // Find empty positions
      const usedPositions = new Set(
        currentArrangement.map((a) => `${a.row}-${a.col}`)
      );
      const emptyPositions: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < chart.rows; r++) {
        for (let c = 0; c < chart.columns; c++) {
          if (!usedPositions.has(`${r}-${c}`)) {
            emptyPositions.push({ row: r, col: c });
          }
        }
      }

      // Assign unassigned students to empty positions
      for (let i = 0; i < Math.min(unassigned.length, emptyPositions.length); i++) {
        currentArrangement.push({
          studentId: unassigned[i],
          row: emptyPositions[i].row,
          col: emptyPositions[i].col,
        });
      }
    }

    // Save the updated arrangement
    await db.seatingChart.update({
      where: { id },
      data: { arrangement: JSON.stringify(currentArrangement) },
    });

    // Also update ClassGroup's seatingOrder for backward compatibility
    await db.classGroup.update({
      where: { id: chart.classGroupId },
      data: { seatingOrder: JSON.stringify(currentArrangement) },
    });

    return NextResponse.json({
      success: true,
      arrangement: currentArrangement,
    });
  } catch (error) {
    console.error('SeatingChart Arrange PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
