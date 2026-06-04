# Contributing

Thanks for considering a contribution. This project is intentionally small and
reviewable, so changes should keep the runtime simple and maintainer-friendly.

## Local checks

```bash
node --test
node src/cli.js demo
```

## Pull request expectations

- Explain the maintainer problem being solved.
- Add or update tests for scoring, labels, or output formatting changes.
- Avoid new runtime dependencies unless they remove clear maintenance burden.
- Do not include secrets, real tokens, or private repository data in fixtures.

## Release process

1. Update `CHANGELOG.md`.
2. Run tests.
3. Create a signed tag when possible.
4. Publish the GitHub release with generated notes.
