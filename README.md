# Maintainer Signal

Maintainer Signal is a small open-source toolkit for GitHub maintainers. It
turns new issues, pull requests, and commit lists into practical triage notes:
priority, suggested labels, risk areas, maintainer questions, and release-note
drafts.

It runs without an API key using deterministic rules, and can optionally call
the OpenAI Responses API when `OPENAI_API_KEY` is configured.

Maintainer Signal is not affiliated with OpenAI.

## Why this exists

Open-source maintainers spend time on repetitive review work: finding risky PRs,
asking missing-context questions, labeling issues, and drafting release notes.
This project keeps those tasks transparent and auditable:

- no hidden dependency chain;
- no secrets printed in logs;
- no automatic code changes;
- conservative defaults for public repositories;
- a dry-run mode that works in forks and local development.

## Install

```bash
git clone https://github.com/EmperorDress/maintainer-signal.git
cd maintainer-signal
node src/cli.js demo
```

Node.js 20 or newer is required.

## CLI examples

Triage an issue or pull request:

```bash
node src/cli.js triage \
  --title "Fix auth token refresh race" \
  --body "Users can get logged out when two refresh requests overlap." \
  --files "src/auth/session.ts,test/auth/session.test.ts"
```

Generate release notes from conventional commits:

```bash
node src/cli.js release-notes --commits-file examples/commits.txt
```

Use OpenAI for a richer maintainer summary:

```bash
OPENAI_API_KEY=sk-... node src/cli.js triage \
  --title "Refactor release workflow" \
  --body-file examples/pr-body.md \
  --use-openai
```

## GitHub Action

Add this workflow to a repository that you maintain:

```yaml
name: Maintainer Signal

on:
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: EmperorDress/maintainer-signal@v0.1.0
        with:
          use-openai: false
          comment: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Set `use-openai: true` only after adding `OPENAI_API_KEY` as a repository secret.

## Safety model

Maintainer Signal reads GitHub event metadata, issue text, PR text, filenames,
and optional commit messages. It does not read `.env` files, private keys, or
arbitrary repository files unless a maintainer explicitly passes them to the CLI.

The GitHub Action posts a comment only when `comment: true`. Otherwise it writes
the report to the workflow summary.

## Deployment

The repository includes a GitHub Pages workflow under
`.github/workflows/pages.yml`. After the repo is public on GitHub, enable Pages
with "GitHub Actions" as the source. The static project site lives in `docs/`.

## Roadmap

- Configurable label maps per repository.
- Saved maintainer checklists for release managers.
- SARIF output for security-focused triage.
- Optional PR comment templates by risk category.

## License

MIT
