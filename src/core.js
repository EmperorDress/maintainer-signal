const SECURITY_WORDS = [
  "auth",
  "authentication",
  "authorization",
  "csrf",
  "cve",
  "credential",
  "encryption",
  "injection",
  "jwt",
  "oauth",
  "password",
  "permission",
  "private key",
  "secret",
  "session",
  "sql",
  "ssrf",
  "token",
  "vulnerability",
  "xss"
];

const BREAKING_WORDS = [
  "breaking",
  "migration",
  "remove",
  "renamed",
  "deprecate",
  "major",
  "api change",
  "schema"
];

const BUG_WORDS = ["bug", "crash", "error", "exception", "fail", "fix", "regression"];
const DOC_WORDS = ["docs", "documentation", "readme", "guide", "typo"];
const TEST_WORDS = ["test", "spec", "coverage", "fixture"];
const PERF_WORDS = ["performance", "latency", "memory", "cache", "slow"];
const CI_WORDS = ["ci", "workflow", "github action", "pipeline", "build"];

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function toSearchText(input) {
  const files = Array.isArray(input.files) ? input.files.join(" ") : input.files ?? "";
  return normalizeText(`${input.title ?? ""} ${input.body ?? ""} ${input.diff ?? ""} ${files}`).toLowerCase();
}

export function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

export function splitFiles(files) {
  if (Array.isArray(files)) {
    return files.map((file) => normalizeText(file)).filter(Boolean);
  }

  return String(files ?? "")
    .split(/[,\n]/)
    .map((file) => normalizeText(file))
    .filter(Boolean);
}

export function detectSignals(input) {
  const text = toSearchText(input);
  const files = splitFiles(input.files);
  const fileText = files.join(" ").toLowerCase();

  const signals = {
    security: containsAny(text, SECURITY_WORDS),
    breaking: containsAny(text, BREAKING_WORDS),
    bug: containsAny(text, BUG_WORDS),
    docs: containsAny(text, DOC_WORDS) || files.some((file) => /(^|\/)(readme|docs?)/i.test(file)),
    tests: containsAny(text, TEST_WORDS) || files.some((file) => /\.(test|spec)\.[cm]?[jt]s$/i.test(file)),
    performance: containsAny(text, PERF_WORDS),
    ci: containsAny(text, CI_WORDS) || fileText.includes(".github/workflows"),
    dependencies: /package-lock|pnpm-lock|yarn.lock|requirements|poetry.lock|gemfile.lock|cargo.lock/i.test(fileText),
    frontend: /\.(css|scss|html|tsx|jsx|vue|svelte)$/i.test(fileText),
    backend: /\.(go|rs|py|rb|php|java|kt|cs)$/i.test(fileText) || /server|api|db|database/i.test(fileText)
  };

  return signals;
}

export function scorePriority(input) {
  const signals = detectSignals(input);
  const text = toSearchText(input);
  let score = 0;

  if (signals.security) score += 4;
  if (signals.breaking) score += 3;
  if (signals.bug) score += 2;
  if (signals.dependencies) score += 2;
  if (signals.ci) score += 1;
  if (signals.performance) score += 1;
  if (text.includes("production") || text.includes("data loss")) score += 3;
  if (text.includes("minor") || signals.docs) score -= 1;

  if (score >= 6) return "P0";
  if (score >= 4) return "P1";
  if (score >= 2) return "P2";
  return "P3";
}

export function suggestLabels(input) {
  const signals = detectSignals(input);
  const labels = [];

  if (signals.security) labels.push("security-review");
  if (signals.breaking) labels.push("breaking-change");
  if (signals.bug) labels.push("bug");
  if (signals.docs) labels.push("documentation");
  if (signals.tests) labels.push("tests");
  if (signals.performance) labels.push("performance");
  if (signals.dependencies) labels.push("dependencies");
  if (signals.ci) labels.push("ci");
  if (signals.frontend) labels.push("frontend");
  if (signals.backend) labels.push("backend");

  if (labels.length === 0) labels.push("needs-triage");
  return [...new Set(labels)];
}

export function summarizeInput(input) {
  const title = normalizeText(input.title) || "Untitled maintainer item";
  const body = normalizeText(input.body);

  if (!body) return title;
  if (body.length <= 180) return `${title}: ${body}`;
  return `${title}: ${body.slice(0, 177)}...`;
}

