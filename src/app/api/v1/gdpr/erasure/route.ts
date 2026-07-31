import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logComplianceAudit } from "@/lib/audit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/v1/gdpr/erasure
 * Right to Erasure / Right to be Forgotten (Art. 17 GDPR)
 * User can request deletion of their data
 * Note: Some data (final grades) may be retained due to legal obligations
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: requestedUserId, reason } = await req.json();

    // Users can only request erasure of their own data
    if (session.userId !== requestedUserId) {
      return NextResponse.json(
        { error: "You can only request erasure of your own data" },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: requestedUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine what can be deleted vs. retained
    const retained = {
      FINAL_REPORT: "Permanent legal record (Schulgesetz requirement)",
      DISCIPLINARY_RECORDS_WITH_CONSEQUENCES:
        "Retained per applicable retention policy",
    };

    const erasedCategories = [
      "MESSAGES",
      "NOTEBOOKS",
      "LEARNING_PROGRESS_ENTRIES",
      "AI_TUTOR_LOGS",
    ];

    // Delete erasable data
    const deletionResults = {
      messagesDeleted: 0,
      notebooksDeleted: 0,
      learningProgressDeleted: 0,
      auditLogsDeleted: 0,
    };

    // Delete messages
    const messageResult = await prisma.parentMessage.deleteMany({
      where: { OR: [{ senderId: requestedUserId }, { recipientId: requestedUserId }] },
    });
    deletionResults.messagesDeleted = messageResult.count;

    // Delete notebooks (student-owned)
    if (user.student?.id) {
      const notebookResult = await prisma.notebook.deleteMany({
        where: { studentId: user.student.id },
      });
      deletionResults.notebooksDeleted = notebookResult.count;
    }

    // Delete learning progress entries
    const lpResult = await prisma.learningProgressEntry.deleteMany({
      where: { userId: requestedUserId },
    });
    deletionResults.learningProgressDeleted = lpResult.count;

    // Note: Audit logs are NOT deleted for audit trail integrity

    // Log the erasure request
    await logComplianceAudit({
      userId: requestedUserId,
      schoolId: user.schoolId || undefined,
      action: "ERASURE_REQUEST_APPROVED",
      entityType: "User",
      entityId: requestedUserId,
      dataSubject: requestedUserId,
      metadata: {
        reason,
        erasedCategories,
        deletionResults,
        retainedCategories: retained,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your erasure request has been processed",
      deleted: deletionResults,
      retained: retained,
      note: "Final grades and disciplinary records with consequences are retained per legal requirements. Contact your DPO for details.",
    });
  } catch (error) {
    console.error("[v0] Error processing erasure request:", error);
    return NextResponse.json(
      { error: "Failed to process erasure request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/gdpr/erasure/status
 * Check status of erasure requests for a user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = req.nextUrl.searchParams.get("userId") || session.userId;

    // Users can only check their own status
    if (session.userId !== userId) {
      return NextResponse.json(
        { error: "You can only check your own erasure status" },
        { status: 403 }
      );
    }

    // Get erasure-related audit logs
    const erasureLogs = await prisma.auditLog.findMany({
      where: {
        dataSubject: userId,
        action: { contains: "ERASURE" },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        timestamp: true,
        metadata: true,
      },
    });

    return NextResponse.json({
      userId,
      recentRequests: erasureLogs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
    });
  } catch (error) {
    console.error("[v0] Error checking erasure status:", error);
    return NextResponse.json(
      { error: "Failed to check erasure status" },
      { status: 500 }
    );
  }
}
