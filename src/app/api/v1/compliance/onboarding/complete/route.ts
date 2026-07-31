import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, state } = body;

    if (!schoolId || !state) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save DPIA records for required modules
    for (const [moduleId, dpiaData] of Object.entries(
      state.dpiaModules || {}
    )) {
      const dpia = dpiaData as any;
      if (dpia.completed) {
        // Check if record exists
        const existing = await prisma.dpiaRecord.findUnique({
          where: {
            schoolId_moduleScope: {
              schoolId,
              moduleScope: moduleId,
            },
          },
        });

        if (existing) {
          await prisma.dpiaRecord.update({
            where: { id: existing.id },
            data: {
              dataProcessingSummary: `DPIA for ${moduleId} completed`,
              completedAt: new Date(),
              documentUrl: dpia.documentUrl || `dpia-${moduleId}.pdf`,
            },
          });
        } else {
          await prisma.dpiaRecord.create({
            data: {
              schoolId,
              moduleScope: moduleId,
              dataProcessingSummary: `DPIA for ${moduleId} completed`,
              completedAt: new Date(),
              documentUrl: dpia.documentUrl || `dpia-${moduleId}.pdf`,
            },
          });
        }
      }
    }

    // Save consultation records
    for (const [moduleId, consultations] of Object.entries(
      state.moduleConsultations || {}
    )) {
      const consult = consultations as any;
      const consultationTypes = [];

      if (consult.elternbeirat) {
        consultationTypes.push("ELTERNBEIRAT");
      }
      if (consult.schulkonferenz) {
        consultationTypes.push("SCHULKONFERENZ");
      }
      if (consult.personalrat) {
        consultationTypes.push("PERSONALRAT");
      }

      for (const type of consultationTypes) {
        await prisma.complianceConsultation.create({
          data: {
            schoolId,
            consultationType: type,
            moduleScope: moduleId,
            acknowledgedByUserId: "system", // In production, get from current user
            acknowledgedAt: new Date(),
            notes: `Consultation acknowledged for ${moduleId}`,
          },
        });
      }
    }

    // Mark onboarding as completed
    await prisma.schoolComplianceStatus.update({
      where: { schoolId },
      data: {
        onboardingCompleted: true,
        moduleGates: JSON.stringify(
          Object.keys(state.dpiaModules || {}).reduce(
            (acc: any, moduleId) => {
              const dpia = (state.dpiaModules || {})[moduleId] as any;
              acc[moduleId] = {
                isApprovedForUse: dpia.completed,
                diaCompleted: dpia.completed,
              };
              return acc;
            },
            {}
          )
        ),
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        schoolId,
        action: "COMPLIANCE_ONBOARDING_COMPLETED",
        entityType: "SchoolComplianceStatus",
        entityId: schoolId,
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          modulesEnabled: Object.keys(state.dpiaModules || {}),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Compliance onboarding completed successfully",
    });
  } catch (error) {
    console.error("[v0] Error completing compliance onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete compliance onboarding" },
      { status: 500 }
    );
  }
}
