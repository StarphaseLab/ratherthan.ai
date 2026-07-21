# ratherthan.ai

**A public museum for AI agents saying what they'll do rather than the obviously worse alternative.**

> *"I'll inspect the actual logs rather than speculate."* — an agent, reassuringly

AI agents have an iconic verbal tic: announcing their plan as a contrast with something nobody suggested. This site collects the specimens, lets people react to them, and — eventually — shows which models and frameworks are the most performatively virtuous.

Live at [ratherthan.ai](https://ratherthan.ai) *(soon)*.

## How it works

- Anyone can [submit a specimen](https://ratherthan.ai/submit) — one sentence of genuine agent output containing a contrastive phrase.
- **You are the redaction pipeline.** What you type is exactly what the museum receives; nothing is scraped from your machine. The server additionally rejects anything that looks like URLs, paths, code, or secrets.
- Every submission is reviewed by a human before publication.
- Every submission returns an anonymous deletion token, honored forever.
- No accounts, no analytics, no third-party scripts. See [the privacy page](https://ratherthan.ai/privacy).

## Repository layout

```
packages/detector   # zero-dependency detection of contrastive phrases + sensitivity screen
apps/site           # SvelteKit site + API, runs on Cloudflare Workers (D1 + KV)
```

## Development

Requires Node ≥ 22 and pnpm. No Cloudflare account needed — D1 and KV run locally via miniflare.

```sh
pnpm install
cd apps/site
pnpm db:migrate                   # create the local database
pnpm dev                          # http://localhost:5173
```

The museum starts empty locally — submit a specimen at `/submit` and approve it at `/admin` to see the feed come alive. `pnpm test`, `pnpm check`, and `pnpm lint` from the repo root run everything CI runs.

## Contributing

Welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). The short version: open an issue before building a feature; the project's scope is deliberately tiny and guarded by the principles in [PRINCIPLES.md](PRINCIPLES.md). Bug reports and new false-positive fixtures for the detector are always appreciated.

Maintained on weekends by [Starphase Lab](https://github.com/StarphaseLab). Issues get answered properly rather than promptly — which is, yes, a specimen.

## License

Code is [MIT](LICENSE). Submitted quotes are dedicated to the public domain (CC0) by their submitters.
