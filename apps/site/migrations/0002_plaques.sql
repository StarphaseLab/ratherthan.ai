-- Migration 0002: plaques — signed curator's notes on select exhibits.
ALTER TABLE quotes ADD COLUMN plaque TEXT;
ALTER TABLE quotes ADD COLUMN plaque_by TEXT;
