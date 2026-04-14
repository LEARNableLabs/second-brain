CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT,
  body TEXT,
  content_type TEXT NOT NULL CHECK(content_type IN ('article', 'paper', 'general')),
  word_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  extracted_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(url, date),
  FOREIGN KEY (url, date) REFERENCES captures(url, date)
);

CREATE INDEX IF NOT EXISTS idx_content_date ON content(date);

PRAGMA user_version = 2;
