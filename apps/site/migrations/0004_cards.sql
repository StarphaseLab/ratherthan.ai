-- Share cards, minted in the curator's browser at approval time.
-- One row per published specimen; deleted with the quote, or when a future
-- edit invalidates it. style_version lets a redesign mark all cards stale.
CREATE TABLE cards (
  quote_id TEXT PRIMARY KEY,
  png BLOB NOT NULL,
  style_version INTEGER NOT NULL,
  minted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
