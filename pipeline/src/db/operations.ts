import Database from 'better-sqlite3';
import type { CaptureEntry, ProcessingStatus } from '@second-brain/shared';

export interface CaptureRow {
  id: number;
  url: string;
  title: string;
  domain: string;
  timestamp: number;
  date: string;
  source: 'live' | 'backfill' | 'manual';
  status: ProcessingStatus;
  created_at: number;
}

export function saveCaptures(db: Database.Database, entries: CaptureEntry[]): { inserted: number; skipped: number } {
  const insert = db.prepare(`
    INSERT INTO captures (url, title, domain, timestamp, date, source, status)
    VALUES (@url, @title, @domain, @timestamp, @date, @source, 'captured')
    ON CONFLICT(url, date) DO NOTHING
  `);

  const insertMany = db.transaction((entries: CaptureEntry[]) => {
    let inserted = 0;
    for (const entry of entries) {
      const result = insert.run({
        url: entry.url,
        title: entry.title,
        domain: entry.domain,
        timestamp: entry.timestamp,
        date: timestampToDate(entry.timestamp),
        source: entry.source,
      });
      if (result.changes > 0) inserted++;
    }
    return inserted;
  });

  const inserted = insertMany(entries);
  return { inserted, skipped: entries.length - inserted };
}

export function updateStatus(db: Database.Database, url: string, date: string, newStatus: ProcessingStatus): boolean {
  const stmt = db.prepare('UPDATE captures SET status = ? WHERE url = ? AND date = ?');
  const result = stmt.run(newStatus, url, date);
  return result.changes > 0;
}

export function getByStatus(db: Database.Database, status: ProcessingStatus): CaptureRow[] {
  const stmt = db.prepare('SELECT * FROM captures WHERE status = ? ORDER BY timestamp ASC');
  return stmt.all(status) as CaptureRow[];
}

export function getByDate(db: Database.Database, date: string): CaptureRow[] {
  const stmt = db.prepare('SELECT * FROM captures WHERE date = ? ORDER BY timestamp ASC');
  return stmt.all(date) as CaptureRow[];
}

export function getCaptureStats(db: Database.Database): { total: number; byStatus: Record<string, number>; bySource: Record<string, number> } {
  const total = (db.prepare('SELECT COUNT(*) as count FROM captures').get() as { count: number }).count;
  const statusRows = db.prepare('SELECT status, COUNT(*) as count FROM captures GROUP BY status').all() as { status: string; count: number }[];
  const sourceRows = db.prepare('SELECT source, COUNT(*) as count FROM captures GROUP BY source').all() as { source: string; count: number }[];
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const row of statusRows) byStatus[row.status] = row.count;
  for (const row of sourceRows) bySource[row.source] = row.count;
  return { total, byStatus, bySource };
}

function timestampToDate(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
