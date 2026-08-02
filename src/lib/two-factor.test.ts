import { describe, expect, test } from 'bun:test';
import { createRecoveryCodes, createTotpSecret, hashRecoveryCode, totpUri, verifyTotp } from './two-factor';

describe('two factor authentication', () => {
  test('creates TOTP enrollment data', () => {
    const secret = createTotpSecret();
    expect(secret.length).toBeGreaterThan(10);
    expect(totpUri('teacher@school.example', secret)).toStartWith('otpauth://totp/');
  });

  test('creates unique hashed recovery codes', () => {
    const codes = createRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(hashRecoveryCode(codes[0])).not.toBe(codes[0]);
  });

  test('rejects malformed TOTP values', () => {
    expect(verifyTotp(createTotpSecret(), 'invalid')).toBeFalse();
  });
});
