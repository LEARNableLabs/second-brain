import Database from 'better-sqlite3';
import type { ExtractedContent } from '@second-brain/shared';

export interface ContentRow {
  id: number;
  url: string;
  date: string;
  title: string | null;
  body: string | null;
  content_type: string;
  word_count: number;
  error: string | null;
  extracted_at: number;
}

export function saveContent(
  db: Database.Database,
  url: string,
  date: string,
  content: ExtractedContent
): void {
  const stmt = db.prepare(`
    INSERT INTO content (url, date, title, body, content_type, word_count, extracted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url, date) DO UPDATE SET
      title = excluded.title,
      body = excluded.body,
      content_type = excluded.content_type,
      word_count = excluded.word_count,
      error = NULL,
      extracted_at = excluded.extracted_at
  `);
  stmt.run(url, date, content.title, content.body, content.contentType, content.wordCount, content.extractedAt);
}

export function saveContentError(
  db: Database.Database,
  url: string,
  date: string,
  error: string
): void {
  const stmt = db.prepare(`
    INSERT INTO content (url, date, content_type, error, word_count)
    VALUES (?, ?, 'general', ?, 0)
    ON CONFLICT(url, date) DO UPDATE SET
      title = NULL,
      body = NULL,
      error = excluded.error,
      extracted_at = (strftime('%s', 'now'))
  `);
  stmt.run(url, date, error);
}

export function getContentByDate(db: Database.Database, date: string): ContentRow[] {
  const stmt = db.prepare('SELECT * FROM content WHERE date = ? AND error IS NULL ORDER BY extracted_at ASC');
  return stmt.all(date) as ContentRow[];
}

export function deleteContentByDate(db: Database.Database, date: string): number {
  const stmt = db.prepare('DELETE FROM content WHERE date = ?');
  const result = stmt.run(date);
  return result.changes;
}
