-- Cards remember what they rendered, so staleness is a SQL comparison and
-- survives edits made by any path (admin action, direct SQL, future tools).
-- Existing rows get NULL snapshots -> all count as stale -> one re-mint sweep.
ALTER TABLE cards ADD COLUMN rendered_text TEXT;
ALTER TABLE cards ADD COLUMN rendered_variant TEXT;
ALTER TABLE cards ADD COLUMN rendered_model TEXT;
ALTER TABLE cards ADD COLUMN rendered_integration TEXT;
