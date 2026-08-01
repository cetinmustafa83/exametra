// SchulOS — Badge Auto-Award Check Utility
// Checks if a student meets requirements for auto-awarded badges

import { db } from '@/lib/db';

// Default badge definitions that get seeded when a school is created
export const DEFAULT_BADGES = [
  {
    name: 'Perfect Attendance',
    description: '100% attendance for 30 consecutive days',
    icon: 'CalendarCheck',
    color: '#10b981',
    category: 'attendance',
    requirementType: 'attendance_rate',
    requirementValue: 30,
    isAuto: true,
  },
  {
    name: 'Competency Master',
    description: 'Achieved mastery level 5+ in a competency',
    icon: 'Award',
    color: '#f59e0b',
    category: 'competency',
    requirementType: 'mastery_level',
    requirementValue: 5,
    isAuto: true,
  },
  {
    name: 'Progress Pioneer',
    description: '10+ progress entries in a month',
    icon: 'TrendingUp',
    color: '#3b82f6',
    category: 'achievement',
    requirementType: 'progress_entries',
    requirementValue: 10,
    isAuto: true,
  },
  {
    name: 'Behavior Star',
    description: '5+ positive behavior entries',
    icon: 'Star',
    color: '#eab308',
    category: 'behavior',
    requirementType: 'behavior_count',
    requirementValue: 5,
    isAuto: true,
  },
  {
    name: 'Notebook Champion',
    description: '10+ notebook pages created',
    icon: 'BookOpen',
    color: '#8b5cf6',
    category: 'achievement',
    requirementType: 'custom',
    requirementValue: 10,
    isAuto: true,
  },
  {
    name: 'Drawing Artist',
    description: '5+ drawings created',
    icon: 'Pencil',
    color: '#ec4899',
    category: 'achievement',
    requirementType: 'custom',
    requirementValue: 5,
    isAuto: true,
  },
  {
    name: 'Homework Hero',
    description: '10+ homework submissions on time',
    icon: 'ClipboardCheck',
    color: '#06b6d4',
    category: 'achievement',
    requirementType: 'custom',
    requirementValue: 10,
    isAuto: true,
  },
  {
    name: 'Team Player',
    description: '3+ peer assessments given',
    icon: 'Users',
    color: '#14b8a6',
    category: 'competency',
    requirementType: 'custom',
    requirementValue: 3,
    isAuto: true,
  },
  {
    name: 'Goal Achiever',
    description: '3+ learning goals completed',
    icon: 'Target',
    color: '#f97316',
    category: 'milestone',
    requirementType: 'custom',
    requirementValue: 3,
    isAuto: true,
  },
  {
    name: 'Eco Warrior',
    description: 'Environmental badge for using digital notebooks',
    icon: 'Leaf',
    color: '#22c55e',
    category: 'milestone',
    requirementType: 'custom',
    requirementValue: 1,
    isAuto: true,
  },
] as const;

/**
 * Seed default badges for a school if they don't exist yet
 */
export async function seedDefaultBadges(schoolId: string): Promise<void> {
  const existing = await db.badge.findMany({ where: { schoolId, deletedAt: null } });
  if (existing.length > 0) return; // Already seeded

  for (const badge of DEFAULT_BADGES) {
    await db.badge.create({
      data: {
        schoolId,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        category: badge.category,
        requirementType: badge.requirementType,
        requirementValue: badge.requirementValue,
        isAuto: badge.isAuto,
      },
    });
  }
}

/**
 * Check and auto-award badges for a student.
 * Returns the list of newly awarded badge IDs.
 */
export async function checkAndAwardBadges(
  schoolId: string,
  studentId: string
): Promise<string[]> {
  const awardedBadgeIds: string[] = [];

  // Get all auto-award badges for the school
  const autoBadges = await db.badge.findMany({
    where: { schoolId, isAuto: true, deletedAt: null },
  });

  // Get already earned badges for this student
  const earnedBadges = await db.studentBadge.findMany({
    where: { studentId, schoolId },
    select: { badgeId: true },
  });
  const earnedBadgeIdSet = new Set(earnedBadges.map(eb => eb.badgeId));

  for (const badge of autoBadges) {
    // Skip if already earned
    if (earnedBadgeIdSet.has(badge.id)) continue;

    const met = await checkBadgeRequirement(badge, schoolId, studentId);
    if (met) {
      await db.studentBadge.create({
        data: {
          schoolId,
          studentId,
          badgeId: badge.id,
          awardedBy: null, // Auto-awarded
        },
      });
      awardedBadgeIds.push(badge.id);
    }
  }

  return awardedBadgeIds;
}

/**
 * Check if a specific badge requirement is met for a student
 */
