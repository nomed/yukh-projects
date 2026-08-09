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
  const current = await read(".context/current.md");
  const actionContract = await read("docs/contracts/action-cli-release-v1.md");
  assert.doesNotMatch(current, /read-only (?:scope|qualification|credential)/iu);
  assert.doesNotMatch(
    actionContract,
    /\|\s*`github-token`\s*\|\s*yes\s*\|\s*Read-only credential/iu,
  );

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

test("the proposed preview contract keeps RFC-0003 effects independently authorized", async () => {
  const contract = await read(
    "docs/contracts/first-usable-preview-projects-v1.md",
  );
  const index = await read("docs/reference/contracts.md");
  const current = await read(".context/current.md");

  assert.match(contract, /\*\*Status:\*\* Proposed/);
  assert.match(
    contract,
    /nomed\/nomed\.github\.io@12d9215f10c4b7fb1762a5025367e3e81543800f/,
  );
  assert.match(contract, /exactly one `set_field_value`/);
  assert.match(contract, /exactly one `add_dependency`/);
  assert.match(contract, /`projects\.add-dependency\.v1`/);
  assert.match(contract, /exactly two consequential plans and two independently\s+issued approvals/);
  assert.match(
    contract,
    /`subjectRef`\s+remains the opaque host-attested GitHub installation or principal reference/,
  );
  assert.match(
    contract,
    /It never contains or\s+identifies an MCP capability, provider, verifier, plan, or policy digest/,
  );
  assert.match(contract, /MCP separately authenticates an admission artifact/);
  assert.match(
    contract,
    /MCP artifact cannot replace, modify, derive, or\s+authorize a Projects approval or `subjectRef`/,
  );

  for (const binding of [
    "plan ID",
    "operation-set digest",
    "nonce",
    "credential",
    "lease",
    "idempotency key",
    "verifier identity",
    "audit chain",
  ]) {
    assert.match(contract, new RegExp(binding));
  }

  assert.match(contract, /denied MCP admission performs zero Projects provider\s+calls/);
  assert.match(contract, /teardown, rather than reverse reconciliation/);
  assert.match(
    contract,
    /Teardown is available after every terminal effect\s+outcome: pre-effect denial, verified success, failure, or\s+`completion_unknown`/,
  );
  assert.match(
    contract,
    /seals its own terminal outcome and effect-specific\s+evidence before teardown/,
  );
  assert.match(
    contract,
    /Teardown success cannot convert a denied, failed, or\s+`completion_unknown` effect into success/,
  );
  assert.match(
    contract,
    /reports teardown\s+authorization, execution, and verification separately/,
  );
  assert.match(contract, /authorizes no implementation, merge, provider access/);
  assert.match(index, /Projects effects v1/);
  assert.match(index, /Proposed records are non-executable/);
  assert.match(current, /owner acceptance\s+pending/);
  assert.match(current, /No live apply is authorized/);
});
