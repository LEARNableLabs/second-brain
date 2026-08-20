import Database from 'better-sqlite3';

export interface CaptureSearchResult {
  id: number;
  url: string;
  title: string;
  domain: string;
  date: string;
  source: 'live' | 'backfill' | 'manual';
  rank: number;
  snippet: string;
}

export interface SearchOptions {
  from?: string;
  to?: string;
  domain?: string;
  limit?: number;
}

export function searchCaptures(
  db: Database.Database,
  query: string,
  options: SearchOptions = {}
): CaptureSearchResult[] {
  const limit = options.limit ?? 20;

  const buildQuery = (ftsQuery: string) => {
    const conditions = ['captures_fts MATCH ?'];
    const params: (string | number)[] = [ftsQuery];

    if (options.from) {
      conditions.push('c.date >= ?');
      params.push(options.from);
    }
    if (options.to) {
      conditions.push('c.date <= ?');
      params.push(options.to);
    }
    if (options.domain) {
      conditions.push('c.domain = ?');
      params.push(options.domain);
    }

    params.push(limit);

    const sql = `
      SELECT c.id, c.url, c.title, c.domain, c.date, c.source,
             rank,
             snippet(captures_fts, 0, '>>>', '<<<', '...', 32) as snippet
      FROM captures_fts
      JOIN captures c ON c.id = captures_fts.rowid
      WHERE ${conditions.join(' AND ')}
      ORDER BY rank
      LIMIT ?
    `;

    return { sql, params };
  };

  try {
    const { sql, params } = buildQuery(query);
    return db.prepare(sql).all(...params) as CaptureSearchResult[];
  } catch {
    const safeQuery = '"' + query.replace(/"/g, '""') + '"';
    try {
      const { sql, params } = buildQuery(safeQuery);
      return db.prepare(sql).all(...params) as CaptureSearchResult[];
    } catch {
      return [];
    }
  }
}
