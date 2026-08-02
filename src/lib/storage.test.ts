import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deleteStorageFile, readStorageFile, storagePath, writeStorageFile } from './storage';

const originalBackupPath = process.env.BACKUP_PATH;
const tempDirectories: string[] = [];

afterEach(async () => {
  process.env.BACKUP_PATH = originalBackupPath;
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('local storage', () => {
  test('writes, reads, and deletes files inside the configured storage area', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'schulos-storage-'));
    tempDirectories.push(directory);
    process.env.BACKUP_PATH = directory;

    await writeStorageFile('backups', 'school-1/backup.json', '{"version":1}');

    expect((await readStorageFile('backups', 'school-1/backup.json')).toString()).toBe('{"version":1}');
    await deleteStorageFile('backups', 'school-1/backup.json');
    expect(storagePath('backups', 'school-1/backup.json')).toContain(directory);
  });

  test('rejects path traversal outside storage root', () => {
    expect(() => storagePath('backups', '../../outside.json')).toThrow('Storage path must remain within its configured area');
  });
});
