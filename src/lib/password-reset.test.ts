import { describe, expect, test } from 'bun:test';
import { createPasswordResetToken, hashResetToken, passwordResetExpiry } from './password-reset';

describe('password reset tokens', () => {
  test('creates opaque tokens and stable SHA-256 lookup hashes', () => {
    const { token, tokenHash } = createPasswordResetToken();
    expect(token.length).toBeGreaterThan(30);
    expect(tokenHash).toBe(hashResetToken(token));
    expect(tokenHash).not.toBe(token);
  });

  test('uses a one-hour default expiry', () => {
    const now = new Date('2026-08-02T10:00:00.000Z');
    expect(passwordResetExpiry(now).toISOString()).toBe('2026-08-02T11:00:00.000Z');
  });
});
