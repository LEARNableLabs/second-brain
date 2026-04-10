import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function migrate(db: Database.Database): { applied: number; current: number } {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  const migrationDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let applied = 0;
  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    if (version > currentVersion) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
      db.exec(sql);
      applied++;
    }
  }

  const newVersion = db.pragma('user_version', { simple: true }) as number;
  return { applied, current: newVersion };
}

export function getSchemaVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number;
}
