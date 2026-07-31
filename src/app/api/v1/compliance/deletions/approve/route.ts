import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { canApproveDeletion } from "@/lib/auth";
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

/**
 * POST /api/v1/compliance/deletions/approve
 * DPO approves deletion of flagged records
 * Body: { flagIds: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify DPO role
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canApprove = await canApproveDeletion(session.userId);
    if (!canApprove) {
      return NextResponse.json(
        { error: "Only DPO can approve deletions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { flagIds } = body;

    if (!flagIds || !Array.isArray(flagIds)) {
      return NextResponse.json(
        { error: "flagIds must be an array" },
        { status: 400 }
      );
    }

    // Approve the flags
    const approved = await prisma.deletionFlag.updateMany({
      where: {
        id: { in: flagIds },
      },
      data: {
        approvedByUserId: session.userId,
        approvedAt: new Date(),
      },
    });

    // Log approval to audit
    await prisma.auditLog.create({
      data: {
        schoolId: session.user?.schoolId,
        userId: session.userId,
        action: "DELETION_FLAGS_APPROVED",
        entityType: "DeletionFlag",
        metadata: JSON.stringify({
          flagCount: approved.count,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      approvedCount: approved.count,
      message: `${approved.count} deletion(s) approved`,
    });
  } catch (error) {
    console.error("[v0] Error approving deletions:", error);
    return NextResponse.json(
      { error: "Failed to approve deletions" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/compliance/deletions/pending
 * Get pending deletion flags awaiting DPO approval
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolId = req.nextUrl.searchParams.get("schoolId");
    if (!schoolId) {
      return NextResponse.json(
        { error: "schoolId parameter required" },
        { status: 400 }
      );
    }

    const pending = await prisma.deletionFlag.findMany({
      where: {
        schoolId,
        approvedAt: null, // Not yet approved
        deletedAt: null, // Not yet hard-deleted
      },
      orderBy: { flaggedAt: "desc" },
    });

    return NextResponse.json({
      count: pending.length,
      deletionFlags: pending,
    });
  } catch (error) {
    console.error("[v0] Error fetching pending deletions:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending deletions" },
      { status: 500 }
    );
  }
}
