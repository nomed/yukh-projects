import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("the public site follows the task-first documentation structure", async () => {
  const config = await read("mkdocs.yml");
  const home = await read("docs/index.md");

  for (const section of ["Tutorial", "How-to", "Reference", "Explanation"]) {
    assert.match(config, new RegExp(`- ${section}:`));
  }
  assert.match(home, /Run the first dry-run/);
  assert.match(home, /not production-ready/);
});

test("repository-only migration records cannot enter the public build", async () => {
  const config = await read("mkdocs.yml");

  assert.match(config, /exclude_docs:\s*\|\s*\n\s+migration\//);
  assert.doesNotMatch(config, /nav:[\s\S]*migration\//i);
});

test("documentation diagrams use the maintained SVG asset", async () => {
  const config = await read("mkdocs.yml");
  const threatModel = await read("docs/security/threat-model.md");

  assert.doesNotMatch(config, /mermaid/i);
  assert.doesNotMatch(threatModel, /mermaid/i);
  assert.match(threatModel, /assets\/reconciliation-flow\.svg/);
});
