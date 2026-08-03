/* Where a specimen came from. 'manual' is a visitor, 'log_import' is mined
   from our own transcripts, and this is the museum submitting to itself —
   set at the moderation desk, because nothing about a submitter is stored
   at submission time. Internal bookkeeping: never shown to visitors.
   Non-server (cf. limits.ts, proposed.ts) so the admin UI and the server
   read one string. */
export const HOUSE_SOURCE = 'house'
