-- Migration 0003: record when a plaque was hung; the Hall of Frames orders
-- by acquisition date. Backfill any plaque hung before this migration.
ALTER TABLE quotes ADD COLUMN plaque_at TEXT;
UPDATE quotes SET plaque_at = datetime('now') WHERE plaque IS NOT NULL;
