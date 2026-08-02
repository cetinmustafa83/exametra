import type { ViewName } from '@/lib/store';

export type AppRole = 'PARENT' | 'STUDENT' | 'TEACHER' | 'VICE_PRINCIPAL' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'DPO';

export const ADMIN_ROLES: readonly AppRole[] = ['SCHOOL_ADMIN', 'SUPER_ADMIN'];
export const USER_MANAGER_ROLES: readonly AppRole[] = ['SCHOOL_ADMIN', 'SUPER_ADMIN'];
export const STUDENT_MANAGER_ROLES: readonly AppRole[] = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'];

const parentViews: ViewName[] = [
  'dashboard', 'parent-portal', 'calendar', 'communication', 'illness',
  'notification-center', 'announcements',
];

const studentViews: ViewName[] = [
  'dashboard', 'student-portal', 'calendar', 'communication', 'illness',
  'notification-center',
];

const teacherViews: ViewName[] = [
  'dashboard', 'classes', 'competencies', 'progress', 'flower', 'assessments', 'grading',
  'reports', 'student-detail', 'matrix', 'attendance', 'calendar', 'lesson-plans',
  'behavior', 'coverage', 'rubrics', 'comments', 'homework', 'timetable', 'resources',
  'illness', 'communication', 'notification-center', 'tablet-grading', 'exam-calendar',
  'seating-chart', 'report-cards',
];

const vicePrincipalViews: ViewName[] = [
  ...teacherViews,
  'analytics', 'disciplinary', 'school-transport', 'substitute-teacher',
];

export function hasRoleAccess(role: string | undefined, allowedRoles: readonly AppRole[]): boolean {
  return role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || (role !== undefined && allowedRoles.includes(role as AppRole));
}

export function isAdministrator(role: string | undefined): boolean {
  return role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
}

export function canManageUser(actorRole: string | undefined, targetRole: string, isSelf = false): boolean {
  if (!isAdministrator(actorRole)) return false;
  if (isSelf) return false;
  if (actorRole === 'SCHOOL_ADMIN' && targetRole === 'SUPER_ADMIN') return false;
  return true;
}

export function canManageStudent(actorRole: string | undefined): boolean {
  return STUDENT_MANAGER_ROLES.includes(actorRole as AppRole);
}

export function canAccessView(role: string | undefined, view: ViewName): boolean {
  if (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') return true;
  const allowed = role === 'PARENT' ? parentViews
    : role === 'STUDENT' ? studentViews
    : role === 'TEACHER' ? teacherViews
    : role === 'VICE_PRINCIPAL' ? vicePrincipalViews
    : role === 'DPO' ? ['dashboard', 'settings', 'reports']
    : [];
  return allowed.includes(view);
}

export function filterViewsForRole<T extends { key: ViewName }>(role: string | undefined, items: T[]): T[] {
  return items.filter((item) => canAccessView(role, item.key));
}

export function filterSectionsForRole<T extends { items: { key: ViewName }[] }>(role: string | undefined, sections: T[]): T[] {
  return sections
    .map((section) => ({ ...section, items: filterViewsForRole(role, section.items) }))
    .filter((section) => section.items.length > 0) as T[];
}

export function getFallbackView(role: string | undefined): ViewName {
  return role === 'PARENT' || role === 'STUDENT' || role === 'TEACHER' || role === 'VICE_PRINCIPAL' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'DPO'
    ? 'dashboard'
    : 'dashboard';
}
