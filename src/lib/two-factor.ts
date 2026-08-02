import { createHash, randomBytes } from 'node:crypto';
import { TOTP } from 'otpauth';

const RECOVERY_CODE_COUNT = 10;

export function createTotpSecret(): string {
  return new TOTP({ issuer: 'SchoolOS', label: 'SchoolOS account' }).secret.base32;
}

export function totpUri(email: string, secret: string): string {
  return new TOTP({ issuer: 'SchoolOS', label: email, secret }).toString();
}

export function verifyTotp(secret: string, token: string): boolean {
  const normalizedToken = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalizedToken)) return false;
  return new TOTP({ issuer: 'SchoolOS', label: 'SchoolOS account', secret }).validate({ token: normalizedToken, window: 1 }) !== null;
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function createRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => randomBytes(5).toString('hex').toUpperCase());
}
