-- Migration 0001: the entire Phase 0 schema. Two tables.
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  variant TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  integration TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'rejected', 'deleted')),
  delete_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT
);

CREATE INDEX idx_quotes_status_created ON quotes (status, created_at DESC);

CREATE TABLE reactions (
  quote_id TEXT NOT NULL REFERENCES quotes (id),
  kind TEXT NOT NULL
    CHECK (kind IN ('useful_contrast', 'peak_agent', 'obvious_alternative',
                    'self_congratulation', 'actually_funny')),
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (quote_id, kind, voter_hash)
);
