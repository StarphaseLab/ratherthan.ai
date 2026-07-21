-- Moderation-queue ordering, split from the public timestamp. passToEnd moves
-- queued_at; created_at (the public feed's sort key + displayed date) stays the
-- honest submission time. NULL means "never passed" -> order by created_at.
ALTER TABLE quotes ADD COLUMN queued_at TEXT;
CREATE INDEX idx_quotes_pending_queue
  ON quotes (status, queued_at, created_at);
