import { describe, expect, test } from 'bun:test';
import { canApproveTeacherLeave, canCreateTeacherLeaveCalendarEvent, canViewTeacherPrivateNotes } from './teacher-leave-policy';

describe('teacher leave policy', () => {
  test('keeps final approval and private notes with administrators', () => {
    expect(canApproveTeacherLeave('SCHOOL_ADMIN')).toBeTrue();
    expect(canApproveTeacherLeave('VICE_PRINCIPAL')).toBeFalse();
    expect(canViewTeacherPrivateNotes('TEACHER')).toBeFalse();
  });

  test('creates one calendar event after approval', () => {
    expect(canCreateTeacherLeaveCalendarEvent({ approvalStatus: 'approved', calendarEventId: null })).toBeTrue();
    expect(canCreateTeacherLeaveCalendarEvent({ approvalStatus: 'pending', calendarEventId: null })).toBeFalse();
  });
});
