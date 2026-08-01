/**
 * Escalation Policy Engine
 * Handles business-day calculations, escalation eligibility, and workflow management
 * Module C: Communication & Escalation
 */

import {
  addDays,
  isWeekend,
  differenceInCalendarDays,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  parseISO,
} from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

export interface SchoolDayConfig {
  timezone: string;
  publicHolidays: Date[]; // German public holidays for the year
  schoolHolidays: { start: Date; end: Date }[]; // Specific school holidays
  schoolDayStartTime: string; // "08:00"
  schoolDayEndTime: string; // "16:00"
  businessDaysPerWeek: number; // Usually 5
}

export interface EscalationPolicyRule {
  triggerType: string; // BEHAVIOR_INCIDENT, GRADE_CONCERN, ATTENDANCE, WELLNESS
  severity: string; // MINOR, MODERATE, MAJOR
  businessDaysUntilEscalation: number;
  escalationChain: {
    stepNumber: number;
    recipientRole: string; // TEACHER, CLASS_LEADER, VICE_PRINCIPAL, PRINCIPAL, COUNSELOR
    requiresConfirmation: boolean;
    autoNotify: boolean;
  }[];
}

/**
 * Calculate business days (excluding weekends, public holidays, school holidays)
 */
export function getNextBusinessDay(
  fromDate: Date,
  config: SchoolDayConfig,
  daysToAdd: number = 1
): Date {
  let currentDate = new Date(fromDate);
  let businessDaysAdded = 0;

  while (businessDaysAdded < daysToAdd) {
    currentDate = addDays(currentDate, 1);

    // Skip weekends
    if (isWeekend(currentDate, { locale: deLocale })) {
      continue;
    }

    // Skip public holidays (German holidays)
    if (isGermanPublicHoliday(currentDate)) {
      continue;
    }

    // Skip school holidays
    if (isSchoolHoliday(currentDate, config)) {
      continue;
    }

    businessDaysAdded++;
  }

  // Set to end of school day (e.g., 16:00)
  const [hours, minutes] = config.schoolDayEndTime.split(':').map(Number);
  return setMinutes(setHours(currentDate, hours), minutes);
}

/**
 * Calculate business days between two dates
 */
