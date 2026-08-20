CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
  title,
  url,
  domain,
  content=captures,
  content_rowid=id
);

CREATE TRIGGER IF NOT EXISTS captures_fts_insert AFTER INSERT ON captures BEGIN
  INSERT INTO captures_fts(rowid, title, url, domain)
  VALUES (new.id, new.title, new.url, new.domain);
END;

CREATE TRIGGER IF NOT EXISTS captures_fts_delete AFTER DELETE ON captures BEGIN
  INSERT INTO captures_fts(captures_fts, rowid, title, url, domain)
  VALUES ('delete', old.id, old.title, old.url, old.domain);
END;

INSERT INTO captures_fts(captures_fts) VALUES('rebuild');

PRAGMA user_version = 3;
