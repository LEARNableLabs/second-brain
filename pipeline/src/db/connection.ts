import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

function getDataDir(): string {
  const envDir = process.env.SECOND_BRAIN_DATA_DIR;
  if (envDir) {
    // Validate against path traversal: ensure it resolves to a directory under user's home or temp
    const resolved = path.resolve(envDir);
    const homeDir = os.homedir();
    const tmpDir = os.tmpdir();

    if (!resolved.startsWith(homeDir) && !resolved.startsWith(tmpDir)) {
      throw new Error(`Invalid SECOND_BRAIN_DATA_DIR: must be under home (${homeDir}) or temp (${tmpDir}), got ${resolved}`);
    }

    return resolved;
  }

  return path.join(os.homedir(), '.second-brain');
}

export function getDatabase(): Database.Database {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'data.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -8000');
  db.pragma('foreign_keys = ON');
  return db;
}

export function closeDatabase(db: Database.Database): void {
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
}

export function getDatabasePath(): string {
  return path.join(getDataDir(), 'data.db');
}
