# Principles

ratherthan.ai exists to generate smiles, not income. It should be small enough that two people can maintain it indefinitely on weekends, and trustworthy enough that developers happily point it at their own transcripts.

These principles are the constitution. When a feature idea conflicts with one of them, the feature loses.

1. **Fun first.** The feed must be funny before anything else matters. Analytics are a byproduct of a good joke, not the product.
2. **Trust in the DNA.** Nothing leaves a user's machine without them seeing exactly what leaves, and approving it. No dark patterns, no accounts, no tracking, no third-party analytics. The site should be a demonstration of how a respectful web project behaves.
3. **A human approves every byte of published text — twice.** The submitter approves what they send; a moderator approves what goes public. Automation may *suggest*; it never *publishes*.
4. **Boring technology, tiny surface.** Every component must be explainable in one sentence and cheap enough to run for years at $0/month plus the domain. No feature that creates an ops burden.
5. **Small dependency budget.** The detector has zero runtime dependencies. The site justifies every production dependency in a comment in `package.json`'s vicinity. If we can write it in 50 lines, we don't install it.
6. **Honest labels.** Model comparisons are "observed among participating installations," never benchmarks. Vote counts are lightly protected, not fraud-proof, and we say so on the site.

## Non-goals, permanently

User accounts. Full-transcript ingestion. General AI-slop detection (slopt and friends own that). Becoming an observability platform. Ads, sponsorships, paid tiers. ML classifiers server-side. Anything requiring a database of people.

## How this document is used

When a feature request or PR falls outside these lines, maintainers will link to this file and decline kindly. It's not personal — it's the constitution.
