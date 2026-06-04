import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReleaseNotes,
  buildTriageReport,
  detectSignals,
  parseCommitLines,
  suggestLabels
} from "../src/core.js";
import { extractResponseText } from "../src/openai.js";

test("detects security-sensitive issues", () => {
  const signals = detectSignals({
    title: "Fix token refresh race",
    body: "The OAuth session can leak an expired credential.",
    files: "src/auth/session.js"
  });

  assert.equal(signals.security, true);
});

test("suggests labels from metadata", () => {
  const labels = suggestLabels({
    title: "Docs typo",
    body: "Improve README wording",
    files: "README.md"
  });

  assert.deepEqual(labels, ["documentation"]);
});

test("raises priority for production security regressions", () => {
  const report = buildTriageReport({
    title: "Production auth regression",
    body: "Users report data loss after token refresh failure.",
    files: "src/auth/session.js"
  });

  assert.equal(report.priority, "P0");
  assert.ok(report.labels.includes("security-review"));
});

test("groups conventional commits into release notes", () => {
  const notes = buildReleaseNotes(
    parseCommitLines(`
feat: add action summary
fix: handle empty issue bodies
docs: document GitHub Pages deployment
chore: update fixtures
`)
  );

  assert.equal(notes.features.length, 1);
  assert.equal(notes.fixes.length, 1);
  assert.equal(notes.docs.length, 1);
  assert.equal(notes.maintenance.length, 1);
});

test("extracts output text from Responses API shape", () => {
  const text = extractResponseText({
    output: [
      {
        content: [
          {
            type: "output_text",
            text: "Maintainer summary"
          }
        ]
      }
    ]
  });

  assert.equal(text, "Maintainer summary");
});
