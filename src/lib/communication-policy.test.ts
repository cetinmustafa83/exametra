import { describe, expect, test } from 'bun:test';
import {
  addBusinessDays,
  canCreateGroupRoom,
  canAccessRoom,
  canEscalateToAdmin,
  canMessageAdministrators,
} from './communication-policy';

describe('communication policy', () => {
  test('counts five business days without weekends', () => {
    const friday = new Date('2026-07-31T10:00:00Z');
    expect(addBusinessDays(friday, 5).toISOString().slice(0, 10)).toBe('2026-08-07');
  });

  test('only enables escalation after the deadline without a resolution', () => {
    const now = new Date('2026-08-10T10:00:00Z');
    expect(canEscalateToAdmin({ audienceType: 'direct', resolutionStatus: 'open', escalationEligibleAt: new Date('2026-08-07T10:00:00Z'), escalatedAt: null }, now)).toBeTrue();
    expect(canEscalateToAdmin({ audienceType: 'direct', resolutionStatus: 'resolved', escalationEligibleAt: new Date('2026-08-07T10:00:00Z'), escalatedAt: null }, now)).toBeFalse();
  });

  test('limits groups and direct administrator messaging to staff', () => {
    expect(canCreateGroupRoom('TEACHER')).toBeTrue();
    expect(canCreateGroupRoom('PARENT')).toBeFalse();
    expect(canMessageAdministrators('TEACHER')).toBeTrue();
    expect(canMessageAdministrators('STUDENT')).toBeFalse();
  });

  test('only exposes escalated student rooms to school administrators', () => {
    const room = { schoolId: 'school-1', studentId: 'student-1', teacherId: 'teacher-1', escalatedAt: null };
    expect(canAccessRoom('SCHOOL_ADMIN', room, 'admin-1', 'school-1')).toBeFalse();
    expect(canAccessRoom('TEACHER', room, 'teacher-1', 'school-1')).toBeTrue();
    expect(canAccessRoom('STUDENT', room, 'student-1', 'school-1')).toBeTrue();
  });
});