export function calculateBusinessDaysBetween(
  startDate: Date,
  endDate: Date,
  config: SchoolDayConfig
): number {
  let businessDays = 0;
  let currentDate = new Date(startDate);

  while (isBefore(currentDate, endDate)) {
    // Skip weekends
    if (!isWeekend(currentDate, { locale: deLocale })) {
      // Skip public holidays
      if (!isGermanPublicHoliday(currentDate)) {
        // Skip school holidays
        if (!isSchoolHoliday(currentDate, config)) {
          businessDays++;
        }
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return businessDays;
}

/**
 * Check if a date is a German public holiday
 */
function isGermanPublicHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  // German public holidays (simplified, doesn't account for Easter-dependent dates)
  const publicHolidays = [
    { month: 1, day: 1 }, // Neujahrstag
    { month: 3, day: 8 }, // Internationaler Frauentag (varies by state)
    { month: 5, day: 1 }, // Tag der Arbeit
    { month: 5, day: 9 }, // Europatag (varies)
    { month: 10, day: 3 }, // Tag der Deutschen Einheit
    { month: 10, day: 31 }, // Reformationstag (varies by state)
    { month: 11, day: 1 }, // Allerheiligen (varies by state)
    { month: 12, day: 25 }, // Weihnachtstag
    { month: 12, day: 26 }, // Zweiter Weihnachtstag
  ];

  return publicHolidays.some((h) => h.month === month && h.day === day);
}

/**
 * Check if a date falls within school holidays
 */
function isSchoolHoliday(date: Date, config: SchoolDayConfig): boolean {
  return config.schoolHolidays.some((holiday) => {
    return isBefore(date, holiday.end) && isAfter(date, holiday.start);
  });
}

/**
 * Determine if an escalation can be initiated
 */
export function canInitiateEscalation(
  escalationCreatedAt: Date,
  eligibleAtDateTime: Date
): boolean {
  return isBefore(new Date(), eligibleAtDateTime);
}

/**
 * Check if user has permission to escalate at current step
 */
export function canEscalateToNextStep(
  currentStep: number,
  totalSteps: number,
  userRole: string,
  escalationPolicy: { escalationSteps: { recipientRole: string }[] }
): boolean {
  if (currentStep >= totalSteps) {
    return false; // Already at final step
  }

  const nextStep = escalationPolicy.escalationSteps[currentStep];
  return userRole === nextStep.recipientRole || userRole === 'SCHOOL_ADMIN';
}

/**
 * Format escalation eligibility message
 */
export function formatEscalationEligibility(
  eligibleAtDateTime: Date,
  now: Date = new Date(),
  locale: 'de' | 'en' = 'de'
): string {
  const businessDaysRemaining = calculateBusinessDaysBetween(now, eligibleAtDateTime, {
    timezone: 'Europe/Berlin',
    publicHolidays: [],
    schoolHolidays: [],
    schoolDayStartTime: '08:00',
    schoolDayEndTime: '16:00',
    businessDaysPerWeek: 5,
  });

  if (locale === 'de') {
    if (businessDaysRemaining <= 0) {
      return 'Sie können jetzt eskalieren.';
    }
    return `Sie können in ${businessDaysRemaining} Geschäftstag(en) eskalieren.`;
  } else {
    if (businessDaysRemaining <= 0) {
      return 'You can escalate now.';
    }
    return `You can escalate in ${businessDaysRemaining} business day(s).`;
  }
}

/**
 * Get escalation severity level
 */
export function getEscalationSeverity(
  triggerType: string,
  incident?: { severity?: string }
): string {
  if (incident?.severity) {
    return incident.severity; // MINOR, MODERATE, MAJOR
  }

  // Default severity based on trigger type
  const severityMap: Record<string, string> = {
    BEHAVIOR_INCIDENT: 'MODERATE',
    GRADE_CONCERN: 'MINOR',
    ATTENDANCE: 'MODERATE',
    WELLNESS: 'MAJOR',
    CUSTOM: 'MINOR',
  };

  return severityMap[triggerType] || 'MINOR';
}

/**
 * Validate escalation request
 */
export function validateEscalationRequest(
  initiatorRole: string,
  escalationPolicy: any,
  currentStep: number
): { valid: boolean; error?: string } {
  // Students can only initiate escalations if policy allows
  if (initiatorRole === 'STUDENT' && !escalationPolicy.allowStudentInitiation) {
    return {
      valid: false,
      error: 'Students cannot initiate escalations for this policy.',
    };
  }

  // Parents can only escalate after specific step
  if (initiatorRole === 'PARENT' && currentStep < (escalationPolicy.parentCanEscalateAtStep || 1)) {
    return {
      valid: false,
      error: 'Parents cannot escalate at this stage.',
    };
  }

  return { valid: true };
}

/**
 * Get next recipient in escalation chain
 */
export function getNextRecipientRole(
  escalationPolicy: any,
  currentStep: number
): string | null {
  const nextStep = escalationPolicy.escalationSteps[currentStep];
  return nextStep?.recipientRole || null;
}

/**
 * Create audit trail entry for escalation action
 */
export function createEscalationAuditEntry(
  escalationId: string,
  actionType: string,
  performedByUserId: string | null,
  actionReason: string,
  confidentialNote?: string
) {
  return {
    escalationId,
    actionType, // INITIATED, NOTIFIED, CONFIRMED, ESCALATED_TO_NEXT_STEP, RESOLVED
    performedByUserId,
    actionReason,
    confidentialNote,
    createdAt: new Date(),
  };
}

export default {
  getNextBusinessDay,
  calculateBusinessDaysBetween,
  canInitiateEscalation,
  canEscalateToNextStep,
  formatEscalationEligibility,
  getEscalationSeverity,
  validateEscalationRequest,
  getNextRecipientRole,
  createEscalationAuditEntry,
};
