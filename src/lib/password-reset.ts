import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60;

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashResetToken(token) };
}

export function passwordResetExpiry(now = new Date()): Date {
  const configuredTtl = Number.parseInt(process.env.PASSWORD_RESET_TTL_SECONDS ?? '', 10);
  const ttl = Number.isFinite(configuredTtl) && configuredTtl >= 300
    ? configuredTtl
    : DEFAULT_TOKEN_TTL_SECONDS;
  return new Date(now.getTime() + ttl * 1000);
}
