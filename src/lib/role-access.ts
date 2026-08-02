import type { ViewName } from '@/lib/store';

export type AppRole = 'PARENT' | 'STUDENT' | 'TEACHER' | 'VICE_PRINCIPAL' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'DPO';

const parentViews: ViewName[] = [
  'dashboard', 'parent-portal', 'parents', 'grading', 'attendance', 'calendar',
  'communication', 'illness', 'report-cards', 'school-events', 'school-newsletter',
  'notification-center', 'announcements', 'settings',
];

const studentViews: ViewName[] = [
  'dashboard', 'student-portal', 'notebooks', 'flower', 'grading', 'grade-analytics',
  'homework', 'attendance', 'portfolio', 'calendar', 'competitions', 'subjects',
  'illness', 'communication', 'counseling', 'ai-tests', 'exam-calendar',
  'peer-assessment', 'report-cards', 'student-achievements', 'student-study-planner',
  'student-wellness', 'student-career', 'resources', 'school-library', 'school-events',
  'school-newsletter', 'school-transport', 'notification-center', 'announcements', 'settings',
];

const teacherViews: ViewName[] = [
  'dashboard', 'classes', 'competencies', 'progress', 'flower', 'assessments', 'grading',
  'reports', 'settings', 'student-detail', 'matrix', 'attendance', 'calendar', 'lesson-plans',
  'parents', 'behavior', 'coverage', 'rubrics', 'comments', 'notebooks', 'drawing', 'homework',
  'portfolio', 'timetable', 'resources', 'competitions', 'subjects', 'illness', 'communication',
  'counseling', 'ai-tests', 'notification-center', 'announcements', 'tablet-grading',
  'exam-calendar', 'peer-assessment', 'seating-chart', 'school-library', 'report-cards',
  'student-wellness', 'student-career', 'school-events', 'school-newsletter',
];

const vicePrincipalViews: ViewName[] = [
  ...teacherViews,
  'analytics', 'disciplinary', 'school-transport', 'substitute-teacher',
];

export function canAccessView(role: string | undefined, view: ViewName): boolean {
  if (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') return true;
  const allowed = role === 'PARENT' ? parentViews
    : role === 'STUDENT' ? studentViews
    : role === 'VICE_PRINCIPAL' ? vicePrincipalViews
    : role === 'DPO' ? ['dashboard', 'settings', 'reports']
    : teacherViews;
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
