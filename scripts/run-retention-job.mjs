/**
 * Daily Retention Enforcement Job
 * Flags records that have exceeded their retention period
 * Called once per day; can be integrated with cron (e.g., GitHub Actions, node-schedule)
 *
 * Usage: npx ts-node scripts/run-retention-job.ts
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

interface FlaggedRecord {
  entityType: string;
  entityId: string;
  dataCategory: string;
  flaggedAt: Date;
  reason: string;
}

/**
 * Check records for each school and flag those exceeding retention period
 */
async function runRetentionJob() {
  console.log("[v0] Starting retention enforcement job...");
  const startTime = Date.now();

  try {
    // Get all schools
    const schools = await prisma.school.findMany({
      select: { id: true, name: true },
    });

    let totalFlagged = 0;
    const report: { school: string; flagged: number }[] = [];

    for (const school of schools) {
      const schoolFlagged = await flagExpiredRecordsForSchool(school.id);
      totalFlagged += schoolFlagged;
      report.push({ school: school.name, flagged: schoolFlagged });

      console.log(
        `[v0] School "${school.name}": ${schoolFlagged} records flagged`
      );
    }

    console.log(
      `[v0] Retention job completed: ${totalFlagged} total records flagged`
    );
    console.log(`[v0] Duration: ${Date.now() - startTime}ms`);

    // Log retention job to audit
    await prisma.auditLog.create({
      data: {
        action: "RETENTION_JOB_EXECUTED",
        entityType: "RetentionJob",
        metadata: JSON.stringify({
          totalFlagged,
          schoolsProcessed: schools.length,
          timestamp: new Date().toISOString(),
          report,
        }),
      },
    });

    return { success: true, totalFlagged, report };
  } catch (error) {
    console.error("[v0] Error in retention job:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Flag expired records for a specific school
 */
async function flagExpiredRecordsForSchool(schoolId: string): Promise<number> {
  // Get all retention policies for this school
  const policies = await prisma.dataRetentionPolicy.findMany({
    where: { schoolId },
  });

  let flaggedCount = 0;

  for (const policy of policies) {
    if (!policy.retentionPeriodMonths) continue;

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() - policy.retentionPeriodMonths);

    // Flag expired records based on category
    const categoryFlagged = await flagRecordsByCategory(
      schoolId,
      policy.dataCategory,
      expiryDate
    );

    flaggedCount += categoryFlagged;
  }

  return flaggedCount;
}

/**
 * Flag records of a specific category that are older than expiryDate
 */
async function flagRecordsByCategory(
  schoolId: string,
  dataCategory: string,
  expiryDate: Date
): Promise<number> {
  let flaggedCount = 0;

  try {
    switch (dataCategory) {
      case "LEARNING_PROGRESS":
        flaggedCount += await flagRecordsByEntityType(
          schoolId,
          "LearningProgressEntry",
          expiryDate
        );
        break;

      case "ASSESSMENT_RESULT":
        flaggedCount += await flagRecordsByEntityType(
          schoolId,
          "Assessment",
          expiryDate
        );
        break;

      case "FINAL_REPORT":
        // Final reports should NOT be auto-flagged (legal requirement to keep permanently)
        console.log(
          `[v0] Skipping FINAL_REPORT for ${schoolId} (legally mandated retention)`
        );
        break;

      case "DISCIPLINARY_RECORD":
        flaggedCount += await flagRecordsByEntityType(
          schoolId,
          "DisciplinaryCase",
          expiryDate
        );
        break;

      case "EXAM_INCIDENT":
        flaggedCount += await flagRecordsByEntityType(
          schoolId,
          "ExamIncidentEvent",
          expiryDate
        );
        break;

      case "MESSAGE":
        flaggedCount += await flagRecordsByEntityType(
          schoolId,
          "ParentMessage",
          expiryDate
        );
        break;

      case "AI_TUTOR_LOG":
        // Note: In production, this would reference actual AI tutor logs
        console.log(`[v0] AI_TUTOR_LOG flagging not yet implemented`);
        break;

      case "NOTEBOOK_PAGE":
        flaggedCount += await flagRecordsByEntityType(
          schoolId,
          "Notebook",
          expiryDate
        );
        break;

      case "SIGNAGE_LOG":
        // Note: Reference actual signage log entity
        console.log(`[v0] SIGNAGE_LOG flagging not yet implemented`);
        break;

      case "TEACHER_AUDIT_LOG":
        flaggedCount += await flagRecordsByEntityType(
          schoolId,
          "AuditLog",
          expiryDate
        );
        break;
    }
  } catch (error) {
    console.error(
      `[v0] Error flagging ${dataCategory} records for school ${schoolId}:`,
      error
    );
  }

  return flaggedCount;
}

/**
 * Generic function to flag expired records by entity type
 */
async function flagRecordsByEntityType(
  schoolId: string,
  entityType: string,
  expiryDate: Date
): Promise<number> {
  // Check if records of this type already have deletion flags
  const alreadyFlagged = await prisma.deletionFlag.findMany({
    where: {
      schoolId,
      entityType,
      deletedAt: null, // Not yet hard-deleted
      approvedAt: null, // Not yet approved
    },
  });

  const alreadyFlaggedIds = new Set(alreadyFlagged.map((f) => f.entityId));

  // Create new flags for records not yet flagged
  let flaggedCount = 0;

  // This is a placeholder; in production, you'd query each entity type
  // Example for LearningProgressEntry:
  if (entityType === "LearningProgressEntry") {
    const expiredRecords = await prisma.learningProgressEntry
      .findMany({
        where: {
          createdAt: { lt: expiryDate },
          // Filter by school if the entity has schoolId
        },
        select: { id: true },
        take: 1000, // Limit to prevent huge queries
      })
      .catch(() => []);

    for (const record of expiredRecords) {
      if (!alreadyFlaggedIds.has(record.id)) {
        await prisma.deletionFlag.create({
          data: {
            schoolId,
            entityType,
            entityId: record.id,
            dataCategory: "LEARNING_PROGRESS",
            reason: "retention period expired",
          },
        });
        flaggedCount++;
      }
    }
  }

  return flaggedCount;
}

// Run the job if this script is executed directly
if (require.main === module) {
  runRetentionJob()
    .then((result) => {
      console.log(
        `[v0] Job result:`,
        JSON.stringify(result, null, 2)
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("[v0] Job failed:", error);
      process.exit(1);
    });
}

module.exports = { runRetentionJob, flagExpiredRecordsForSchool };
