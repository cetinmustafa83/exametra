import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { 
  ensureComplianceStatus, 
  initializeRetentionPolicies,
  getRetentionDefaults 
} from "@/lib/compliance";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolId,
      dpoName,
      dpoEmail,
      schultragerName,
      schultragerEmail,
      bundesland,
    } = body;

    if (!schoolId || !dpoName || !dpoEmail || !schultragerName || !schultragerEmail || !bundesland) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure compliance status exists
    const complianceStatus = await ensureComplianceStatus(schoolId);
    if (!complianceStatus) {
      throw new Error("Failed to create compliance status");
    }

    // Update school compliance status with contact info
    await prisma.schoolComplianceStatus.update({
      where: { schoolId },
      data: {
        bundesland,
        dpoDpoContactEmail: dpoEmail,
        schultragerContactEmail: schultragerEmail,
      },
    });

    // Initialize retention policies for this Bundesland
    const policyInitialized = await initializeRetentionPolicies(schoolId, bundesland);
    if (!policyInitialized) {
      throw new Error("Failed to initialize retention policies");
    }

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        schoolId,
        action: "COMPLIANCE_SETUP_STEP_1",
        entityType: "SchoolComplianceStatus",
        entityId: schoolId,
        metadata: JSON.stringify({
          dpoName,
          bundesland,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Step 1 saved successfully",
      retentionDefaults: getRetentionDefaults(bundesland),
    });
  } catch (error) {
    console.error("[v0] Error in compliance step 1:", error);
    return NextResponse.json(
      { error: "Failed to save compliance setup" },
      { status: 500 }
    );
  }
}
