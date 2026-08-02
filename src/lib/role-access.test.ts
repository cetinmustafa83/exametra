import { describe, expect, test } from 'bun:test';
import type { ViewName } from './store';
import {
  canAccessView,
  canManageStudent,
  canManageUser,
  filterSectionsForRole,
  filterViewsForRole,
  getFallbackView,
} from './role-access';

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
      { id: 'hidden', items: [{ key: 'districts' as ViewName }] },
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

  test('limits student and parent menus to self-service views', () => {
    expect(canAccessView('STUDENT', 'classes')).toBeFalse();
    expect(canAccessView('STUDENT', 'student-portal')).toBeTrue();
    expect(canAccessView('PARENT', 'parents')).toBeFalse();
    expect(canAccessView('PARENT', 'parent-portal')).toBeTrue();
  });

  test('does not grant vice principals administrator account control', () => {
    expect(canManageUser('VICE_PRINCIPAL', 'TEACHER')).toBeFalse();
    expect(canManageUser('SCHOOL_ADMIN', 'SCHOOL_ADMIN', true)).toBeFalse();
    expect(canManageUser('SCHOOL_ADMIN', 'SUPER_ADMIN')).toBeFalse();
    expect(canManageUser('SUPER_ADMIN', 'SCHOOL_ADMIN')).toBeTrue();
  });

  test('allows student record mutation only to administrators and teachers', () => {
    expect(canManageStudent('SCHOOL_ADMIN')).toBeTrue();
    expect(canManageStudent('TEACHER')).toBeTrue();
    expect(canManageStudent('VICE_PRINCIPAL')).toBeFalse();
    expect(canManageStudent('PARENT')).toBeFalse();
  });
});