export function riskAreasFromSignals(signals) {
  const risks = [];

  if (signals.security) risks.push("Security-sensitive behavior or credential handling may be involved.");
  if (signals.breaking) risks.push("Public API, schema, or migration behavior may change.");
  if (signals.dependencies) risks.push("Dependency updates can introduce transitive risk.");
  if (signals.ci) risks.push("CI or release automation changes can affect maintainer workflows.");
  if (signals.performance) risks.push("Runtime performance or resource usage should be measured.");
  if (signals.frontend) risks.push("UI changes should be checked across desktop and mobile viewports.");
  if (signals.backend) risks.push("Server-side behavior should be covered by regression tests.");

  if (risks.length === 0) risks.push("No high-risk signals detected from the provided metadata.");
  return risks;
}

export function nextStepsFromSignals(signals) {
  const steps = ["Confirm the intended behavior and reproduction context."];

  if (signals.security) steps.push("Check secret handling, permissions, and authorization boundaries.");
  if (signals.breaking) steps.push("Document migration impact and verify compatibility notes.");
  if (signals.tests) steps.push("Run the related test suite and check failure output.");
  if (!signals.tests) steps.push("Ask for or add focused regression coverage.");
  if (signals.dependencies) steps.push("Review changelogs for updated dependencies.");
  if (signals.docs) steps.push("Preview rendered docs before merging.");

  return [...new Set(steps)];
}

export function maintainerQuestionsFromSignals(signals) {
  const questions = [];

  if (signals.security) questions.push("What permissions, tokens, or user roles are affected?");
  if (signals.breaking) questions.push("Who needs migration guidance before this ships?");
  if (signals.performance) questions.push("What benchmark or production signal confirms the improvement?");
  if (signals.dependencies) questions.push("Are dependency updates pinned and covered by lockfile review?");

  if (questions.length === 0) {
    questions.push("What outcome should a maintainer verify before merging?");
  }

  return questions;
}

export function buildTriageReport(input) {
  const signals = detectSignals(input);
  const priority = scorePriority(input);
  const labels = suggestLabels(input);

  return {
    summary: summarizeInput(input),
    priority,
    labels,
    signals,
    riskAreas: riskAreasFromSignals(signals),
    nextSteps: nextStepsFromSignals(signals),
    maintainerQuestions: maintainerQuestionsFromSignals(signals)
  };
}

export function parseCommitLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

export function buildReleaseNotes(commits) {
  const groups = {
    features: [],
    fixes: [],
    docs: [],
    maintenance: [],
    breaking: []
  };

  for (const commit of commits) {
    const lower = commit.toLowerCase();
    const cleaned = commit.replace(/^[a-f0-9]{7,40}\s+/i, "");

    if (lower.includes("!:") || lower.includes("breaking")) {
      groups.breaking.push(cleaned);
    } else if (lower.startsWith("feat")) {
      groups.features.push(cleaned);
    } else if (lower.startsWith("fix") || lower.includes("bug")) {
      groups.fixes.push(cleaned);
    } else if (lower.startsWith("docs")) {
      groups.docs.push(cleaned);
    } else {
      groups.maintenance.push(cleaned);
    }
  }

  return groups;
}

export function buildOpenAIPrompt(kind, context) {
  return [
    {
      role: "developer",
      content:
        "You are helping an open-source maintainer. Be concise, practical, and avoid overstating certainty. Do not reveal or infer secrets."
    },
    {
      role: "user",
      content: JSON.stringify({ task: kind, context }, null, 2)
    }
  ];
}

export function formatMarkdownReport(report, aiText = "") {
  const lines = [
    "## Maintainer Signal",
    "",
    `**Priority:** ${report.priority}`,
    `**Suggested labels:** ${report.labels.join(", ")}`,
    "",
    `**Summary:** ${report.summary}`,
    "",
    "### Risk areas",
    ...report.riskAreas.map((item) => `- ${item}`),
    "",
    "### Next steps",
    ...report.nextSteps.map((item) => `- ${item}`),
    "",
    "### Maintainer questions",
    ...report.maintainerQuestions.map((item) => `- ${item}`)
  ];

  if (aiText) {
    lines.push("", "### OpenAI-assisted note", aiText);
  }

  return `${lines.join("\n")}\n`;
}
