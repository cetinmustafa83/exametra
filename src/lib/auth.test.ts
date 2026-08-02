import { describe, expect, test } from 'bun:test';
import bcrypt from 'bcryptjs';
import { hashPassword, needsPasswordRehash, verifyPassword } from './auth';

describe('password hashing', () => {
  test('creates and verifies Argon2id hashes', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash.startsWith('$argon2id$')).toBeTrue();
    expect(await verifyPassword('correct horse battery staple', hash)).toBeTrue();
    expect(await verifyPassword('incorrect password', hash)).toBeFalse();
    expect(needsPasswordRehash(hash)).toBeFalse();
  });

  test('verifies legacy bcrypt hashes for rehash-on-login migration', async () => {
    const legacyHash = await bcrypt.hash('legacy-password', 10);

    expect(await verifyPassword('legacy-password', legacyHash)).toBeTrue();
    expect(needsPasswordRehash(legacyHash)).toBeTrue();
  });
});
