import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = process.cwd();
const script = path.join(root, ".github/skills/github-projects-rest-first/scripts/github-rest-first.sh");

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ykp-rest-first-"));
  const gh = path.join(directory, "gh");
  await writeFile(gh, `#!/usr/bin/env bash
if [[ $* == "api rate_limit" ]]; then
  printf '%s\\n' '{"resources":{"core":{"remaining":4000,"limit":5000},"graphql":{"remaining":0,"limit":5000},"search":{"remaining":30,"limit":30}}}'
else
  printf '["%s"]\\n' "$*"
fi
`);
  await chmod(gh, 0o755);
  return directory;
}

test("routes project fields through the pinned REST endpoint", async () => {
  const directory = await fixture();
  const result = spawnSync(script, ["fields", "example-org", "7"], { encoding: "utf8", env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /X-GitHub-Api-Version: 2026-03-10/);
  assert.match(result.stdout, /orgs\/example-org\/projectsV2\/7\/fields\?per_page=100/);
  assert.doesNotMatch(result.stdout, /graphql/);
});

test("supports user-owned projects without GraphQL", async () => {
  const directory = await fixture();
  const result = spawnSync(script, ["user-items", "example-user", "5"], { encoding: "utf8", env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /users\/example-user\/projectsV2\/5\/items\?per_page=100/);
  assert.doesNotMatch(result.stdout, /graphql/);
});

test("rejects arbitrary selectors before a resource request", async () => {
  const directory = await fixture();
  const result = spawnSync(script, ["project", "https://example.com", "7"], { encoding: "utf8", env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /invalid project selector/);
});

test("fails closed when the REST reserve is reached", async () => {
  const directory = await fixture();
  const result = spawnSync(script, ["issue", "example-org", "example-repo", "11"], { encoding: "utf8", env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, YKP_REST_RESERVE: "4000" } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /REST reserve reached/);
});

test("skill contains no unfinished template markers", async () => {
  const body = await readFile(path.join(root, ".github/skills/github-projects-rest-first/SKILL.md"), "utf8");
  assert.doesNotMatch(body, /TODO|Structuring This Skill/);
});

test("helper remains compatible with gh versions that lack api --slurp", async () => {
  const body = await readFile(script, "utf8");
  assert.doesNotMatch(body, /--slurp/u);
  assert.match(body, /jq -s/u);
});
