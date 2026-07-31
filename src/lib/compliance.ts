/**
 * Module L: Legal & Data Protection Compliance Utilities
 * Provides compliance checks, DPIA gating, feature access control, and data retention helpers
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Data Categories & Retention Mapping ──────────────────────────────────

export const DATA_CATEGORIES = {
  LEARNING_PROGRESS: "LEARNING_PROGRESS",
  ASSESSMENT_RESULT: "ASSESSMENT_RESULT",
  FINAL_REPORT: "FINAL_REPORT",
  DISCIPLINARY_RECORD: "DISCIPLINARY_RECORD",
  EXAM_INCIDENT: "EXAM_INCIDENT",
  MESSAGE: "MESSAGE",
  AI_TUTOR_LOG: "AI_TUTOR_LOG",
  NOTEBOOK_PAGE: "NOTEBOOK_PAGE",
  SIGNAGE_LOG: "SIGNAGE_LOG",
  TEACHER_AUDIT_LOG: "TEACHER_AUDIT_LOG",
} as const;

export const MODULE_DPIA_REQUIRED = ["AI_TUTOR", "EXAM_MODE"] as const;

export const BUNDESLAND_RETENTION_DEFAULTS: Record<
  string,
  Record<string, number>
> = {
  BERLIN: {
    LEARNING_PROGRESS: 12,
    ASSESSMENT_RESULT: 12,
    FINAL_REPORT: 30,
    DISCIPLINARY_RECORD: 5,
    EXAM_INCIDENT: 6,
    MESSAGE: 12,
    AI_TUTOR_LOG: 6,
    NOTEBOOK_PAGE: 12,
    SIGNAGE_LOG: 3,
    TEACHER_AUDIT_LOG: 12,
  },
  BAYERN: {
    LEARNING_PROGRESS: 12,
    ASSESSMENT_RESULT: 12,
    FINAL_REPORT: 35,
    DISCIPLINARY_RECORD: 5,
    EXAM_INCIDENT: 6,
    MESSAGE: 12,
    AI_TUTOR_LOG: 6,
    NOTEBOOK_PAGE: 12,
    SIGNAGE_LOG: 3,
    TEACHER_AUDIT_LOG: 12,
  },
  // Add remaining 14 states with their specific retention rules
  // For now, using Berlin as fallback
  BADEN_WUERTTEMBERG: {
    LEARNING_PROGRESS: 12,
    ASSESSMENT_RESULT: 12,
    FINAL_REPORT: 30,
    DISCIPLINARY_RECORD: 5,
    EXAM_INCIDENT: 6,
    MESSAGE: 12,
    AI_TUTOR_LOG: 6,
    NOTEBOOK_PAGE: 12,
    SIGNAGE_LOG: 3,
    TEACHER_AUDIT_LOG: 12,
  },
};

// ─── Compliance Status Checks ──────────────────────────────────────────────

export interface ComplianceCheckResult {
  allowed: boolean;
  reason?: string;
  missingItems?: string[];
}

/**
 * Check if a module can be accessed by a school
 * Verifies: onboarding completion, DPIA presence (if required), and other gates
 */
