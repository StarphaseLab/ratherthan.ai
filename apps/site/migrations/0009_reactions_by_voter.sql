-- Every page that draws a pill now asks "which of these are yours", and the
-- table's primary key leads with quote_id, so a voter_hash lookup had to read
-- every reaction in the museum. Covering index: the query is answered from
-- the index alone, and it costs one extra write per vote — a trade that only
-- gets better, since votes are rare and page loads are not.
CREATE INDEX idx_reactions_voter ON reactions (voter_hash, quote_id, kind);
