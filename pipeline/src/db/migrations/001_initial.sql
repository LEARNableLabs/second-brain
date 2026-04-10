CREATE TABLE IF NOT EXISTS captures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('live', 'backfill', 'manual')),
  status TEXT NOT NULL DEFAULT 'captured' CHECK(status IN ('captured', 'content_fetched', 'curated', 'written')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(url, date)
);

CREATE INDEX IF NOT EXISTS idx_captures_date ON captures(date);
CREATE INDEX IF NOT EXISTS idx_captures_status ON captures(status);
CREATE INDEX IF NOT EXISTS idx_captures_domain ON captures(domain);

PRAGMA user_version = 1;
