import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAuditTrailForDataSubject } from "@/lib/audit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/v1/gdpr/export
 * Right of Access (Art. 15 GDPR)
 * User can request export of all their personal data
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: requestedUserId } = await req.json();

    // Users can only export their own data; admins can export any user's data
    const isAdmin = session.user?.role === "SCHOOL_ADMIN" || session.user?.role === "SUPER_ADMIN";
    if (!isAdmin && session.userId !== requestedUserId) {
      return NextResponse.json(
        { error: "You can only export your own data" },
        { status: 403 }
      );
    }

    // Fetch all personal data
    const user = await prisma.user.findUnique({
      where: { id: requestedUserId },
      include: {
        student: true,
        learningProgressEntries: true,
        assessments: true,
        notebooks: true,
        parentMessagesSent: true,
        auditLogs: { take: 100 },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get audit trail for this user
    const auditTrail = await getAuditTrailForDataSubject(user.schoolId!, requestedUserId);

    // Compile export data
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      },
      student: user.student || null,
      learningProgress: user.learningProgressEntries || [],
      assessments: user.assessments || [],
      notebooks: user.notebooks || [],
      messages: user.parentMessagesSent || [],
      auditTrail: auditTrail,
      exportedAt: new Date().toISOString(),
      retentionNote:
        "Some data (e.g., final grades) may be retained longer due to legal requirements. See your school's privacy notice.",
    };

    return NextResponse.json({
      success: true,
      data: exportData,
      format: "json",
      message: "Your personal data export is ready",
    });
  } catch (error) {
    console.error("[v0] Error exporting user data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
