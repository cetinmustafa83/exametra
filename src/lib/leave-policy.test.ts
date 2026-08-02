import { describe, expect, test } from 'bun:test';
import { canAdminApprove, canCreateCalendarEvent, getLeaveState } from './leave-policy';

describe('leave policy', () => {
  test('requires parent then administrator approval', () => {
    expect(getLeaveState({ parentApprovalStatus: 'pending', adminApprovalStatus: 'pending' })).toBe('awaiting_parent_approval');
    expect(getLeaveState({ parentApprovalStatus: 'approved', adminApprovalStatus: 'pending' })).toBe('awaiting_admin_approval');
    expect(getLeaveState({ parentApprovalStatus: 'approved', adminApprovalStatus: 'approved' })).toBe('approved');
  });

  test('only administrators can give the final approval', () => {
    expect(canAdminApprove('SCHOOL_ADMIN')).toBeTrue();
    expect(canAdminApprove('VICE_PRINCIPAL')).toBeFalse();
  });

  test('creates one calendar event after full approval', () => {
    expect(canCreateCalendarEvent({ parentApprovalStatus: 'approved', adminApprovalStatus: 'approved', calendarEventId: null })).toBeTrue();
    expect(canCreateCalendarEvent({ parentApprovalStatus: 'approved', adminApprovalStatus: 'pending', calendarEventId: null })).toBeFalse();
  });
});
