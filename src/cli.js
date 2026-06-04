#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  buildReleaseNotes,
  buildTriageReport,
  formatMarkdownReport,
  parseCommitLines
} from "./core.js";
import { createOpenAINote } from "./openai.js";

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

async function readOptionalFile(path) {
  if (!path) return "";
  return readFile(path, "utf8");
}

function printHelp() {
  console.log(`Maintainer Signal

Usage:
  node src/cli.js demo
  node src/cli.js triage --title <title> [--body <text>] [--body-file <path>] [--files <list>] [--use-openai] [--json]
  node src/cli.js release-notes --commits-file <path>
`);
}

async function runTriage(args) {
  const bodyFromFile = await readOptionalFile(args["body-file"]);
  const input = {
    title: args.title || "",
    body: bodyFromFile || args.body || "",
    files: args.files || "",
    diff: await readOptionalFile(args["diff-file"])
  };
  const report = buildTriageReport(input);
  let aiText = "";

  if (args["use-openai"]) {
    aiText = await createOpenAINote({
      apiKey: process.env.OPENAI_API_KEY,
      model: args.model || process.env.OPENAI_MODEL,
      kind: "triage",
      context: { input, report }
    });
  }

  if (args.json) {
    console.log(JSON.stringify({ ...report, aiText }, null, 2));
    return;
  }

  console.log(formatMarkdownReport(report, aiText));
}

async function runReleaseNotes(args) {
  const commitsText = await readOptionalFile(args["commits-file"]);
  const commits = parseCommitLines(commitsText);
  const notes = buildReleaseNotes(commits);

  console.log("# Release Notes\n");

  for (const [heading, items] of Object.entries(notes)) {
    if (items.length === 0) continue;
    console.log(`## ${heading[0].toUpperCase()}${heading.slice(1)}\n`);
    for (const item of items) console.log(`- ${item}`);
    console.log("");
  }
}

async function runDemo() {
  const report = buildTriageReport({
    title: "Fix OAuth token refresh race",
    body: "Users can be logged out when two refresh requests overlap in production.",
    files: "src/auth/session.js,test/session.test.js"
  });

  console.log(formatMarkdownReport(report));
}

const [command = "help", ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

try {
  if (command === "triage") await runTriage(args);
  else if (command === "release-notes") await runReleaseNotes(args);
  else if (command === "demo") await runDemo();
  else printHelp();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
