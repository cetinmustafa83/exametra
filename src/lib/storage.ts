import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

export type StorageArea = 'uploads' | 'exports' | 'backups';

const DEFAULT_STORAGE_ROOT = path.join(process.cwd(), 'data');

function getAreaRoot(area: StorageArea): string {
  const configured = area === 'uploads'
    ? process.env.STORAGE_PATH
    : area === 'exports'
      ? process.env.EXPORT_PATH
      : process.env.BACKUP_PATH;

  return path.resolve(configured || path.join(DEFAULT_STORAGE_ROOT, area));
}

function getSafePath(area: StorageArea, relativePath: string): string {
  const root = getAreaRoot(area);
  const target = path.resolve(root, relativePath);

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('Storage path must remain within its configured area');
  }

  return target;
}

export function storagePath(area: StorageArea, relativePath: string): string {
  return getSafePath(area, relativePath);
}

export async function writeStorageFile(
  area: StorageArea,
  relativePath: string,
  content: string | Buffer
): Promise<string> {
  const target = getSafePath(area, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, { mode: 0o600 });
  return target;
}

export async function readStorageFile(area: StorageArea, relativePath: string): Promise<Buffer> {
  return readFile(getSafePath(area, relativePath));
}

export async function deleteStorageFile(area: StorageArea, relativePath: string): Promise<void> {
  await rm(getSafePath(area, relativePath), { force: true });
}
