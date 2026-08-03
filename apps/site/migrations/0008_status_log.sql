-- A specimen left the collection on 2026-08-03 and nobody could say when or
-- by whose hand: the change was written straight to D1, where no application
-- log can see it. Triggers can — they fire for the site, for wrangler, for a
-- script holding any key. The log answers "what changed, and when"; with a
-- timestamp, D1 Time Travel can answer the rest.
--
-- Statuses and timestamps only, never text: a deleted specimen's words must
-- not survive in a side table. PRIVACY.md promises deletion is deletion.
--
-- datetime('now') matches quotes.created_at / approved_at, so the log reads
-- against the rows it shadows without translating between spellings.
CREATE TABLE quote_status_log (
  seq INTEGER PRIMARY KEY,
  quote_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER quotes_status_changed AFTER UPDATE OF status ON quotes
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO quote_status_log (quote_id, from_status, to_status)
  VALUES (NEW.id, OLD.status, NEW.status);
END;

-- A row removed outright leaves no status to compare, and is the one event
-- the museum could not otherwise notice at all. purgeExpiredRejects writes
-- here too — routine housekeeping, and a useful baseline for what normal
-- looks like.
CREATE TRIGGER quotes_row_removed AFTER DELETE ON quotes
BEGIN
  INSERT INTO quote_status_log (quote_id, from_status, to_status)
  VALUES (OLD.id, OLD.status, 'gone');
END;

-- Who sent the specimen, kept apart from how it arrived. `source` answers
-- the second question ('manual' through the form, 'log_import' mined from
-- our own transcripts) and must keep answering it: the purge exemption and
-- the queue ordering both branch on 'log_import'. A house submission still
-- arrives through the form, so it gets its own flag rather than overwriting
-- the record of how it came. Internal: never shown to visitors.
ALTER TABLE quotes ADD COLUMN house INTEGER NOT NULL DEFAULT 0;
