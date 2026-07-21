<svelte:head>
  <title>Privacy — ratherthan.ai</title>
</svelte:head>

<h1>Privacy, in plain language</h1>

<ul>
  <li><strong>What we collect:</strong> the sentence you type into the submission form, the optional
    model/provider/integration labels, and nothing else. You are the redaction pipeline — nothing is
    scraped from your machine.</li>
  <li><strong>Accounts:</strong> none. Voting uses an anonymous first-party cookie holding a random
    id. It identifies a browser, not a person, and we store only a salted hash of it.</li>
  <li><strong>IP addresses:</strong> used transiently as salted hashes for rate limiting, expiring
    within hours. Never stored with quotes.</li>
  <li><strong>Analytics and trackers:</strong> none. No third-party scripts of any kind.</li>
  <li><strong>Hosting:</strong> Cloudflare serves the site and shows us aggregate traffic (request
    counts, countries, URLs). No cookies, no per-visitor data — the aggregates are all we ever
    see.</li>
  <li><strong>Deletion:</strong> every submission returns a one-time deletion token. Anyone holding
    it can remove the quote, forever, no questions asked.</li>
  <li><strong>Moderation:</strong> every quote is reviewed by a human before publication. Rejected
    submissions are purged after 30 days.</li>
</ul>

<p>
  The full source code, including this policy, is public:
  <a href="https://github.com/StarphaseLab/ratherthan.ai">github.com/StarphaseLab/ratherthan.ai</a>.
</p>

<style>
  h1 {
    font-size: 1.2rem;
  }
  li {
    margin-bottom: 0.5rem;
  }
</style>
