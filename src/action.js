#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { buildTriageReport, formatMarkdownReport } from "./core.js";
import { createOpenAINote } from "./openai.js";

export function getEventInput(event, files = []) {
  if (event.issue) {
    return {
      title: event.issue.title,
      body: event.issue.body,
      files
    };
  }

  if (event.pull_request) {
    return {
      title: event.pull_request.title,
      body: event.pull_request.body,
      files
    };
  }

  return {
    title: event.action ? `GitHub event: ${event.action}` : "GitHub event",
    body: JSON.stringify(event).slice(0, 4000),
    files
  };
}

export function getCommentUrl(event) {
  if (event.issue?.comments_url) return event.issue.comments_url;
  if (event.pull_request?._links?.comments?.href) return event.pull_request._links.comments.href;
  return "";
}

async function fetchGitHubJson(url, token, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed with ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

export async function getPullRequestFiles(event, token, fetchImpl = fetch) {
  const filesUrl = event.pull_request?.url ? `${event.pull_request.url}/files?per_page=100` : "";
  if (!filesUrl || !token) return [];

  const files = await fetchGitHubJson(filesUrl, token, fetchImpl);
  return files.map((file) => file.filename).filter(Boolean);
}

export async function postComment({ url, body, token, fetchImpl = fetch }) {
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

export async function runAction(env = process.env, fetchImpl = fetch) {
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH is not set.");

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const files = await getPullRequestFiles(event, env.GITHUB_TOKEN, fetchImpl);
  const input = getEventInput(event, files);
  const report = buildTriageReport(input);
  const useOpenAI = env.INPUT_USE_OPENAI === "true";
  let aiText = "";

  if (useOpenAI && env.OPENAI_API_KEY) {
    aiText = await createOpenAINote({
      apiKey: env.OPENAI_API_KEY,
      model: env.INPUT_MODEL || env.OPENAI_MODEL,
      kind: "github_action_triage",
      context: { input, report }
    });
  }

  const markdown = formatMarkdownReport(report, aiText);

  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(env.GITHUB_STEP_SUMMARY, markdown);
  } else {
    console.log(markdown);
  }

  if (env.INPUT_COMMENT === "true") {
    await postComment({
      url: getCommentUrl(event),
      body: markdown,
      token: env.GITHUB_TOKEN,
      fetchImpl
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAction().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
