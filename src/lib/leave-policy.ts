export type LeaveState =
  | 'awaiting_parent_approval'
  | 'awaiting_admin_approval'
  | 'approved'
  | 'rejected';

export function getLeaveState(report: {
  parentApprovalStatus: string;
  adminApprovalStatus: string;
}): LeaveState {
  if (report.parentApprovalStatus === 'rejected' || report.adminApprovalStatus === 'rejected') {
    return 'rejected';
  }
  if (report.parentApprovalStatus !== 'approved') return 'awaiting_parent_approval';
  if (report.adminApprovalStatus !== 'approved') return 'awaiting_admin_approval';
  return 'approved';
}

export function canParentApprove(role: string | undefined): boolean {
  return role === 'PARENT';
}

export function canAdminApprove(role: string | undefined): boolean {
  return role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export function canCreateCalendarEvent(report: {
  parentApprovalStatus: string;
  adminApprovalStatus: string;
  calendarEventId: string | null;
}): boolean {
  return report.parentApprovalStatus === 'approved'
    && report.adminApprovalStatus === 'approved'
    && !report.calendarEventId;
}