async function checkBadgeRequirement(
  badge: {
    id: string;
    requirementType: string;
    requirementValue: number | null;
  },
  schoolId: string,
  studentId: string
): Promise<boolean> {
  const threshold = badge.requirementValue ?? 0;
  if (threshold === 0) return false;

  switch (badge.requirementType) {
    case 'attendance_rate': {
      // Check if student has 30 consecutive days of attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - threshold);
      const attendanceRecords = await db.attendanceRecord.findMany({
        where: {
          studentId,
          student: { schoolId },
          status: 'PRESENT',
          session: { date: { gte: thirtyDaysAgo } },
        },
        include: { session: { select: { date: true } } },
      });
      return attendanceRecords.length >= threshold;
    }

    case 'mastery_level': {
      // Check if student has any competency at mastery level >= threshold
      const progressEntries = await db.learningProgressEntry.findMany({
        where: {
          studentId,
          student: { schoolId },
          masteryLevelValue: { gte: threshold },
        },
      });
      return progressEntries.length > 0;
    }

    case 'progress_entries': {
      // Check if student has threshold+ progress entries in the last month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const count = await db.learningProgressEntry.count({
        where: {
          studentId,
          student: { schoolId },
          date: { gte: oneMonthAgo },
        },
      });
      return count >= threshold;
    }

    case 'behavior_count': {
      // Check if student has threshold+ positive behavior entries
      const count = await db.behaviorIncident.count({
        where: {
          studentId,
          schoolId,
          category: { valence: 'positive' },
        },
      });
      return count >= threshold;
    }

    case 'custom': {
      // For custom badges, check based on badge name
      const badgeRecord = await db.badge.findUnique({ where: { id: badge.id } });
      if (!badgeRecord) return false;

      switch (badgeRecord.name) {
        case 'Notebook Champion': {
          const count = await db.notebookPage.count({
            where: {
              notebook: { schoolId, ownerId: studentId },
            },
          });
          return count >= threshold;
        }
        case 'Drawing Artist': {
          const count = await db.drawing.count({
            where: { schoolId, ownerId: studentId },
          });
          return count >= threshold;
        }
        case 'Homework Hero': {
          const count = await db.homeworkSubmission.count({
            where: {
              studentId,
              homework: { schoolId },
              status: 'SUBMITTED',
            },
          });
          return count >= threshold;
        }
        case 'Team Player': {
          const count = await db.peerAssessment.count({
            where: {
              assessorId: studentId,
              schoolId,
            },
          });
          return count >= threshold;
        }
        case 'Goal Achiever': {
          const count = await db.learningGoal.count({
            where: {
              studentId,
              schoolId,
              status: 'COMPLETED',
            },
          });
          return count >= threshold;
        }
        case 'Eco Warrior': {
          // Awarded if student has at least 1 notebook
          const count = await db.notebook.count({
            where: { schoolId, ownerId: studentId },
          });
          return count >= threshold;
        }
        default:
          return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Get badge progress for a student (how close they are to earning each badge)
 */
export async function getBadgeProgress(
  schoolId: string,
  studentId: string
): Promise<Array<{
  badgeId: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  earned: boolean;
  progress: number; // 0-100
  current: number;
  target: number;
}>> {
  const badges = await db.badge.findMany({
    where: { schoolId, deletedAt: null },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const earnedBadges = await db.studentBadge.findMany({
    where: { studentId, schoolId },
    select: { badgeId: true, awardedAt: true },
  });
  const earnedBadgeMap = new Map(earnedBadges.map(eb => [eb.badgeId, eb.awardedAt]));

  const results: Array<{
    badgeId: string;
    name: string;
    icon: string;
    color: string;
    category: string;
    earned: boolean;
    progress: number;
    current: number;
    target: number;
  }> = [];

  for (const badge of badges) {
    const earned = earnedBadgeMap.has(badge.id);
    const target = badge.requirementValue ?? 1;
    let current = 0;

    if (!earned) {
      current = await getCurrentProgress(badge, schoolId, studentId);
    } else {
      current = target;
    }

    results.push({
      badgeId: badge.id,
      name: badge.name,
      icon: badge.icon,
      color: badge.color,
      category: badge.category,
      earned,
      progress: Math.min(100, Math.round((current / target) * 100)),
      current,
      target,
    });
  }

  return results;
}

async function getCurrentProgress(
  badge: { id: string; requirementType: string; requirementValue: number | null; name: string },
  schoolId: string,
  studentId: string
): Promise<number> {
  const threshold = badge.requirementValue ?? 1;

  switch (badge.requirementType) {
    case 'attendance_rate': {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - threshold);
      return db.attendanceRecord.count({
        where: {
          studentId,
          student: { schoolId },
          status: 'PRESENT',
          session: { date: { gte: thirtyDaysAgo } },
        },
      });
    }
    case 'mastery_level': {
      const entries = await db.learningProgressEntry.findMany({
        where: { studentId, student: { schoolId } },
        orderBy: { masteryLevelValue: 'desc' },
        take: 1,
      });
      return entries.length > 0 ? entries[0].masteryLevelValue : 0;
    }
    case 'progress_entries': {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return db.learningProgressEntry.count({
        where: { studentId, student: { schoolId }, date: { gte: oneMonthAgo } },
      });
    }
    case 'behavior_count': {
      return db.behaviorIncident.count({
        where: { studentId, schoolId, category: { valence: 'positive' } },
      });
    }
    case 'custom': {
      switch (badge.name) {
        case 'Notebook Champion':
          return db.notebookPage.count({ where: { notebook: { schoolId, ownerId: studentId } } });
        case 'Drawing Artist':
          return db.drawing.count({ where: { schoolId, ownerId: studentId } });
        case 'Homework Hero':
          return db.homeworkSubmission.count({ where: { studentId, homework: { schoolId }, status: 'SUBMITTED' } });
        case 'Team Player':
          return db.peerAssessment.count({ where: { assessorId: studentId, schoolId } });
        case 'Goal Achiever':
          return db.learningGoal.count({ where: { studentId, schoolId, status: 'COMPLETED' } });
        case 'Eco Warrior':
          return db.notebook.count({ where: { schoolId, ownerId: studentId } });
        default:
          return 0;
      }
    }
    default:
      return 0;
  }
}
