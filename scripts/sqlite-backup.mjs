import { access, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith('file:')) {
  throw new Error('DATABASE_URL must use a SQLite file: URL');
}

const source = path.resolve(databaseUrl.slice('file:'.length));
const backupDirectory = path.resolve(process.env.BACKUP_PATH || path.join(process.cwd(), 'data', 'backups'));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = path.join(backupDirectory, `schulos-sqlite-${timestamp}.db`);

await access(source);
await mkdir(backupDirectory, { recursive: true });

const result = spawnSync('sqlite3', [source, `.backup '${destination.replaceAll("'", "''")}'`], {
  encoding: 'utf8',
});

if (result.error || result.status !== 0) {
  throw result.error ?? new Error(result.stderr || 'SQLite online backup failed');
}

const integrity = spawnSync('sqlite3', [destination, 'PRAGMA integrity_check;'], { encoding: 'utf8' });
if (integrity.error || integrity.status !== 0 || integrity.stdout.trim() !== 'ok') {
  throw integrity.error ?? new Error(`Backup integrity check failed: ${integrity.stdout || integrity.stderr}`);
}

const backupStat = await stat(destination);
console.log(JSON.stringify({ backup: destination, bytes: backupStat.size, integrity: 'ok' }));
