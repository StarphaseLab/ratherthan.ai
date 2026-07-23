-- Direct, immutable R2 delivery for share cards. Keep the D1 BLOB during the
-- rollout: rows without a pointer continue through the proven fallback route.
ALTER TABLE cards ADD COLUMN object_key TEXT;
CREATE UNIQUE INDEX cards_object_key ON cards(object_key) WHERE object_key IS NOT NULL;
