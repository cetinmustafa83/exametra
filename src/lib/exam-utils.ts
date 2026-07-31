import { ExamSession, ExamEvent } from '@prisma/client';

export interface ExamMonitoringConfig {
  lockdownMode: boolean;
  cameraEnabled: boolean;
  keyloggerDetection: boolean;
  tabSwitchWarning: boolean;
  copyPasteBlock: boolean;
  timeWarnings: number[]; // minutes before end
}

export const DEFAULT_EXAM_CONFIG: ExamMonitoringConfig = {
  lockdownMode: true,
  cameraEnabled: false,
  keyloggerDetection: false,
  tabSwitchWarning: true,
  copyPasteBlock: true,
  timeWarnings: [15, 5, 1], // warn at 15, 5, 1 minute remaining
};

export function getExamTimeRemaining(startTime: Date, durationMinutes: number): number {
  const now = new Date();
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  const remainingMs = endTime.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remainingMs / 60000)); // return minutes
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes < 0) return 'Time expired';
  if (minutes === 0) return 'Less than 1 minute';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function shouldShowTimeWarning(
  minutesRemaining: number,
  warnings: number[]
): boolean {
  return warnings.some(
    (warningThreshold) =>
      minutesRemaining === warningThreshold ||
      (minutesRemaining < warningThreshold && minutesRemaining === Math.ceil(minutesRemaining))
  );
}

export function detectSuspiciousActivity(event: ExamEvent): boolean {
  const suspiciousTypes = [
    'tab_switch',
    'copy_paste',
    'window_blur',
    'camera_detected_none',
    'suspicious_movement',
  ];
  return suspiciousTypes.includes(event.eventType) && event.severity !== 'info';
}

export function generateExamToken(examSessionId: string, studentId: string): string {
  const timestamp = Date.now();
  const hash = btoa(`${examSessionId}:${studentId}:${timestamp}`);
  return `exam_${hash}`;
}

export function validateExamToken(token: string, examSessionId: string, studentId: string): boolean {
  if (!token.startsWith('exam_')) return false;
  try {
    const expected = `exam_${btoa(`${examSessionId}:${studentId}`)}`;
    return token.includes(btoa(`${examSessionId}:${studentId}`));
  } catch {
    return false;
  }
}

export function isExamActiveForStudent(exam: ExamSession): boolean {
  if (exam.status !== 'in_progress') return false;
  const now = new Date();
  return exam.startTime <= now && (!exam.endTime || now <= exam.endTime);
}

export function getExamProgressPercentage(
  totalQuestions: number,
  answeredQuestions: number
): number {
  return Math.round((answeredQuestions / totalQuestions) * 100);
}

export interface ExamSecurityMetrics {
  suspiciousEvents: number;
  tabSwitches: number;
  copyCounts: number;
  focusLosses: number;
  riskScore: number; // 0-100
}

export function calculateSecurityMetrics(events: ExamEvent[]): ExamSecurityMetrics {
  const metrics: ExamSecurityMetrics = {
    suspiciousEvents: 0,
    tabSwitches: 0,
    copyCounts: 0,
    focusLosses: 0,
    riskScore: 0,
  };

  events.forEach((event) => {
    if (event.severity !== 'info') metrics.suspiciousEvents++;
    if (event.eventType === 'tab_switch') metrics.tabSwitches++;
    if (event.eventType === 'copy_paste') metrics.copyCounts++;
    if (event.eventType === 'window_blur') metrics.focusLosses++;
  });

  metrics.riskScore = Math.min(
    100,
    metrics.tabSwitches * 5 + metrics.copyCounts * 10 + metrics.focusLosses * 3
  );

  return metrics;
}
