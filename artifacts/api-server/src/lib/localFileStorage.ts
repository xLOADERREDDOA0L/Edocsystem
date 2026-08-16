import { createReadStream, existsSync } from 'fs';
import { mkdir, stat, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Local-disk file storage used when the app runs outside Replit
 * (e.g. on a developer machine in VS Code).
 *
 * Files are stored under LOCAL_STORAGE_DIR (default: <api-server>/.data/uploads)
 * keyed by the same UUID used in the public "/objects/uploads/<id>" path,
 * so database records remain identical between cloud and local modes.
 */

/** True when running outside Replit — use local disk instead of App Storage. */
export function isLocalStorageMode(): boolean {
  return !process.env.REPL_ID;
}

export function getLocalStorageDir(): string {
  return (
    process.env.LOCAL_STORAGE_DIR ??
    path.join(process.cwd(), '.data', 'uploads')
  );
}

const SAFE_ID = /^[A-Za-z0-9-]+$/;

function resolveSafePath(objectId: string): string {
  if (!SAFE_ID.test(objectId)) {
    throw new Error('Invalid object id');
  }
  return path.join(getLocalStorageDir(), objectId);
}

/**
 * Write the object exactly once. Uses the exclusive `wx` flag so a
 * concurrent duplicate PUT fails atomically with EEXIST.
 * @throws error with code "EEXIST" if the object was already written.
 */
export async function saveLocalObject(
  objectId: string,
  data: Buffer,
): Promise<void> {
  const dir = getLocalStorageDir();
  await mkdir(dir, { recursive: true });
  await writeFile(resolveSafePath(objectId), data, { flag: 'wx' });
}

export function localObjectExists(objectId: string): boolean {
  try {
    return existsSync(resolveSafePath(objectId));
  } catch {
    return false;
  }
}

export async function getLocalObjectStream(objectId: string): Promise<{
  stream: NodeJS.ReadableStream;
  size: number;
}> {
  const filePath = resolveSafePath(objectId);
  const info = await stat(filePath);
  return { stream: createReadStream(filePath), size: info.size };
}
