# First-adopter setup guide for GitHub Actions

This guide helps maintainers try Maintainer Signal in an existing repository with conservative defaults. Start in dry-run mode, review the workflow output, then opt in to comments and OpenAI only when you are comfortable with the results.

## Before you start

- You have maintainer access to the target repository.
- GitHub Actions is enabled for the repository.
- The repository allows workflows to use the default `GITHUB_TOKEN`.
- Optional: you have an OpenAI API key ready if you want AI-assisted notes.

## 1. Add the workflow

Create `.github/workflows/maintainer-signal.yml` in your repository:

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
          comment: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

These permissions are intentionally narrow:

- `contents: read` lets the Action run from your repository checkout.
- `issues: write` allows issue comments when comment mode is enabled.
- `pull-requests: write` allows PR comments when comment mode is enabled.

## 2. Start with dry-run mode

The safest first run is:

```yaml
with:
  use-openai: false
  comment: false
```

With `comment: false`, Maintainer Signal does not post to issues or pull requests. It writes the report to the workflow step summary so maintainers can inspect the output from the Actions run page.

To test it:

1. Open or edit a low-risk test issue or pull request.
2. Go to **Actions → Maintainer Signal → the latest run**.
3. Open the `triage` job and read the step summary.
4. Confirm the suggested priority, labels, risks, and maintainer questions are useful for your project.

## 3. Enable comment mode after review

When the dry-run output looks useful, enable comments:

```yaml
with:
  use-openai: false
  comment: true
```

In comment mode, the Action posts the same report as an issue or PR comment. Keep `issues: write` and `pull-requests: write` in the workflow permissions, because GitHub requires write permission on the target resource before the default `GITHUB_TOKEN` can create comments.

If you only want summaries in Actions logs, keep `comment: false`.

## 4. Opt in to OpenAI only when ready

Maintainer Signal works without an OpenAI key. To add AI-assisted notes:

1. Add `OPENAI_API_KEY` as a repository secret under **Settings → Secrets and variables → Actions**.
2. Change the workflow input:

```yaml
with:
  use-openai: true
  comment: true
```

3. Pass the secret to the Action:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Only enable `use-openai: true` after deciding that issue and PR metadata from this repository may be sent to OpenAI. Do not enable it for repositories where your maintainers are not comfortable sending titles, descriptions, filenames, and other event metadata to an external API.

## Rollback steps

If you need to stop Maintainer Signal quickly:

1. Disable comments first by setting `comment: false` and merging that workflow change.
2. If you enabled OpenAI, set `use-openai: false` and remove `OPENAI_API_KEY` from the workflow environment.
3. If you want to fully remove the Action, delete `.github/workflows/maintainer-signal.yml`.
4. Optional: remove the `OPENAI_API_KEY` repository secret if it is no longer used.
5. Delete any test comments that were posted while evaluating the Action.

A rollback does not require revoking the built-in `GITHUB_TOKEN`; GitHub creates that token for each workflow run and expires it automatically.

## Troubleshooting GitHub Actions permission errors

### `Resource not accessible by integration`

This usually means the workflow token cannot write to the issue or pull request.

Check that your workflow includes:

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write
```

Also check repository settings under **Settings → Actions → General → Workflow permissions**. The repository must allow workflows enough permission for the `GITHUB_TOKEN` to create comments. If your organization restricts this setting, ask an organization owner to review the policy.

### Comments fail on pull requests from forks

GitHub intentionally limits tokens for some fork-based pull request events. For first-adopter testing, use `comment: false` on fork PRs and review the workflow summary instead. Avoid switching to `pull_request_target` unless you have reviewed the security implications for untrusted code.

### `GitHub comment failed with 403`

A 403 during comment mode normally means one of these is true:

- `issues: write` or `pull-requests: write` is missing.
- Repository or organization workflow permissions are read-only.
- The run was triggered from a fork with restricted token permissions.
- The issue or PR comes from a context where GitHub does not allow the token to comment.

Set `comment: false` to restore dry-run behavior while you adjust permissions.

### OpenAI note is missing

If `use-openai: true` but no AI-assisted note appears, confirm that:

- `OPENAI_API_KEY` exists as an Actions secret.
- The workflow passes `OPENAI_API_KEY` in `env`.
- The key is valid and has access to the configured model.

If the key is absent, Maintainer Signal falls back to the deterministic report rather than printing the secret or failing because of the missing optional key.
