#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import { buildTriageReport, formatMarkdownReport } from "./core.js";
import { createOpenAINote } from "./openai.js";

function getEventInput(event) {
  if (event.issue) {
    return {
      title: event.issue.title,
      body: event.issue.body,
      files: ""
    };
  }

  if (event.pull_request) {
    return {
      title: event.pull_request.title,
      body: event.pull_request.body,
      files: ""
    };
  }

  return {
    title: event.action ? `GitHub event: ${event.action}` : "GitHub event",
    body: JSON.stringify(event).slice(0, 4000),
    files: ""
  };
}

function getCommentUrl(event) {
  if (event.issue?.comments_url) return event.issue.comments_url;
  if (event.pull_request?._links?.comments?.href) return event.pull_request._links.comments.href;
  return "";
}

async function postComment({ url, body, token, fetchImpl = fetch }) {
  if (!url || !token) return false;

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub comment failed with ${response.status}: ${text.slice(0, 300)}`);
  }

  return true;
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH is not set.");

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const input = getEventInput(event);
  const report = buildTriageReport(input);
  const useOpenAI = process.env.INPUT_USE_OPENAI === "true";
  let aiText = "";

  if (useOpenAI && process.env.OPENAI_API_KEY) {
    aiText = await createOpenAINote({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.INPUT_MODEL || process.env.OPENAI_MODEL,
      kind: "github_action_triage",
      context: { input, report }
    });
  }

  const markdown = formatMarkdownReport(report, aiText);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
  } else {
    console.log(markdown);
  }

  if (process.env.INPUT_COMMENT === "true") {
    await postComment({
      url: getCommentUrl(event),
      body: markdown,
      token: process.env.GITHUB_TOKEN
    });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
