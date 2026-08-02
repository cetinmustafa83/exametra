import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith('file:')) {
  throw new Error('DATABASE_URL must use a SQLite file: URL');
}

const databasePath = path.resolve(databaseUrl.slice('file:'.length));
await mkdir(path.dirname(databasePath), { recursive: true });

const result = spawnSync('sqlite3', [databasePath, 'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; PRAGMA wal_checkpoint(TRUNCATE);'], {
  encoding: 'utf8',
});

if (result.error || result.status !== 0) {
  throw result.error ?? new Error(result.stderr || 'Unable to configure SQLite WAL mode');
}

await access(databasePath);
console.log(`SQLite WAL configured: ${databasePath}`);
