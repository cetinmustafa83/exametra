export function canApproveTeacherLeave(role: string | undefined): boolean {
  return role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export function canViewTeacherPrivateNotes(role: string | undefined): boolean {
  return role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export function canCreateTeacherLeaveCalendarEvent(absence: {
  approvalStatus: string;
  calendarEventId: string | null;
}): boolean {
  return absence.approvalStatus === 'approved' && !absence.calendarEventId;
}
