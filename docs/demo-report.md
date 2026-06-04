# Demo Report

This is an example of the deterministic report generated without an API key.

```markdown
## Maintainer Signal

**Priority:** P0
**Suggested labels:** security-review, bug, tests

**Summary:** Fix OAuth token refresh race: Users can be logged out when two refresh requests overlap in production.

### Risk areas
- Security-sensitive behavior or credential handling may be involved.

### Next steps
- Confirm the intended behavior and reproduction context.
- Check secret handling, permissions, and authorization boundaries.
- Run the related test suite and check failure output.

### Maintainer questions
- What permissions, tokens, or user roles are affected?
```

The same workflow can optionally include an OpenAI-assisted note when a
maintainer enables `OPENAI_API_KEY`.
