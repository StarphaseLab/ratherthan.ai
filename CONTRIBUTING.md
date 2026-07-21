# Contributing

Thanks for wanting to help the museum grow.

## Ground rules

- **Discuss features in an issue before building them.** The project's scope is deliberately tiny; the principles in [PRINCIPLES.md](PRINCIPLES.md) decide what gets in. A polished PR for an out-of-scope feature will be declined kindly, and we'd rather save you the work.
- **Small PRs.** One change per PR, with tests where behavior changes.
- **Dependency budget.** The detector has zero runtime dependencies and stays that way. The site justifies every new production dependency in the PR description; if it can be 50 readable lines instead, write the lines.
- **Detector changes need fixtures.** A new rule or a fixed false positive lands together with entries in `packages/detector/test/fixtures/`. The fixture corpus is the spec.

## Getting started

```sh
pnpm install
cd apps/site && pnpm db:migrate && pnpm db:seed && pnpm dev
```

Before pushing, run from the repo root:

```sh
pnpm lint && pnpm check && pnpm test
```

## Especially welcome

- False-positive reports for the detector (with the text that fooled it).
- New contrastive-pattern proposals, with real specimens as evidence.
- Accessibility and readability fixes.

## Code of conduct

Be kind. Details in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
