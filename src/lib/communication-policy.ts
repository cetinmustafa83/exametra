import type { AppRole } from '@/lib/role-access';

const ADMIN_ROLES: readonly AppRole[] = ['SCHOOL_ADMIN', 'SUPER_ADMIN'];

export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }

  return result;
}

export function escalationEligibleAt(createdAt: Date): Date {
  return addBusinessDays(createdAt, 5);
}

export function canEscalateToAdmin(room: {
  audienceType: string;
  resolutionStatus: string;
  escalationEligibleAt: Date | null;
  escalatedAt: Date | null;
}, now = new Date()): boolean {
  return room.audienceType === 'direct'
    && room.resolutionStatus !== 'resolved'
    && !room.escalatedAt
    && Boolean(room.escalationEligibleAt && room.escalationEligibleAt <= now);
}

export function canCreateDirectRoom(role: string | undefined): boolean {
  return role === 'STUDENT' || role === 'PARENT' || role === 'TEACHER';
}

export function canCreateGroupRoom(role: string | undefined): boolean {
  return role === 'TEACHER' || ADMIN_ROLES.includes(role as AppRole);
}

export function canMessageAdministrators(role: string | undefined): boolean {
  return role === 'TEACHER' || ADMIN_ROLES.includes(role as AppRole);
}

export function canAccessRoom(
  role: string | undefined,
  room: { schoolId: string; studentId: string; teacherId: string; escalatedAt: Date | null },
  userId: string,
  userSchoolId: string | null
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  if (role === 'SCHOOL_ADMIN') return room.schoolId === userSchoolId && Boolean(room.escalatedAt);
  if (role === 'VICE_PRINCIPAL') return room.schoolId === userSchoolId && room.teacherId === userId;
  return room.studentId === userId || room.teacherId === userId;
}
