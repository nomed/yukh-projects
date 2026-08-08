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

test("the site uses the black header and canonical component mark", async () => {
  const config = await read("mkdocs.yml");

  assert.equal((config.match(/primary: black/g) ?? []).length, 2);
  assert.match(config, /logo: assets\/repository-mark\.svg/);
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

test("the proposed work type contract separates Project and repository ownership", async () => {
  const contract = await read("docs/contracts/work-type-provider-routing-v1.md");
  const threatModel = await read("docs/security/threat-model.md");

  for (const provider of ["NativeIssueTypeProvider", "ProjectWorkTypeProvider"]) {
    assert.match(contract, new RegExp(provider));
  }
  assert.match(contract, /Project ownership never selects or overrides\s+the provider/);
  assert.match(contract, /GraphQL remaining zero/);
  assert.match(contract, /YKP-WORKTYPE-003/);
  assert.match(threatModel, /Work type representation confusion/);
});

test("dry-run credential eligibility is structural rather than scope-exclusive", async () => {
  const paths = [
    ".context/current.md",
    "docs/contracts/action-cli-release-v1.md",
    "docs/contracts/dry-run-credential-profile-v1.md",
    "docs/contracts/github-read-only-adapter-v1.md",
    "docs/reference/dry-run-action.md",
    "docs/validation/release-1.7.0-provider-parity.md",
    "docs/migration/legacy-v0.8-shadow.md",
  ];
  const sources = await Promise.all(paths.map(read));

  for (const source of sources) {
    assert.match(source, /read permissions|read access/iu);
    assert.match(source, /write permissions/iu);
    assert.match(source, /MUST NOT|must not|remains eligible|accepted/iu);
    assert.match(source, /no\s+mutation transport/iu);
    assert.match(source, /apply\s+host/iu);
    assert.match(source, /approval/iu);
    assert.match(source, /apply\s+authority|controlled-apply\s+authority/iu);
  }
});
