# Privacy

The human-readable, canonical version of what this project does with data. The live site mirrors this at `/privacy`.

- **Collected on submission:** the quote text you typed, the optional model/provider/integration labels. Nothing else. Nothing is scraped from your machine; you are the redaction pipeline.
- **Accounts:** none, ever.
- **Voting:** an anonymous first-party cookie holds a random id. The server stores only a salted hash of it. It identifies a browser, not a person.
- **IP addresses:** used as salted hashes in rate-limit counters that expire within hours. Never stored alongside quotes.
- **Analytics, trackers, third-party scripts:** none.
- **Hosting:** Cloudflare serves the site and shows us aggregate traffic (request counts, countries, URLs). No cookies, no per-visitor data — the aggregates are all we ever see.
- **Deletion:** every submission returns a one-time token; whoever holds it can delete the quote forever, no questions asked, no account needed.
- **Moderation:** a human reviews every quote before publication. Rejected submissions are purged after 30 days.
- **Logs:** operational logs are minimal and short-lived.

Changes to this policy happen in public, in this file's git history.
