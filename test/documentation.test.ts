import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("the public site follows the task-first documentation structure", async () => {
  const config = await read("mkdocs.yml");
  const home = await read("docs/index.md");

  for (const section of ["Tutorial", "How-to", "Operations", "Reference", "Explanation"]) {
    assert.match(config, new RegExp(`- ${section}:`));
  }
  assert.match(home, /Run the first dry-run/);
  assert.match(home, /not production-ready/);
  assert.match(home, /Projects, Coordination, and JetStream layout/);
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

test("the accepted preview contract keeps RFC-0003 effects independently authorized", async () => {
  const contract = await read(
    "docs/contracts/first-usable-preview-projects-v1.md",
  );
  const index = await read("docs/reference/contracts.md");
  const current = await read(".context/current.md");
  const approvalCountSources = [contract, index, current];

  assert.match(contract, /\*\*Status:\*\* Accepted/);
  assert.match(contract, /\*\*Accepted:\*\* 2026-08-09 by `@nomed`/);
  assert.match(
    contract,
    /nomed\/nomed\.github\.io@12d9215f10c4b7fb1762a5025367e3e81543800f/,
  );
  assert.match(contract, /exactly one `set_field_value`/);
  assert.match(contract, /exactly one `add_dependency`/);
  assert.match(contract, /`projects\.add-dependency\.v1`/);
  assert.match(contract, /exactly two suite-level effect plans/);
  assert.match(contract, /distinct nested provider-owned Projects\s+plan `B-Projects`/);
  assert.match(
    contract,
    /exactly three independently verifiable approval\s+assertions/,
  );
  assert.match(
    contract,
    /Each Projects\s+approval assertion is an atomic pair of the unchanged v1 envelope and the\s+proposed v2 bridge claim/,
  );
  for (const approval of [
    "Projects Approval `A`",
    "MCP Approval `B-MCP`",
    "Projects Approval `B-Projects`",
  ]) {
    assert.match(contract, new RegExp(approval.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const source of approvalCountSources) {
    assert.doesNotMatch(
      source,
      /\btwo(?:[-\s]+\w+){0,2}[-\s]+approvals\b/iu,
    );
  }
  assert.match(
    contract,
    /keeps the accepted v1 `subjectRef` meaning: the\s+opaque host-attested GitHub installation or principal reference/,
  );
  assert.match(
    contract,
    /Neither contains or uses an\s+MCP capability, provider, verifier, plan, or policy digest as `subjectRef`/,
  );
  assert.match(
    contract,
    /MCP Approval `B-MCP` is the separately authenticated admission artifact/,
  );
  assert.match(
    contract,
    /Neither approval authorizes,\s+derives, modifies,\s+substitutes for, or implies the other/,
  );
  assert.match(contract, /form a compound\s+admission bridge/);
  for (const releaseBinding of [
    "projectsProducerReleaseA",
    "projectsProducerReleaseBProjects",
  ]) {
    assert.match(contract, new RegExp(releaseBinding));
  }
  assert.match(
    contract,
    /producer release bindings are independently authority-bound\s+values, but they are not required to differ/,
  );
  assert.match(
    contract,
    /Byte\s+equality does not make either plan, approval, or release binding shared or\s+reusable/,
  );
  assert.match(
    contract,
    /Changing either producer release commit, artifact digest, or entrypoint version\s+invalidates that complete effect plan and every approval that binds it/,
  );
  assert.match(
    contract,
    /requires a fresh observation, fresh plan envelope, and every applicable\s+fresh approval/,
  );
  assert.doesNotMatch(
    contract,
    /Shared release commits,[\s\S]{0,120}descriptive bindings only/,
  );
  assert.match(
    contract,
    /accepted Projects approval envelope v1 is closed and rejects unknown\s+fields/,
  );
  assert.match(
    contract,
    /schema: "yukh-projects-approval-bridge-v2"/,
  );
  assert.match(
    contract,
    /Every listed field\s+is required; unknown fields, unknown schema values, aliases, unlisted nesting,\s+sidecars, partial claims, and extra signatures fail closed/,
  );
  assert.match(
    contract,
    /implementation is blocked until a separately reviewed and accepted Projects\s+approval-bridge v2 and entrypoint compatibility contract/,
  );
  assert.match(
    contract,
    /There is no automatic\s+upgrade, inference, wrapping, or fallback between v1 and v2/,
  );
  assert.match(contract, /leaves current v1 behavior unchanged/);
  assert.match(contract, /effectBPostconditionBinding/);
  assert.match(
    contract,
    /MCP Approval `B-MCP` and Projects Approval `B-Projects` MUST carry the same\s+byte-identical canonical `effectBPostconditionBinding` digest/,
  );
  assert.match(
    contract,
    /verifier\s+identities, verifier artifacts, evidence chains, and authority scopes remain\s+distinct/,
  );
  assert.doesNotMatch(
    contract,
    /verifier identity and declared postconditions/,
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

  assert.match(contract, /denied MCP admission performs zero Projects\s+provider calls/);
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
  assert.match(contract, /Acceptance authorizes no implementation, provider access/);
  assert.match(index, /Projects effects v1/);
  assert.match(index, /semantic authority/);
  assert.match(
    current,
    /bridge\/wrapper\s+implementation candidate is author-remediated after a security block and awaits\s+distinct normal review plus fresh security review/,
  );
  assert.match(current, /No live apply is authorized/);
});

test("the accepted MCP bridge and wrapper preserve compound authority", async () => {
  const contract = await read(
    "docs/contracts/mcp-compound-approval-wrapper-v1.md",
  );
  const threatModel = await read("docs/security/threat-model.md");
  const index = await read("docs/reference/contracts.md");
  const current = await read(".context/current.md");
  const implementation = await read(
    "docs/contracts/mcp-compound-approval-wrapper-implementation-v1.md",
  );
  const validation = await read(
    "docs/validation/mcp-effect-b-controlled-apply-candidate.md",
  );

  assert.match(contract, /\*\*Status:\*\* Accepted/);
  assert.match(contract, /\*\*Accepted:\*\* 2026-08-09/);
  assert.match(contract, /pull\/152/);
  assert.match(
    contract,
    /nomed\/yukh-projects@56118de6760b5b582c9a2cf84640e22e3eaaac83/,
  );
  assert.match(
    contract,
    /nomed\/yukh-mcp@cef0d9c1088ae641e3a5892d616859458e429bb0/,
  );
  assert.match(contract, /schema: "yukh-projects-approval-bridge-v2"/);
  assert.match(
    contract,
    /Projects `SignedApprovalEnvelope` schema 1 and `ApprovalClaims` remain\s+byte-for-byte and semantically unchanged/,
  );
  assert.match(
    contract,
    /Projects v1 `subjectRef` remains the opaque host-attested GitHub\s+installation or principal reference/,
  );
  assert.match(contract, /The bridge is evidence, not authorization/);
  assert.match(contract, /Autonomous conflict decision/);
  assert.match(
    contract,
    /nomed\/nomed\.github\.io@bb8628edf7a07c2af56f07e4f9140f58c851ef47/,
  );
  assert.match(
    contract,
    /nomed\/yukh-projects@8b123f4f5dd6796dc355c34e5a800753ee257a82/,
  );
  assert.match(contract, /`projects\.add-dependency\.v1`/);
  assert.match(contract, /`github\.projects\.item\.status\.set@1\.0\.0`/);
  assert.match(
    contract,
    /operation cannot exact-match the\s+Accepted\s+dependency plan and must not be\s+treated as another name for it/,
  );
  for (const tieBreak of [
    "Least authority expansion",
    "Already-Accepted semantics — decisive",
    "Compatibility",
    "Reversibility",
    "Smallest diff",
  ]) {
    assert.match(contract, new RegExp(tieBreak));
  }
  assert.match(
    contract,
    /MCP RFC-0011 must be revised later in its owning repository;\s+no\s+MCP\s+supersession is bundled into issue #150/,
  );
  assert.match(contract, /Decision ID: projects-150-effect-b-conflict-v1/);
  assert.match(contract, /Class: B governance-only\/inert/);
  assert.match(
    contract,
    /Author session: 9912816c-7ee6-40f8-bb95-ac299453e722; role Author/,
  );
  assert.match(contract, /Implementation authority: none/);
  assert.match(
    contract,
    /Decision: preserve Projects effects v1 capability projects\.add-dependency\.v1/,
  );
  assert.match(
    contract,
    /Proposed MCP RFC-0011 must conform in its owning repository/,
  );
  assert.match(
    contract,
    /acceptance authorizes no implementation/,
  );
  assert.match(
    contract,
    /Acceptance authorizes no implementation of the bridge verifier/,
  );
  assert.doesNotMatch(
    contract,
    /Owner acceptance must therefore also choose a separate governance path/,
  );
  assert.match(contract, /Every field is required/);
  assert.match(contract, /Unknown fields, missing fields/);
  assert.match(
    contract,
    /trustRootFingerprint` is the canonical digest of\s+the host-selected Projects trust profile/,
  );
  assert.match(
    contract,
    /exact-match every binding that\s+exists in v1/,
  );
  assert.match(
    contract,
    /values that are intentionally absent\s+from the unchanged v1 schema against their separately authenticated sources/,
  );
  assert.match(contract, /mcpNonceBindingDigest/);
  assert.match(contract, /projectsNonceBindingDigest/);
  assert.match(contract, /projectsLeaseScopeDigest/);
  assert.match(contract, /projectsLeaseHolderDigest/);
  assert.match(contract, /coordinationEpoch/);
  assert.match(
    contract,
    /They describe\s+the one lease the Projects host may acquire; they are not a lease capability/,
  );
  assert.match(
    contract,
    /MCP and Projects approvals bind the same byte-identical canonical Effect B\s+postcondition/,
  );
  assert.match(contract, /MCP MUST NOT consume it/);
  assert.match(
    contract,
    /keeps MCP assertion verification inside the MCP approval\s+adapter/,
  );
  assert.match(contract, /mcpVerifiedAdmissionHandle/);
  assert.doesNotMatch(contract, /mcpTrustHandle/);
  assert.match(contract, /Compound admission is atomic at the provider boundary/);
  assert.match(
    contract,
    /zero GitHub or other provider calls/,
  );
  assert.match(
    contract,
    /runMcpEffectBControlledApplyV1/,
  );
  assert.match(contract, /reconciliation mode `native-v1`/);
  assert.match(contract, /`add_dependency\(201 blocks 202\)` operation/);
  assert.match(contract, /approved kind\s+`add_blocked_by`/);
  assert.doesNotMatch(
    contract,
    /profile `yukh-mcp\/suite-preview-effect-b-status-v1`/,
  );
  assert.match(
    contract,
    /cannot contain or select a repository, Project, issue, item,\s+field, option, provider identifier, target, policy, environment, mode/,
  );
  for (const primitive of [
    "verifySignedApproval",
    "parseProtectedHostCapsule",
    "createControlledApplyHostFactory",
    "runApplyEntrypoint",
  ]) {
    assert.match(contract, new RegExp(primitive));
  }
  const composition = contract.slice(
    contract.indexOf("## Reviewed primitive composition"),
    contract.indexOf("## One attempt and completion semantics"),
  );
  assert.ok(
    composition.indexOf("verifySignedApproval") <
      composition.indexOf("createControlledApplyHostFactory"),
  );
  assert.match(
    composition,
    /`verifySignedApproval` call MUST complete successfully before\s+`createControlledApplyHostFactory\(\.\.\.\)\.create\(\.\.\.\)`/,
  );
  assert.match(
    composition,
    /factory\s+`create` method performs an initial provider read/,
  );
  assert.match(
    composition,
    /invalid, unavailable, stale, substituted, or mismatched Projects v1\s+approval returns `YKP-MCP-WRAPPER-003`[\s\S]*zero provider calls/,
  );
  assert.match(
    composition,
    /`runApplyEntrypoint` receives the original unchanged Projects v1 approval[\s\S]*MUST re-verify/,
  );
  assert.match(
    threatModel,
    /call `verifySignedApproval` on the unchanged Projects v1 artifact before\s+`createControlledApplyHostFactory\(\.\.\.\)\.create\(\.\.\.\)`/,
  );
  assert.match(contract, /Exactly one request is allowed/);
  assert.match(contract, /There is no hidden retry/);
  assert.match(contract, /status: "completion_unknown"/);
  assert.match(contract, /checksums and an SPDX SBOM/);
  assert.match(contract, /closed conformance vector corpus/);
  assert.match(
    contract,
    /It authorizes no GitHub request,\s+credential creation/,
  );
  assert.match(
    contract,
    /9912816c-7ee6-40f8-bb95-ac299453e722[\s\S]*role Author/,
  );
  assert.match(
    contract,
    /25943a6f-ca56-4540-b162-d93e4a7da1f3[\s\S]*role Independent read-only reviewer/,
  );
  assert.match(
    contract,
    /edc1a0d3-52c1-4ccd-8ebe-291b8467db21[\s\S]*role distinct RFC-0007 Class B\s+Executor\/Merger/,
  );
  for (const commentId of ["5231931606", "5232002216", "5232023269"]) {
    assert.match(contract, new RegExp(commentId));
  }

  assert.match(threatModel, /MCP compound approval and wrapper confusion/);
  assert.match(
    threatModel,
    /resolves the conflict in favor of\s+the already-Accepted Projects `add_dependency` semantic/,
  );
  assert.match(threatModel, /durable `completion_unknown`/);
  assert.match(threatModel, /Controls accepted under issue #150/);
  assert.match(
    threatModel,
    /Accepted specification assumes\s+none of those operational risks and authorizes no implementation, provider\s+credentials, or live use/,
  );
  assert.match(
    threatModel,
    /security review blocked the first candidate head because a\s+declaration-stripped test helper remained a runtime JavaScript export/,
  );
  assert.match(
    threatModel,
    /closes package exports to the root\s+entrypoint with a package file allowlist/,
  );
  assert.match(index, /MCP compound approval bridge and wrapper v1/);
  assert.match(index, /Bridge and wrapper implementation v1/);
  assert.match(
    index,
    /substantively reviewed and merged through PR #152 as\s+`nomed\/yukh-projects@56118de6760b5b582c9a2cf84640e22e3eaaac83`/,
  );
  assert.match(current, /is Accepted under #150 after independent review of PR #152/);
  assert.match(current, /#154[\s\S]*runMcpEffectBControlledApplyV1/);
  assert.match(
    current,
    /conflict rule resolves the cross-record mismatch in favor of the\s+already-Accepted Projects `add_dependency` Effect B/,
  );
  assert.match(
    current,
    /Class B-X author record for #154 grants no review, acceptance,\s+merge, provider, credential, live-effect, deployment, activation, or release\s+authority/,
  );
  assert.match(implementation, /Unreviewed implementation candidate/);
  assert.match(
    implementation,
    /dist\/mcp-effect-b\/index\.js` and the compiled production deep module each export\s+only that runtime function/,
  );
  assert.match(
    implementation,
    /Synthetic qualification injects its private host\s+adapter from excluded test-only source into a temporary bundle/,
  );
  assert.match(implementation, /Steps 1 through 6 perform no provider call/);
  assert.match(implementation, /`verifySignedApproval` completes before the provider-backed factory/);
  assert.match(implementation, /add_dependency\(201 blocks 202\)/);
  assert.match(implementation, /terminal `completion_unknown`/);
  assert.match(validation, /Publication is fixed to `disabled`/);
  assert.match(validation, /npm sbom --sbom-format spdx/);
  assert.match(validation, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
  assert.match(validation, /distinct normal and\s+fresh security review/i);
});

test("the Effect B conformance runner is documented only as a hermetic test seam",async()=>{
  const runner=await read("docs/validation/mcp-effect-b-hermetic-conformance-runner.md");
  const validation=await read("docs/validation/mcp-effect-b-controlled-apply-candidate.md");
  assert.match(runner,/repository-checkout conformance seam/);
  assert.match(runner,/not a package API, runtime entrypoint/);
  assert.match(runner,/sole production MCP Effect B\s+export/);
  assert.match(runner,/exactly two\s+fields/);
  assert.match(runner,/at most 512 bytes/);
  assert.match(runner,/no larger than 4096 bytes/);
  assert.match(runner,/cannot contain raw handles, secrets, credentials/);
  assert.match(runner,/no URL, endpoint, credential, handle, module, source path/);
  assert.match(runner,/Provider calls:\*\* none/);
  assert.match(runner,/Class: B-X local test-only implementation candidate/);
  assert.match(runner,/grants no self-review, acceptance, merge, release/);
  for(const caseId of [
    "effect-observed",
    "denial-zero-call",
    "trust-mismatch",
    "nonce-substitution",
    "lease-substitution",
    "completion-unknown-no-retry",
    "independent-verification",
    "cleanup",
  ])assert.match(runner,new RegExp(`\\\`${caseId}\\\``));
  assert.match(validation,/hermetic conformance runner/);
  assert.match(validation,/repository-only\s+test seam, not runtime authority/);
});
