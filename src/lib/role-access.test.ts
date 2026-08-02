import { describe, expect, test } from 'bun:test';
import type { ViewName } from './store';
import { canAccessView, filterSectionsForRole, filterViewsForRole, getFallbackView } from './role-access';

const mixedItems = [
  { key: 'dashboard' as const },
  { key: 'parent-portal' as ViewName },
  { key: 'classes' as const },
];

describe('role access', () => {
  test('hides teacher-inaccessible views from a mixed menu', () => {
    expect(filterViewsForRole('TEACHER', mixedItems).map(({ key }) => key)).toEqual(['dashboard', 'classes']);
  });

  test('removes empty sections for parent, student, and teacher', () => {
    const sections = [
      { id: 'visible', items: [{ key: 'dashboard' as const }] },
      { id: 'hidden', items: [{ key: 'student-detail' as ViewName }] },
    ];

    for (const role of ['PARENT', 'STUDENT', 'TEACHER'] as const) {
      expect(filterSectionsForRole(role, sections).map(({ id }) => id)).toEqual(['visible']);
    }
  });

  test('falls back to dashboard for an inaccessible active view', () => {
    expect(canAccessView('PARENT', 'student-detail')).toBeFalse();
    expect(getFallbackView('PARENT')).toBe('dashboard');
  });

  test('keeps every view available to administrators', () => {
    for (const view of mixedItems.map(({ key }) => key)) {
      expect(canAccessView('SCHOOL_ADMIN', view)).toBeTrue();
      expect(canAccessView('SUPER_ADMIN', view)).toBeTrue();
    }
  });
});