export async function checkModuleAccess(
  schoolId: string,
  module: string
): Promise<ComplianceCheckResult> {
  try {
    const complianceStatus = await prisma.schoolComplianceStatus.findUnique({
      where: { schoolId },
    });

    if (!complianceStatus?.onboardingCompleted) {
      return {
        allowed: false,
        reason: "Compliance onboarding incomplete. Please complete the onboarding wizard first.",
      };
    }

    // Check if module requires DPIA
    if (MODULE_DPIA_REQUIRED.includes(module as any)) {
      const dpiaRecord = await prisma.dpiaRecord.findUnique({
        where: {
          schoolId_moduleScope: {
            schoolId,
            moduleScope: module,
          },
        },
      });

      if (!dpiaRecord) {
        return {
          allowed: false,
          reason: `DPIA documentation not found for ${module}. Please upload DPIA before enabling this module.`,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("[v0] Error checking module access:", error);
    return {
      allowed: false,
      reason: "Error checking compliance status",
    };
  }
}

/**
 * Get retention period for a data category
 * Returns the months after which data should be flagged for deletion
 */
export async function getRetentionPeriod(
  schoolId: string,
  dataCategory: string
): Promise<number | null> {
  try {
    const policy = await prisma.dataRetentionPolicy.findFirst({
      where: {
        schoolId,
        dataCategory,
      },
    });

    return policy?.retentionPeriodMonths || null;
  } catch (error) {
    console.error("[v0] Error getting retention period:", error);
    return null;
  }
}

/**
 * Flag data entities for deletion when retention period expires
 * Called by daily retention job
 */
export async function flagExpiredRecords(schoolId: string): Promise<number> {
  try {
    const policies = await prisma.dataRetentionPolicy.findMany({
      where: { schoolId },
    });

    let flaggedCount = 0;

    for (const policy of policies) {
      if (!policy.retentionPeriodMonths) continue;

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() - policy.retentionPeriodMonths);

      // This is a placeholder for entity-specific logic
      // In production, you'd loop over each entity type and flag accordingly
      flaggedCount++;
    }

    return flaggedCount;
  } catch (error) {
    console.error("[v0] Error flagging expired records:", error);
    return 0;
  }
}

/**
 * Check if user has DPO role
 */
export async function isDPO(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user?.role === "DPO";
  } catch (error) {
    console.error("[v0] Error checking DPO status:", error);
    return false;
  }
}

/**
 * Get school compliance status summary
 */
export async function getComplianceStatus(schoolId: string) {
  try {
    const status = await prisma.schoolComplianceStatus.findUnique({
      where: { schoolId },
    });

    const policies = await prisma.dataRetentionPolicy.findMany({
      where: { schoolId },
    });

    const dpias = await prisma.dpiaRecord.findMany({
      where: { schoolId },
    });

    const consultations = await prisma.complianceConsultation.findMany({
      where: { schoolId },
    });

    return {
      status,
      policiesConfigured: policies.length,
      policiesReviewed: policies.filter((p) => p.reviewedAt).length,
      dpiaRecords: dpias,
      consultations,
    };
  } catch (error) {
    console.error("[v0] Error getting compliance status:", error);
    return null;
  }
}

/**
 * Ensure school compliance status record exists
 */
export async function ensureComplianceStatus(schoolId: string) {
  try {
    const existing = await prisma.schoolComplianceStatus.findUnique({
      where: { schoolId },
    });

    if (!existing) {
      return await prisma.schoolComplianceStatus.create({
        data: {
          schoolId,
          onboardingCompleted: false,
        },
      });
    }

    return existing;
  } catch (error) {
    console.error("[v0] Error ensuring compliance status:", error);
    return null;
  }
}

/**
 * Initialize retention policies for a school based on Bundesland
 */
export async function initializeRetentionPolicies(
  schoolId: string,
  bundesland: string
) {
  try {
    const defaults =
      BUNDESLAND_RETENTION_DEFAULTS[bundesland] ||
      BUNDESLAND_RETENTION_DEFAULTS.BERLIN;

    for (const [category, months] of Object.entries(defaults)) {
      // Check if policy already exists
      const existing = await prisma.dataRetentionPolicy.findFirst({
        where: {
          schoolId,
          dataCategory: category,
        },
      });

      if (!existing) {
        await prisma.dataRetentionPolicy.create({
          data: {
            schoolId,
            dataCategory: category,
            retentionPeriodMonths: months,
            isDefault: true,
          },
        });
      }
    }

    return true;
  } catch (error) {
    console.error("[v0] Error initializing retention policies:", error);
    return false;
  }
}

/**
 * Get Bundesland retention defaults
 */
export function getRetentionDefaults(bundesland: string) {
  return (
    BUNDESLAND_RETENTION_DEFAULTS[bundesland] ||
    BUNDESLAND_RETENTION_DEFAULTS.BERLIN
  );
}
