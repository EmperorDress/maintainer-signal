# Roadmap

Maintainer Signal is intentionally small. The roadmap focuses on maintainer
workflows that can stay transparent, testable, and safe in public repositories.

## Near term

- Repository-level configuration for label names and priority thresholds.
- Pull request file sampling for larger PRs with more than 100 changed files.
- Markdown templates for maintainer comment styles.
- A `--format sarif` output mode for security-oriented triage pipelines.

## Later

- Release manager checklist generation.
- Saved maintainer playbooks for repeated release workflows.
- Optional issue label application with explicit opt-in permissions.
- Examples for popular project types such as Node.js libraries, Python tools,
  and GitHub Actions.

## Non-goals

- Automatically merging pull requests.
- Rewriting contributor branches.
- Reading arbitrary repository files without explicit maintainer input.
- Printing secrets, private keys, `.env` contents, or production credentials.
