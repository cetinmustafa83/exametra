import { describe, expect, test } from 'bun:test';
import { isCsrfProtectedRequest, isTrustedRequestOrigin } from './csrf';

describe('CSRF origin protection', () => {
  test('allows safe methods without origin headers', () => {
    const request = new Request('https://school.example/api/students');
    expect(isCsrfProtectedRequest(request)).toBeFalse();
    expect(isTrustedRequestOrigin(request)).toBeTrue();
  });

  test('allows mutations from the request origin', () => {
    const request = new Request('https://school.example/api/students', {
      method: 'POST',
      headers: { origin: 'https://school.example' },
    });
    expect(isCsrfProtectedRequest(request)).toBeTrue();
    expect(isTrustedRequestOrigin(request)).toBeTrue();
  });

  test('rejects cross-origin mutation requests', () => {
    const request = new Request('https://school.example/api/students', {
      method: 'DELETE',
      headers: { origin: 'https://attacker.example' },
    });
    expect(isTrustedRequestOrigin(request)).toBeFalse();
  });
});
