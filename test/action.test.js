import test from "node:test";
import assert from "node:assert/strict";
import { getEventInput, getPullRequestFiles } from "../src/action.js";

test("builds pull request input with changed files", () => {
  const input = getEventInput(
    {
      pull_request: {
        title: "Update release workflow",
        body: "Adds release note automation"
      }
    },
    [".github/workflows/pages.yml", "src/action.js"]
  );

  assert.equal(input.title, "Update release workflow");
  assert.deepEqual(input.files, [".github/workflows/pages.yml", "src/action.js"]);
});

test("fetches pull request changed file names", async () => {
  const files = await getPullRequestFiles(
    {
      pull_request: {
        url: "https://api.github.com/repos/owner/repo/pulls/10"
      }
    },
    "token",
    async (url, options) => {
      assert.equal(url, "https://api.github.com/repos/owner/repo/pulls/10/files?per_page=100");
      assert.equal(options.headers.Authorization, "Bearer token");
      return {
        ok: true,
        async json() {
          return [{ filename: "src/action.js" }, { filename: "README.md" }];
        }
      };
    }
  );

  assert.deepEqual(files, ["src/action.js", "README.md"]);
});
