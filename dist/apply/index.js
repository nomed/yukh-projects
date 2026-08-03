// src/runtime-input.ts
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
var OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u;
var REPOSITORY = /^[A-Za-z0-9_.-]{1,100}$/u;
var DECIMAL = /^[1-9][0-9]{0,9}$/u;
function parseRuntimeScope(input3) {
  if (!OWNER.test(input3.owner) || !REPOSITORY.test(input3.repository) || input3.repository === "." || input3.repository === ".." || !DECIMAL.test(input3.projectNumber) || !DECIMAL.test(input3.issueNumber)) throw new TypeError("invalid runtime input");
  const projectNumber = Number(input3.projectNumber), issueNumber = Number(input3.issueNumber);
  if (projectNumber > 2147483647 || issueNumber > 2147483647) throw new TypeError("invalid runtime input");
  return { ownerLogin: input3.owner, repositoryName: input3.repository, projectNumber, issueNumber };
}
async function loadWorkspacePolicy(workspace, policyPath = ".yukh/project.yaml") {
  if (!policyPath || isAbsolute(policyPath) || policyPath.split(/[\\/]/u).includes("..") || /[\u0000-\u001f\u007f]/u.test(policyPath)) throw new TypeError("invalid policy path");
  const root = await realpath(workspace), candidate = resolve(root, policyPath), resolved = await realpath(candidate);
  const rel = relative(root, resolved);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new TypeError("invalid policy path");
  const metadata = await lstat(candidate);
  if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.size > 64 * 1024) throw new TypeError("invalid policy file");
  const source = await readFile(resolved, "utf8");
  if (Buffer.byteLength(source, "utf8") > 64 * 1024) throw new TypeError("invalid policy file");
  return source;
}

// src/apply-runtime-input.ts
import { constants, createReadStream } from "node:fs";
import { open as open2, realpath as realpath2 } from "node:fs/promises";
import { basename, dirname as dirname2, isAbsolute as isAbsolute2, relative as relative2, resolve as resolve2, sep as sep2 } from "node:path";
var VALUES = /* @__PURE__ */ new Set(["--mode", "--owner", "--repository", "--project-number", "--issue-number", "--policy-path", "--approved-plan-id", "--approval-file", "--approval-public-key-file", "--environment", "--github-read-token-fd", "--github-write-token-fd"]);
var DIGEST = /^[a-f0-9]{64}$/u;
var FD = /^(?:[3-9][0-9]{0,2}|1[0-9]{3})$/u;
function bounded(value2, max = 256) {
  return value2.length > 0 && value2.length <= max && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function fd(value2) {
  if (!value2 || !FD.test(value2)) throw new TypeError("invalid apply arguments");
  const parsed = Number(value2);
  if (!Number.isSafeInteger(parsed) || parsed > 1024) throw new TypeError("invalid apply arguments");
  return parsed;
}
function parseApplyCliArgs(argv) {
  const values = /* @__PURE__ */ new Map();
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (!VALUES.has(key) || values.has(key)) throw new TypeError("invalid apply arguments");
    const value2 = argv[++index];
    if (value2 === void 0 || value2.startsWith("--") || !bounded(value2, 1024)) throw new TypeError("invalid apply arguments");
    values.set(key, value2);
  }
  for (const key of VALUES) if (key !== "--policy-path" && !values.has(key)) throw new TypeError("invalid apply arguments");
  if (values.get("--mode") !== "apply" || !DIGEST.test(values.get("--approved-plan-id") ?? "") || !bounded(values.get("--environment") ?? "", 64)) throw new TypeError("invalid apply arguments");
  parseRuntimeScope({ owner: values.get("--owner"), repository: values.get("--repository"), projectNumber: values.get("--project-number"), issueNumber: values.get("--issue-number") });
  const readTokenFd = fd(values.get("--github-read-token-fd")), writeTokenFd = fd(values.get("--github-write-token-fd"));
  if (readTokenFd === writeTokenFd) throw new TypeError("invalid apply arguments");
  return { mode: "apply", owner: values.get("--owner"), repository: values.get("--repository"), projectNumber: values.get("--project-number"), issueNumber: values.get("--issue-number"), policyPath: values.get("--policy-path") ?? ".yukh/project.yaml", approvedPlanId: values.get("--approved-plan-id"), approvalFile: values.get("--approval-file"), approvalPublicKeyFile: values.get("--approval-public-key-file"), environment: values.get("--environment"), readTokenFd, writeTokenFd };
}
async function readBoundedFd(fdValue, maxBytes = 8192) {
  if (!Number.isSafeInteger(fdValue) || fdValue < 3 || fdValue > 1024 || maxBytes < 1 || maxBytes > 64 * 1024) throw new TypeError("invalid credential descriptor");
  let bytes = 0, value2 = "";
  for await (const chunk of createReadStream("", { fd: fdValue, autoClose: true })) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBytes) throw new TypeError("invalid credential");
    value2 += buffer.toString("utf8");
  }
  value2 = value2.replace(/\r?\n$/u, "");
  if (!value2 || /[\u0000-\u001f\u007f]/u.test(value2)) throw new TypeError("invalid credential");
  return value2;
}
async function readExclusiveWorkspaceFile(workspace, filePath, maxBytes = 64 * 1024) {
  if (!bounded(filePath, 1024) || isAbsolute2(filePath) || filePath.split(/[\\/]/u).includes("..") || maxBytes < 1 || maxBytes > 1024 * 1024) throw new TypeError("invalid protected file");
  const root = await realpath2(workspace), candidate = resolve2(root, filePath), parent = await realpath2(dirname2(candidate)), rel = relative2(root, parent);
  if (rel === ".." || rel.startsWith(`..${sep2}`) || isAbsolute2(rel)) throw new TypeError("invalid protected file");
  const resolved = resolve2(parent, basename(candidate)), handle = await open2(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size < 1 || metadata.size > maxBytes) throw new TypeError("invalid protected file");
    const value2 = await handle.readFile();
    if (value2.length < 1 || value2.length > maxBytes) throw new TypeError("invalid protected file");
    return value2;
  } finally {
    await handle.close();
  }
}
async function readApprovalArtifact(workspace, filePath) {
  const bytes = await readExclusiveWorkspaceFile(workspace, filePath);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new TypeError("invalid approval artifact");
  }
}

// src/apply-approval.ts
import { createHash, createPublicKey, verify } from "node:crypto";

// src/planner.ts
function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function canonicalValue(value2) {
  if (Array.isArray(value2)) return value2.map(canonicalValue);
  if (value2 && typeof value2 === "object") return Object.fromEntries(Object.entries(value2).sort(([a], [b]) => compareText(a, b)).map(([key, item]) => [key, canonicalValue(item)]));
  if (typeof value2 === "number" && !Number.isFinite(value2)) throw new TypeError("non-finite canonical number");
  return value2;
}
function canonicalJson(value2) {
  return JSON.stringify(canonicalValue(value2));
}

// src/apply-approval.ts
var APPLY_VERSIONS = { contract: "controlled-apply-v1", planner: "reconciliation-plan-v1", snapshot: "rest-project-snapshot-v2", entrypoint: "apply-entrypoint-v1" };
var DIGEST2 = /^[a-f0-9]{64}$/u;
var SIGNATURE = /^[A-Za-z0-9_-]{86}$/u;
var CLAIM_KEYS = ["schema", "issuerRef", "subjectRef", "repositoryRef", "projectRef", "issueRef", "issueNumber", "scopeDigest", "planId", "operationDigest", "environment", "protectedEnvironment", "issuedAtMs", "expiresAtMs", "nonce", "keyFingerprint", "contractVersion", "plannerVersion", "snapshotVersion", "entrypointVersion"];
var ENVELOPE_KEYS = ["schema", "algorithm", "keyFingerprint", "claims", "signature"];
function exactKeys(value2, keys2) {
  return !!value2 && typeof value2 === "object" && !Array.isArray(value2) && Object.keys(value2).length === keys2.length && Object.keys(value2).every((key) => keys2.includes(key));
}
function bounded2(value2, max = 256) {
  return typeof value2 === "string" && value2.length > 0 && value2.length <= max && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function publicKey(value2) {
  try {
    const key = createPublicKey(value2);
    if (key.asymmetricKeyType !== "ed25519") return null;
    const der = key.export({ type: "spki", format: "der" });
    return { key, fingerprint: createHash("sha256").update(der).digest("hex") };
  } catch {
    return null;
  }
}
function claimsShape(value2) {
  if (!exactKeys(value2, CLAIM_KEYS)) return false;
  const c = value2;
  return c.schema === 1 && bounded2(c.issuerRef) && bounded2(c.subjectRef) && bounded2(c.repositoryRef) && bounded2(c.projectRef) && bounded2(c.issueRef) && Number.isSafeInteger(c.issueNumber) && c.issueNumber > 0 && DIGEST2.test(c.scopeDigest) && DIGEST2.test(c.planId) && DIGEST2.test(c.operationDigest) && c.environment === "apply" && bounded2(c.protectedEnvironment, 64) && Number.isSafeInteger(c.issuedAtMs) && Number.isSafeInteger(c.expiresAtMs) && bounded2(c.nonce) && DIGEST2.test(c.keyFingerprint) && c.contractVersion === APPLY_VERSIONS.contract && c.plannerVersion === APPLY_VERSIONS.planner && c.snapshotVersion === APPLY_VERSIONS.snapshot && c.entrypointVersion === APPLY_VERSIONS.entrypoint;
}
function signatureInput(envelope) {
  return Buffer.from(`yukh-projects-approval-v1\0${canonicalJson(envelope)}`, "utf8");
}
function verifySignedApproval(artifact, trust) {
  if (!exactKeys(artifact, ENVELOPE_KEYS)) return null;
  const envelope = artifact;
  if (envelope.schema !== 1 || envelope.algorithm !== "Ed25519" || !DIGEST2.test(envelope.keyFingerprint) || !SIGNATURE.test(envelope.signature) || !claimsShape(envelope.claims)) return null;
  const trusted = publicKey(trust.publicKey);
  if (!trusted || trusted.fingerprint !== envelope.keyFingerprint || envelope.claims.keyFingerprint !== trusted.fingerprint || !trust.allowedIssuerRefs.includes(envelope.claims.issuerRef)) return null;
  try {
    const signature = Buffer.from(envelope.signature, "base64url");
    if (signature.length !== 64 || !verify(null, signatureInput({ schema: 1, algorithm: "Ed25519", keyFingerprint: envelope.keyFingerprint, claims: envelope.claims }), trusted.key, signature)) return null;
  } catch {
    return null;
  }
  return { ...envelope.claims };
}

// src/apply-coordination.ts
import { createHash as createHash2 } from "node:crypto";
var ApplyCoordinationError = class extends Error {
  constructor(code) {
    super("apply coordination failed");
    this.code = code;
    this.name = "ApplyCoordinationError";
  }
  code;
};
var DIGEST3 = /^[a-f0-9]{64}$/u;
function digest(value2) {
  return createHash2("sha256").update(value2).digest("hex");
}
function bindApplyCoordination(base, store, options) {
  if (!DIGEST3.test(options.holderDigest) || !Number.isSafeInteger(options.expiresAtMs) || !Number.isSafeInteger(options.epoch) || options.epoch < 1) throw new TypeError("invalid apply coordination binding");
  return { ...base, consumeNonce: async (nonce) => await store.consumeNonce({ keyDigest: digest(`nonce-key\0${nonce}`), valueDigest: digest(`nonce-value\0${nonce}`), expiresAtMs: options.expiresAtMs, epoch: options.epoch }) === "consumed", acquireLease: async (scopeDigest) => {
    const lease = await store.acquireLease({ keyDigest: digest(`lease-key\0${scopeDigest}`), holderDigest: options.holderDigest, expiresAtMs: options.expiresAtMs, epoch: options.epoch });
    return lease ? { fencingToken: lease.fencingToken, valid: () => lease.valid(), release: async () => {
      await lease.release();
    } } : null;
  } };
}

// src/executor.ts
import { createHash as createHash3 } from "node:crypto";
var ApplyPortError = class extends Error {
  constructor(failureClass) {
    super("apply port failed");
    this.failureClass = failureClass;
    this.name = "ApplyPortError";
  }
  failureClass;
};
var MESSAGE = { "YKP-APPLY-001": "apply request is invalid", "YKP-APPLY-002": "apply is not explicitly enabled", "YKP-APPLY-003": "approval is invalid or does not match", "YKP-APPLY-004": "approval is expired or has invalid lifetime", "YKP-APPLY-005": "operation is unsupported", "YKP-APPLY-006": "scope lease is unavailable or lost", "YKP-APPLY-007": "fresh preflight does not match approved plan", "YKP-APPLY-008": "approval nonce is already consumed", "YKP-APPLY-009": "operation precondition does not match", "YKP-APPLY-010": "mutation attempt failed", "YKP-APPLY-011": "operation verification failed", "YKP-APPLY-012": "final convergence verification failed", "YKP-APPLY-013": "provider authentication failed", "YKP-APPLY-014": "provider authorization failed", "YKP-APPLY-015": "provider budget is reserved", "YKP-APPLY-016": "provider is unavailable", "YKP-APPLY-017": "provider invariant is invalid" };
var MAP = { create_field: "create_project_field", add_option: "update_project_field_options", set_field_value: "update_project_item_field_value", set_parent: "add_sub_issue", add_dependency: "add_blocked_by" };
function hash(v) {
  return createHash3("sha256").update(canonicalJson(v)).digest("hex");
}
function integrity(plan) {
  if (!plan || plan.schema !== 1 || !plan.executable || plan.diagnostics.length !== 0 || !Array.isArray(plan.operations) || !Array.isArray(plan.observations)) return false;
  const { planId, ...base } = plan;
  return /^[a-f0-9]{64}$/u.test(planId) && hash(base) === planId;
}
function bounded3(v) {
  return typeof v === "string" && [...v].length > 0 && [...v].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(v);
}
function validScope(s) {
  return !!s && bounded3(s.subjectRef) && bounded3(s.repositoryRef) && bounded3(s.projectRef) && bounded3(s.issueRef) && Number.isSafeInteger(s.issueNumber) && s.issueNumber > 0;
}
function diag(code) {
  return { code, severity: "error", message: MESSAGE[code] };
}
function result(planId, ops, states, code, remaining = ops.length) {
  return { schema: 1, status: code === "YKP-APPLY-015" ? "deferred" : code ? "error" : "success", planId, outcomes: ops.map((o) => ({ operationKey: o.operationKey, outcome: states.get(o.operationKey) ?? "not_attempted" })), remaining, diagnostics: code ? [diag(code)] : [] };
}
function portCode(error, fallback) {
  if (!(error instanceof ApplyPortError)) return fallback;
  const codes = { authentication: "YKP-APPLY-013", authorization: "YKP-APPLY-014", deferred_rate_budget: "YKP-APPLY-015", provider: "YKP-APPLY-016", invariant: "YKP-APPLY-017" };
  return codes[error.failureClass];
}
function claimsValid(c, request, now, scopeDigest) {
  return !!c && c.schema === 1 && bounded3(c.issuerRef) && c.subjectRef === request.scope.subjectRef && c.repositoryRef === request.scope.repositoryRef && c.projectRef === request.scope.projectRef && c.issueRef === request.scope.issueRef && c.issueNumber === request.scope.issueNumber && c.scopeDigest === scopeDigest && c.planId === request.approvedPlanId && /^[a-f0-9]{64}$/u.test(c.operationDigest) && c.environment === "apply" && bounded3(c.protectedEnvironment) && c.protectedEnvironment === request.protectedEnvironment && Number.isSafeInteger(c.issuedAtMs) && Number.isSafeInteger(c.expiresAtMs) && c.issuedAtMs <= now && c.expiresAtMs >= now && c.expiresAtMs - c.issuedAtMs <= 15 * 60 * 1e3 && bounded3(c.nonce) && [...c.nonce].length >= 22 && /^[a-f0-9]{64}$/u.test(c.keyFingerprint) && c.contractVersion === "controlled-apply-v1" && c.plannerVersion === "reconciliation-plan-v1" && c.snapshotVersion === "rest-project-snapshot-v2" && c.entrypointVersion === "apply-entrypoint-v1";
}
function dependenciesValid(ops) {
  const prior = /* @__PURE__ */ new Set();
  for (const op of ops) {
    if (!bounded3(op.operationKey) || op.environment !== "dry-run" || op.dependsOn.some((d) => !prior.has(d))) return false;
    prior.add(op.operationKey);
  }
  return prior.size === ops.length;
}
function operationsMatchScope(ops, scope) {
  return ops.every((op) => op.subject.ref === scope.subjectRef && (op.resource.scopeRef === scope.repositoryRef || op.resource.scopeRef === scope.projectRef));
}
async function executeControlledPlan(request, ports) {
  const planId = request?.approvedPlanId ?? "invalid", states = /* @__PURE__ */ new Map();
  let operations = [];
  if (!validScope(request?.scope) || !/^[a-f0-9]{64}$/u.test(planId) || !bounded3(request?.protectedEnvironment)) return result(planId, operations, states, "YKP-APPLY-001");
  if (request.enablement !== "apply-explicitly-enabled") return result(planId, operations, states, "YKP-APPLY-002");
  const scopeDigest = hash(request.scope);
  let approval;
  try {
    approval = await ports.verifyApproval(request.approval);
  } catch {
    return result(planId, operations, states, "YKP-APPLY-003");
  }
  const now = ports.nowMs();
  if (!claimsValid(approval, request, now, scopeDigest)) return result(planId, operations, states, approval && approval.expiresAtMs < now ? "YKP-APPLY-004" : "YKP-APPLY-003");
  let lease = null;
  try {
    try {
      lease = await ports.acquireLease(scopeDigest);
    } catch (error) {
      return result(planId, operations, states, portCode(error, "YKP-APPLY-006"));
    }
    if (!lease || !await lease.valid()) return result(planId, operations, states, "YKP-APPLY-006");
    let fresh;
    try {
      fresh = await ports.replan();
    } catch (error) {
      return result(planId, operations, states, portCode(error, "YKP-APPLY-017"));
    }
    operations = fresh?.operations ?? [];
    if (!integrity(fresh) || fresh.planId !== planId || !dependenciesValid(operations) || !operationsMatchScope(operations, request.scope) || hash(operations) !== approval.operationDigest) return result(planId, operations, states, "YKP-APPLY-007");
    if (operations.some((op) => !MAP[op.type])) return result(planId, operations, states, "YKP-APPLY-005");
    if (!await ports.consumeNonce(approval.nonce)) return result(planId, operations, states, "YKP-APPLY-008");
    await ports.audit({ type: "apply_started", planId, outcome: "approved" });
    for (const op of operations) {
      if (!await lease.valid()) {
        await ports.audit({ type: "apply_stopped", planId, operationKey: op.operationKey, outcome: "lease_lost" });
        return result(planId, operations, states, "YKP-APPLY-006");
      }
      if (op.dependsOn.some((d) => !["verified", "already_converged"].includes(states.get(d) ?? "not_attempted"))) return result(planId, operations, states, "YKP-APPLY-009");
      let observed;
      try {
        observed = await ports.inspect(op);
      } catch (error) {
        return result(planId, operations, states, portCode(error, "YKP-APPLY-009"));
      }
      if (observed === "already_converged") {
        states.set(op.operationKey, "already_converged");
        await ports.audit({ type: "operation", planId, operationKey: op.operationKey, outcome: "already_converged" });
        continue;
      }
      if (observed !== "ready") {
        states.set(op.operationKey, "failed");
        return result(planId, operations, states, "YKP-APPLY-009");
      }
      if (!Number.isSafeInteger(lease.fencingToken) || lease.fencingToken < 1 || !await lease.valid()) return result(planId, operations, states, "YKP-APPLY-006");
      const mutationKind = MAP[op.type];
      try {
        await ports.mutate(mutationKind, op, hash([planId, op.operationKey]).slice(0, 64), lease.fencingToken);
      } catch (error) {
        states.set(op.operationKey, "failed");
        await ports.audit({ type: "operation", planId, operationKey: op.operationKey, outcome: "failed" });
        return result(planId, operations, states, portCode(error, "YKP-APPLY-010"));
      }
      let verified = false;
      try {
        await ports.invalidateAfterMutation(mutationKind, op);
        verified = await ports.verify(op);
      } catch (error) {
        return result(planId, operations, states, portCode(error, "YKP-APPLY-011"));
      }
      if (!verified) {
        states.set(op.operationKey, "failed");
        return result(planId, operations, states, "YKP-APPLY-011");
      }
      states.set(op.operationKey, "verified");
      await ports.audit({ type: "operation", planId, operationKey: op.operationKey, outcome: "verified" });
    }
    let finalPlan;
    try {
      finalPlan = await ports.replan();
    } catch (error) {
      return result(planId, operations, states, portCode(error, "YKP-APPLY-012"));
    }
    if (!integrity(finalPlan) || !finalPlan.executable || finalPlan.operations.length !== 0 || finalPlan.diagnostics.length !== 0) return result(planId, operations, states, "YKP-APPLY-012", finalPlan.operations.length);
    await ports.audit({ type: "apply_finished", planId, outcome: "verified" });
    return result(planId, operations, states, void 0, 0);
  } catch (error) {
    return result(planId, operations, states, portCode(error, "YKP-APPLY-012"));
  } finally {
    if (lease) try {
      await lease.release();
    } catch {
    }
  }
}
function renderPublicApplyReport(value2) {
  const counts = { already_converged: 0, verified: 0, failed: 0, not_attempted: 0 };
  for (const item of value2.outcomes) counts[item.outcome]++;
  return { schema: 1, status: value2.status, planId: value2.planId, counts, remaining: value2.remaining, diagnostics: value2.diagnostics.map((d) => ({ ...d })) };
}

// src/apply-entrypoint.ts
async function runApplyEntrypoint(request, host) {
  const now = host.ports.nowMs();
  if (!Number.isSafeInteger(now)) throw new TypeError("invalid apply host clock");
  const ports = bindApplyCoordination({ ...host.ports, verifyApproval: async (artifact) => verifySignedApproval(artifact, { publicKey: request.approvalPublicKey, allowedIssuerRefs: host.allowedIssuerRefs }) }, host.coordinationStore, { holderDigest: host.holderDigest, expiresAtMs: now + 15 * 60 * 1e3, epoch: host.coordinationEpoch });
  return renderPublicApplyReport(await executeControlledPlan({ approvedPlanId: request.approvedPlanId, scope: request.scope, approval: request.approvalArtifact, enablement: host.enablement, protectedEnvironment: request.protectedEnvironment }, ports));
}

// src/apply-action.ts
function input(io, name) {
  const value2 = io.env[`INPUT_${name.toUpperCase()}`];
  if (value2 === void 0 || value2 === "") throw new TypeError("invalid action input");
  return value2;
}
function failure(planId) {
  return { schema: 1, status: "error", planId: /^[a-f0-9]{64}$/u.test(planId) ? planId : "invalid", counts: { already_converged: 0, verified: 0, failed: 0, not_attempted: 0 }, remaining: 0, diagnostics: [{ code: "YKP-APPLY-001", severity: "error", message: "apply request is invalid" }] };
}
async function applyActionMain(io, factory) {
  let approvedPlanId = "invalid";
  try {
    if (input(io, "MODE") !== "apply") throw new TypeError("invalid action mode");
    const readToken = input(io, "GITHUB-READ-TOKEN");
    io.mask(readToken);
    const writeToken = input(io, "GITHUB-WRITE-TOKEN");
    io.mask(writeToken);
    if (readToken === writeToken) throw new TypeError("credential profiles must be distinct");
    approvedPlanId = input(io, "APPROVED-PLAN-ID");
    const workspace = io.env.GITHUB_WORKSPACE;
    if (!workspace) throw new TypeError("invalid action environment");
    const requestedScope = parseRuntimeScope({ owner: input(io, "OWNER"), repository: input(io, "REPOSITORY"), projectNumber: input(io, "PROJECT-NUMBER"), issueNumber: input(io, "ISSUE-NUMBER") }), [policySource, approvalArtifact, approvalPublicKey] = await Promise.all([loadWorkspacePolicy(workspace, io.env["INPUT_POLICY-PATH"] || ".yukh/project.yaml"), readApprovalArtifact(workspace, input(io, "APPROVAL-FILE")), readExclusiveWorkspaceFile(workspace, input(io, "APPROVAL-PUBLIC-KEY-FILE"))]), runtime = await factory.create({ requestedScope, policySource, readToken, writeToken }), report = await runApplyEntrypoint({ approvedPlanId, protectedEnvironment: input(io, "ENVIRONMENT"), scope: runtime.scope, approvalArtifact, approvalPublicKey }, runtime.host);
    await io.output("status", report.status);
    await io.output("plan-id", report.planId);
    await io.output("remaining", String(report.remaining));
    await io.output("report", JSON.stringify(report));
    if (report.status !== "success") io.error(report.diagnostics[0]?.code ?? "YKP-APPLY-001");
    return report;
  } catch {
    const report = failure(approvedPlanId);
    io.error("YKP-APPLY-001");
    return report;
  }
}

// src/apply-cli.ts
function failure2(planId) {
  return { schema: 1, status: "error", planId: /^[a-f0-9]{64}$/u.test(planId) ? planId : "invalid", counts: { already_converged: 0, verified: 0, failed: 0, not_attempted: 0 }, remaining: 0, diagnostics: [{ code: "YKP-APPLY-001", severity: "error", message: "apply request is invalid" }] };
}
async function applyCliMain(argv, workspace, factory, write) {
  let approvedPlanId = "invalid";
  try {
    const options = parseApplyCliArgs(argv);
    approvedPlanId = options.approvedPlanId;
    const [readToken, writeToken, policySource, approvalArtifact, approvalPublicKey] = await Promise.all([readBoundedFd(options.readTokenFd), readBoundedFd(options.writeTokenFd), loadWorkspacePolicy(workspace, options.policyPath), readApprovalArtifact(workspace, options.approvalFile), readExclusiveWorkspaceFile(workspace, options.approvalPublicKeyFile)]);
    if (readToken === writeToken) throw new TypeError("credential profiles must be distinct");
    const requestedScope = parseRuntimeScope({ owner: options.owner, repository: options.repository, projectNumber: options.projectNumber, issueNumber: options.issueNumber }), runtime = await factory.create({ requestedScope, policySource, readToken, writeToken }), report = await runApplyEntrypoint({ approvedPlanId: options.approvedPlanId, protectedEnvironment: options.environment, scope: runtime.scope, approvalArtifact, approvalPublicKey }, runtime.host);
    write(`${JSON.stringify(report)}
`);
    return report.status === "success" ? 0 : report.status === "deferred" ? 6 : 5;
  } catch {
    write(`${JSON.stringify(failure2(approvedPlanId))}
`);
    return 2;
  }
}

// src/apply-coordination-http.ts
var MEDIA = "application/yukh-coordination-primitives+json;version=1";
var DIGEST4 = /^[a-f0-9]{64}$/u;
var MAX_BODY = 4096;
var MAX_CAPABILITY = 3800;
function canonical(value2) {
  if (value2 === null || typeof value2 === "boolean" || typeof value2 === "string") return JSON.stringify(value2);
  if (typeof value2 === "number") {
    if (!Number.isSafeInteger(value2)) throw new ApplyCoordinationError("YKP-COORD-001");
    return JSON.stringify(value2);
  }
  if (Array.isArray(value2)) return `[${value2.map(canonical).join(",")}]`;
  if (typeof value2 !== "object") throw new ApplyCoordinationError("YKP-COORD-001");
  const record = value2, keys2 = Object.keys(record).sort();
  return `{${keys2.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}
function expiry(value2) {
  if (!Number.isSafeInteger(value2)) throw new ApplyCoordinationError("YKP-COORD-001");
  const formatted = new Date(value2).toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(formatted)) throw new ApplyCoordinationError("YKP-COORD-001");
  return formatted;
}
function validRequest(value2, epoch) {
  return DIGEST4.test(value2.keyDigest) && DIGEST4.test("valueDigest" in value2 ? value2.valueDigest : value2.holderDigest) && value2.epoch === epoch && Number.isSafeInteger(value2.expiresAtMs);
}
function object(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function beforeDeadline(promise, signal) {
  if (signal.aborted) return Promise.reject(new ApplyCoordinationError("YKP-COORD-002"));
  return new Promise((resolve3, reject) => {
    const aborted = () => reject(new ApplyCoordinationError("YKP-COORD-002"));
    signal.addEventListener("abort", aborted, { once: true });
    promise.then((value2) => {
      signal.removeEventListener("abort", aborted);
      resolve3(value2);
    }, (error) => {
      signal.removeEventListener("abort", aborted);
      reject(error);
    });
  });
}
async function bounded4(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) throw new ApplyCoordinationError("YKP-COORD-001");
  const chunks = [];
  let length = 0;
  try {
    for (; ; ) {
      const { done, value: value2 } = await beforeDeadline(reader.read(), signal);
      if (done) break;
      if (!(value2 instanceof Uint8Array) || (length += value2.byteLength) > MAX_BODY) {
        await reader.cancel();
        throw new ApplyCoordinationError("YKP-COORD-001");
      }
      chunks.push(value2);
    }
  } catch (error) {
    if (error instanceof ApplyCoordinationError) throw error;
    throw new ApplyCoordinationError("YKP-COORD-002");
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text3;
  try {
    text3 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ApplyCoordinationError("YKP-COORD-001");
  }
  let parsed;
  try {
    parsed = JSON.parse(text3);
  } catch {
    throw new ApplyCoordinationError("YKP-COORD-001");
  }
  if (canonical(parsed) !== text3) throw new ApplyCoordinationError("YKP-COORD-001");
  return parsed;
}
function createApplyCoordinationHttpStore(options) {
  let base;
  try {
    base = new URL(options?.baseUri);
  } catch {
    throw new TypeError("invalid coordination configuration");
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/" || options.baseUri.endsWith("/") || !Number.isSafeInteger(options.epoch) || options.epoch < 1 || !Number.isSafeInteger(options.deadlineMs) || options.deadlineMs < 1 || options.deadlineMs > 5e3 || typeof options.authenticate !== "function") throw new TypeError("invalid coordination configuration");
  const fetcher = options.fetch ?? globalThis.fetch;
  async function call(path, body) {
    const target = `${options.baseUri}${path}`, raw = canonical(body);
    if (Buffer.byteLength(raw) > MAX_BODY) throw new ApplyCoordinationError("YKP-COORD-001");
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), options.deadlineMs);
    try {
      let auth;
      try {
        auth = await beforeDeadline(options.authenticate({ method: "POST", targetUri: target, signal: controller.signal }), controller.signal);
      } catch {
        throw new ApplyCoordinationError("YKP-COORD-002");
      }
      if (typeof auth?.credential !== "string" || auth.credential.length < 1 || auth.credential.length > 8192 || typeof auth.proof !== "string" || auth.proof.length < 1 || auth.proof.length > 16384) throw new ApplyCoordinationError("YKP-COORD-001");
      let response;
      try {
        response = await fetcher(target, { method: "POST", redirect: "manual", signal: controller.signal, headers: { authorization: `DPoP ${auth.credential}`, dpop: auth.proof, "content-type": MEDIA }, body: raw });
      } catch {
        throw new ApplyCoordinationError("YKP-COORD-002");
      }
      if (response.status >= 300 && response.status < 400) throw new ApplyCoordinationError("YKP-COORD-002");
      if (response.headers.get("content-type")?.split(";").map((part) => part.trim()).join(";") !== MEDIA) throw new ApplyCoordinationError("YKP-COORD-001");
      const parsed = await bounded4(response, controller.signal);
      if (!object(parsed)) throw new ApplyCoordinationError("YKP-COORD-001");
      if (!response.ok) {
        const code = parsed.code;
        throw new ApplyCoordinationError(code === "conflict" || code === "replayed" || code === "stale_fence" ? "YKP-COORD-003" : code === "temporarily_unavailable" ? "YKP-COORD-002" : "YKP-COORD-001");
      }
      if (parsed.specversion !== "1" || typeof parsed.outcome !== "string") throw new ApplyCoordinationError("YKP-COORD-001");
      return parsed;
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    consumeNonce: async (request) => {
      if (!validRequest(request, options.epoch)) throw new ApplyCoordinationError("YKP-COORD-001");
      const result2 = await call("/coordination-primitives/v1/nonces:consume", { epoch: request.epoch, expires_at: expiry(request.expiresAtMs), scope_digest: request.keyDigest, value_digest: request.valueDigest });
      if (result2.outcome !== "consumed" && result2.outcome !== "replayed") throw new ApplyCoordinationError("YKP-COORD-001");
      return result2.outcome;
    },
    acquireLease: async (request) => {
      if (!validRequest(request, options.epoch)) throw new ApplyCoordinationError("YKP-COORD-001");
      let result2;
      try {
        result2 = await call("/coordination-primitives/v1/leases:acquire", { epoch: request.epoch, expires_at: expiry(request.expiresAtMs), holder_digest: request.holderDigest, scope_digest: request.keyDigest });
      } catch (error) {
        if (error instanceof ApplyCoordinationError && error.code === "YKP-COORD-003") return null;
        throw error;
      }
      if (result2.outcome !== "acquired" || typeof result2.lease_capability !== "string" || result2.lease_capability.length < 1 || result2.lease_capability.length > MAX_CAPABILITY || !Number.isSafeInteger(result2.fencing_token) || Number(result2.fencing_token) < 1) throw new ApplyCoordinationError("YKP-COORD-001");
      let capability = result2.lease_capability, fencingToken = Number(result2.fencing_token);
      const lease = { get fencingToken() {
        return fencingToken;
      }, renew: async (expiresAtMs) => {
        try {
          const renewed = await call("/coordination-primitives/v1/leases:renew", { expires_at: expiry(expiresAtMs), lease_capability: capability });
          if (renewed.outcome !== "renewed" || typeof renewed.lease_capability !== "string" || renewed.lease_capability.length < 1 || renewed.lease_capability.length > MAX_CAPABILITY || !Number.isSafeInteger(renewed.fencing_token) || Number(renewed.fencing_token) <= fencingToken) throw new ApplyCoordinationError("YKP-COORD-001");
          capability = renewed.lease_capability;
          fencingToken = Number(renewed.fencing_token);
          return true;
        } catch (error) {
          if (error instanceof ApplyCoordinationError && error.code === "YKP-COORD-003") return false;
          throw error;
        }
      }, valid: async () => {
        const inspected = await call("/coordination-primitives/v1/leases:inspect", { lease_capability: capability });
        if (!["valid", "expired", "released", "stale"].includes(String(inspected.outcome))) throw new ApplyCoordinationError("YKP-COORD-001");
        return inspected.outcome === "valid";
      }, release: async () => {
        try {
          const released = await call("/coordination-primitives/v1/leases:release", { lease_capability: capability });
          return released.outcome === "released";
        } catch (error) {
          if (error instanceof ApplyCoordinationError && error.code === "YKP-COORD-003") return false;
          throw error;
        }
      } };
      return lease;
    }
  };
}

// src/github-rate-ledger.ts
function finiteNonnegative(value2) {
  return Number.isFinite(value2) && Number.isSafeInteger(value2) && value2 >= 0;
}
function createGitHubRateLedger(options = {}) {
  const restReserve = options.restReserve ?? 500, graphqlReserve = options.graphqlReserve ?? 500, maxRestRequests = options.maxRestRequests ?? 32, maxGraphqlRequests = options.maxGraphqlRequests ?? 1, maxGraphqlPoints = options.maxGraphqlPoints ?? 100;
  if (![restReserve, graphqlReserve, maxRestRequests, maxGraphqlRequests, maxGraphqlPoints].every(finiteNonnegative) || restReserve < 500 || graphqlReserve < 500 || maxRestRequests > 64 || maxGraphqlRequests > 2 || maxGraphqlPoints > 500) throw new TypeError("invalid rate ledger options");
  let restRemaining = options.restRemaining ?? Number.POSITIVE_INFINITY, graphqlRemaining = options.graphqlRemaining ?? Number.POSITIVE_INFINITY, restRequests = 0, graphqlRequests = 0, graphqlPoints = 0;
  if (!(finiteNonnegative(restRemaining) || restRemaining === Number.POSITIVE_INFINITY) || !(finiteNonnegative(graphqlRemaining) || graphqlRemaining === Number.POSITIVE_INFINITY)) throw new TypeError("invalid provider rate state");
  return {
    reserve: (resource, cost = 1) => {
      if (!finiteNonnegative(cost) || cost < 1) return false;
      if (resource === "rest") {
        if (restRequests >= maxRestRequests || restRemaining - cost < restReserve) return false;
        restRequests++;
        if (Number.isFinite(restRemaining)) restRemaining -= cost;
        return true;
      }
      if (resource !== "graphql" || graphqlRequests >= maxGraphqlRequests || graphqlPoints + cost > maxGraphqlPoints || graphqlRemaining - cost < graphqlReserve) return false;
      graphqlRequests++;
      graphqlPoints += cost;
      if (Number.isFinite(graphqlRemaining)) graphqlRemaining -= cost;
      return true;
    },
    observe: (resource, remaining) => {
      if (!finiteNonnegative(remaining)) return;
      if (resource === "rest") restRemaining = Math.min(restRemaining, remaining);
      else if (resource === "graphql") graphqlRemaining = Math.min(graphqlRemaining, remaining);
    },
    snapshot: () => ({ restRequests, graphqlRequests, graphqlPoints, restRemaining, graphqlRemaining })
  };
}

// src/github-rest-snapshot.ts
import { createHash as createHash4 } from "node:crypto";

// src/github-transport.ts
var DOCUMENTS = {
  resolve_scope: `query YukhResolveScope($ownerLogin:String!,$repositoryName:String!,$projectNumber:Int!,$issueNumber:Int!){viewer{login}repository(owner:$ownerLogin,name:$repositoryName){id issue(number:$issueNumber){id number body projectItems(first:100){nodes{id project{id number}}pageInfo{hasNextPage}}}}repositoryOwner(login:$ownerLogin){... on User{projectV2(number:$projectNumber){id number}}... on Organization{projectV2(number:$projectNumber){id number}}}}`,
  read_project_fields: `query YukhReadProjectFields($ownerLogin:String!,$projectNumber:Int!,$first:Int!,$cursor:String){repositoryOwner(login:$ownerLogin){... on User{projectV2(number:$projectNumber){id fields(first:$first,after:$cursor){nodes{... on ProjectV2Field{id name dataType}... on ProjectV2SingleSelectField{id name dataType options{id name}}... on ProjectV2IterationField{id name dataType configuration{iterations{id title}completedIterations{id title}}}}pageInfo{hasNextPage endCursor}}}}... on Organization{projectV2(number:$projectNumber){id fields(first:$first,after:$cursor){nodes{... on ProjectV2Field{id name dataType}... on ProjectV2SingleSelectField{id name dataType options{id name}}... on ProjectV2IterationField{id name dataType configuration{iterations{id title}completedIterations{id title}}}}pageInfo{hasNextPage endCursor}}}}}}`,
  read_project_item: `query YukhReadProjectItem($ownerLogin:String!,$repositoryName:String!,$issueNumber:Int!,$first:Int!,$cursor:String){repository(owner:$ownerLogin,name:$repositoryName){issue(number:$issueNumber){id projectItems(first:100){nodes{id project{id number}fieldValues(first:$first,after:$cursor){nodes{... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldNumberValue{number field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldDateValue{date field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldIterationValue{title field{... on ProjectV2FieldCommon{name}}}}pageInfo{hasNextPage endCursor}}}pageInfo{hasNextPage}}}}}`,
  read_issue_relationships: `query YukhReadIssueRelationships($ownerLogin:String!,$repositoryName:String!,$issueNumber:Int!,$first:Int!,$cursor:String){repository(owner:$ownerLogin,name:$repositoryName){id issue(number:$issueNumber){id number parent{number repository{id}}subIssues(first:$first,after:$cursor){nodes{number repository{id}}pageInfo{hasNextPage endCursor}}blockedBy(first:$first,after:$cursor){nodes{number repository{id}}pageInfo{hasNextPage endCursor}}blocking(first:$first,after:$cursor){nodes{number repository{id}}pageInfo{hasNextPage endCursor}}}}}`
};
var GITHUB_READ_QUERY_DOCUMENTS = Object.freeze({ ...DOCUMENTS });
var GitHubTransportError = class extends Error {
  constructor(code) {
    super("GitHub read transport failed");
    this.code = code;
    this.name = "GitHubTransportError";
  }
  code;
};

// src/github-rest-snapshot.ts
var API = "https://api.github.com";
var GRAPHQL = `${API}/graphql`;
var API_VERSION = "2026-03-10";
var RELATIONSHIP_QUERY = `query YukhRelationshipSnapshot($ids:[ID!]!){nodes(ids:$ids){... on Issue{id number repository{id} parent{number repository{id}} subIssues(first:100){nodes{number repository{id}}pageInfo{hasNextPage}} blockedBy(first:100){nodes{number repository{id}}pageInfo{hasNextPage}} blocking(first:100){nodes{number repository{id}}pageInfo{hasNextPage}}}} rateLimit{cost remaining resetAt}}`;
var RELATIONSHIP_QUERY_ESTIMATED_COST = 100;
function rec(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function array(v) {
  if (!Array.isArray(v) || !v.every(rec)) throw new GitHubTransportError("YKP-REST-001");
  return v;
}
function text(v, max = 512) {
  if (typeof v !== "string" || v.length === 0 || [...v].length > max || /[\u0000-\u001f\u007f]/u.test(v)) throw new GitHubTransportError("YKP-REST-001");
  return v;
}
function integer(v) {
  if (!Number.isSafeInteger(v) || v <= 0) throw new GitHubTransportError("YKP-REST-001");
  return v;
}
function rawName(v) {
  if (typeof v === "string") return text(v, 128);
  if (rec(v) && rec(v.name) && typeof v.name.raw === "string") return text(v.name.raw, 128);
  if (rec(v) && typeof v.raw === "string") return text(v.raw, 128);
  throw new GitHubTransportError("YKP-REST-001");
}
function value(v) {
  if (v === null) return null;
  if (typeof v === "string" || typeof v === "number" && Number.isFinite(v)) return v;
  if (rec(v)) {
    if (rec(v.name) && typeof v.name.raw === "string") return v.name.raw;
    if (typeof v.raw === "string") return v.raw;
  }
  return null;
}
function kind(v) {
  const map = { text: "text", number: "number", date: "date", single_select: "single_select", iteration: "iteration" };
  const out = map[String(v)];
  if (!out) throw new GitHubTransportError("YKP-REST-001");
  return out;
}
function nextLink(value2) {
  if (!value2) return null;
  for (const part of value2.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/u);
    if (match) return match[1] ?? null;
  }
  return null;
}
function normalizedPath(value2) {
  if (value2.startsWith("/")) return value2;
  let parsed;
  try {
    parsed = new URL(value2);
  } catch {
    throw new GitHubTransportError("YKP-CAPABILITY-001");
  }
  if (parsed.origin !== API || parsed.username || parsed.password || parsed.hash) throw new GitHubTransportError("YKP-CAPABILITY-001");
  return `${parsed.pathname}${parsed.search}`;
}
function issueNumberFromUrl(v) {
  if (typeof v !== "string") return void 0;
  const match = v.match(/\/issues\/(\d+)$/u);
  return match ? Number(match[1]) : void 0;
}
function relationshipSummary(content) {
  const summary = rec(content.issue_dependencies_summary) ? content.issue_dependencies_summary : {};
  const blockedBy = Number(summary.total_blocked_by ?? summary.blocked_by ?? 0), blocking = Number(summary.total_blocking ?? summary.blocking ?? 0);
  if (!Number.isSafeInteger(blockedBy) || blockedBy < 0 || !Number.isSafeInteger(blocking) || blocking < 0) throw new GitHubTransportError("YKP-REST-001");
  return { blockedBy, blocking };
}
var RestSnapshotClient = class {
  constructor(options) {
    this.options = options;
    if (typeof options.token !== "string" || !options.token || /[\u0000-\u001f\u007f]/u.test(options.token)) throw new TypeError("invalid credential");
    this.request = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
    this.ttl = options.cacheTtlMs ?? 3e5;
    this.ledger = options.rateLedger ?? createGitHubRateLedger({ graphqlRemaining: options.graphqlRemaining, restReserve: options.restReserve, graphqlReserve: options.graphqlReserve, maxRestRequests: options.maxRestRequests, maxGraphqlRequests: options.maxGraphqlRequests });
  }
  options;
  request;
  now;
  ttl;
  cache = /* @__PURE__ */ new Map();
  flights = /* @__PURE__ */ new Map();
  generations = /* @__PURE__ */ new Map();
  ledger;
  bytes = 0;
  evidence = { restRequests: 0, graphqlRequests: 0, restCacheHits: 0, conditionalRequests: 0, coalescedRequests: 0 };
  headers(etag) {
    return { accept: "application/vnd.github+json", authorization: `Bearer ${this.options.token}`, "x-github-api-version": API_VERSION, ...etag ? { "if-none-match": etag } : {} };
  }
  classify(response) {
    if (response.status === 401) throw new GitHubTransportError("YKP-GH-READ-002");
    if (response.status === 403) throw new GitHubTransportError(response.headers.get("x-ratelimit-remaining") === "0" ? "YKP-RATE-001" : "YKP-GH-READ-003");
    if (response.status === 429) throw new GitHubTransportError("YKP-RATE-001");
    if ([502, 503, 504].includes(response.status)) throw new GitHubTransportError("YKP-GH-READ-004");
    throw new GitHubTransportError("YKP-REST-001");
  }
  updateRate(resource, headers) {
    const value2 = headers.get("x-ratelimit-remaining");
    if (value2 !== null && /^\d+$/u.test(value2)) this.ledger.observe(resource, Number(value2));
  }
  invalidate(input3, effect) {
    if (!/^[A-Za-z0-9-]{1,39}$/u.test(input3.ownerLogin) || !Number.isSafeInteger(input3.projectNumber) || input3.projectNumber < 1) throw new GitHubTransportError("YKP-GH-READ-001");
    const prefix = new RegExp(`^/(?:orgs|users)/${input3.ownerLogin}/projectsV2/${input3.projectNumber}/(?:${effect === "schema" ? "fields|items" : "items"})\\?`, `u`), keys2 = /* @__PURE__ */ new Set([...this.cache.keys(), ...this.flights.keys()]);
    for (const key of keys2) if (prefix.test(key)) {
      this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
      this.cache.delete(key);
      this.flights.delete(key);
    }
  }
  async get(path) {
    if (!/^\/(repos|users|orgs)\/[A-Za-z0-9_.\/-]+(?:\?[A-Za-z0-9_.,=&-]+)?$/u.test(path)) throw new GitHubTransportError("YKP-CAPABILITY-001");
    const key = path, cached = this.cache.get(key), current = this.now();
    if (cached && cached.expires > current) {
      this.evidence.restCacheHits++;
      return { body: cached.body, bytes: cached.bytes, headers: new Headers(cached.link ? { link: cached.link } : {}) };
    }
    const existing = this.flights.get(key);
    if (existing) {
      this.evidence.coalescedRequests++;
      return existing;
    }
    const generation = this.generations.get(key) ?? 0, task = (async () => {
      if (!this.ledger.reserve("rest")) throw new GitHubTransportError("YKP-RATE-001");
      this.evidence.restRequests++;
      if (cached?.etag) this.evidence.conditionalRequests++;
      let response;
      try {
        response = await this.request(`${API}${path}`, { method: "GET", redirect: "manual", headers: this.headers(cached?.etag) });
      } catch {
        throw new GitHubTransportError("YKP-GH-READ-004");
      }
      this.updateRate("rest", response.headers);
      if (response.status === 304 && cached) {
        const refreshed = { ...cached, expires: current + this.ttl };
        if ((this.generations.get(key) ?? 0) === generation) this.cache.set(key, refreshed);
        return { body: refreshed.body, bytes: 0, headers: new Headers(refreshed.link ? { link: refreshed.link } : {}) };
      }
      if (response.status >= 300 && response.status < 400 || !response.ok) this.classify(response);
      if (!response.headers.get("content-type")?.toLowerCase().includes("json")) throw new GitHubTransportError("YKP-REST-001");
      const raw = new Uint8Array(await response.arrayBuffer());
      this.bytes += raw.byteLength;
      if (raw.byteLength > 8 * 1024 * 1024 || this.bytes > 64 * 1024 * 1024) throw new GitHubTransportError("YKP-GH-READ-005");
      let body;
      try {
        body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
      } catch {
        throw new GitHubTransportError("YKP-REST-001");
      }
      if ((this.generations.get(key) ?? 0) === generation) this.cache.set(key, { body, bytes: raw.byteLength, etag: response.headers.get("etag") ?? void 0, link: response.headers.get("link") ?? void 0, expires: current + this.ttl });
      return { body, bytes: raw.byteLength, headers: response.headers };
    })();
    this.flights.set(key, task);
    try {
      return await task;
    } finally {
      this.flights.delete(key);
    }
  }
  async list(path) {
    const nodes = [];
    let bytes = 0, next = path;
    for (let page = 0; next && page < 20; page++) {
      const response = await this.get(normalizedPath(next));
      nodes.push(...array(response.body));
      bytes += response.bytes;
      if (nodes.length > 1e4) throw new GitHubTransportError("YKP-GH-READ-005");
      next = nextLink(response.headers.get("link"));
    }
    if (next) throw new GitHubTransportError("YKP-GH-READ-005");
    return { nodes, bytes };
  }
  async relationships(ids) {
    const result2 = /* @__PURE__ */ new Map();
    if (ids.length === 0) return result2;
    if (ids.length > 100) throw new GitHubTransportError("YKP-GH-READ-005");
    if (this.options.graphqlRemaining === 0 && !this.options.rateLedger) return result2;
    if (!this.ledger.reserve("graphql", RELATIONSHIP_QUERY_ESTIMATED_COST)) throw new GitHubTransportError("YKP-RATE-001");
    this.evidence.graphqlRequests++;
    let response;
    try {
      response = await this.request(GRAPHQL, { method: "POST", redirect: "manual", headers: { accept: "application/vnd.github+json", "content-type": "application/json", authorization: `Bearer ${this.options.token}`, "x-github-api-version": "2022-11-28" }, body: JSON.stringify({ query: RELATIONSHIP_QUERY, variables: { ids } }) });
    } catch {
      throw new GitHubTransportError("YKP-GH-READ-004");
    }
    this.updateRate("graphql", response.headers);
    if (!response.ok) this.classify(response);
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new GitHubTransportError("YKP-REST-001");
    }
    if (!rec(payload) || Array.isArray(payload.errors) || !rec(payload.data) || !Array.isArray(payload.data.nodes) || !rec(payload.data.rateLimit)) throw new GitHubTransportError("YKP-REST-001");
    this.ledger.observe("graphql", Number(payload.data.rateLimit.remaining));
    for (const node of payload.data.nodes) {
      if (!rec(node)) throw new GitHubTransportError("YKP-REST-001");
      const connections = ["subIssues", "blockedBy", "blocking"].map((name) => {
        const c = node[name];
        if (!rec(c) || !Array.isArray(c.nodes) || !rec(c.pageInfo) || c.pageInfo.hasNextPage === true) throw new GitHubTransportError("YKP-GH-READ-005");
        return c.nodes.map((v) => {
          if (!rec(v)) throw new GitHubTransportError("YKP-REST-001");
          return integer(v.number);
        });
      });
      result2.set(text(node.id), { number: integer(node.number), ...rec(node.parent) ? { parent: integer(node.parent.number) } : {}, blockedBy: connections[1], blocking: connections[2] });
    }
    return result2;
  }
};
function subject(token) {
  return `github-token:${createHash4("sha256").update(token).digest("hex")}`;
}
function fieldOptions(field) {
  if (!Array.isArray(field.options)) return [];
  return field.options.map((option2) => {
    if (!rec(option2)) throw new GitHubTransportError("YKP-REST-001");
    return { id: text(option2.id), name: rawName(option2.name) };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
function itemValues(item) {
  const out = {};
  for (const field of array(item.fields ?? [])) {
    const name = text(field.name, 128);
    if (Object.hasOwn(out, name)) throw new GitHubTransportError("YKP-REST-001");
    out[name] = value(field.value);
  }
  return out;
}
function nativeIssueFields(content) {
  const out = {};
  if (!Array.isArray(content.issue_field_values)) return out;
  for (const entry of content.issue_field_values) {
    if (!rec(entry) || typeof entry.issue_field_name !== "string") throw new GitHubTransportError("YKP-REST-001");
    const observed = entry.single_select_option;
    if (rec(observed) && typeof observed.name === "string") out[entry.issue_field_name] = observed.name;
    else if (typeof entry.value === "string" || typeof entry.value === "number") out[entry.issue_field_name] = entry.value;
  }
  return out;
}
function snapshotInvalidationForMutation(kind2) {
  return kind2 === "create_project_field" || kind2 === "update_project_field_options" ? "schema" : "item";
}
async function readWithClient(input3, options, client) {
  const numbers = [...new Set(input3.issueNumbers)].sort((a, b) => a - b);
  if (!/^[A-Za-z0-9-]{1,39}$/u.test(input3.ownerLogin) || !/^[A-Za-z0-9_.-]{1,100}$/u.test(input3.repositoryName) || !Number.isSafeInteger(input3.projectNumber) || input3.projectNumber < 1 || numbers.length < 1 || numbers.length > 100 || numbers.some((n) => !Number.isSafeInteger(n) || n < 1)) throw new GitHubTransportError("YKP-GH-READ-001");
  const repoPage = await client.get(`/repos/${input3.ownerLogin}/${input3.repositoryName}`), repo = repoPage.body;
  if (!rec(repo) || !rec(repo.owner)) throw new GitHubTransportError("YKP-REST-001");
  const ownerKind = repo.owner.type === "Organization" ? "orgs" : repo.owner.type === "User" ? "users" : (() => {
    throw new GitHubTransportError("YKP-CAPABILITY-001");
  })();
  const projectPage = await client.get(`/${ownerKind}/${input3.ownerLogin}/projectsV2/${input3.projectNumber}`), project = projectPage.body;
  if (!rec(project) || integer(project.number) !== input3.projectNumber) throw new GitHubTransportError("YKP-SNAPSHOT-001");
  const projectRef = text(project.node_id);
  const fieldsPage = await client.list(`/${ownerKind}/${input3.ownerLogin}/projectsV2/${input3.projectNumber}/fields?per_page=100`);
  const fields = fieldsPage.nodes.filter((f) => ["text", "number", "date", "single_select", "iteration"].includes(String(f.data_type))).map((f) => ({ id: String(integer(f.id)), name: text(f.name, 128), kind: kind(f.data_type), options: fieldOptions(f) }));
  const fieldSelector = fields.map((f) => f.id).join(",");
  if (fieldSelector.length > 4096) throw new GitHubTransportError("YKP-GH-READ-005");
  const itemsPage = await client.list(`/${ownerKind}/${input3.ownerLogin}/projectsV2/${input3.projectNumber}/items?per_page=100${fieldSelector ? `&fields=${fieldSelector}` : ""}`);
  const wanted = new Set(numbers), selected = /* @__PURE__ */ new Map();
  for (const item of itemsPage.nodes) {
    if (!rec(item.content) || !rec(item.content.repository) || item.content.repository.full_name !== `${input3.ownerLogin}/${input3.repositoryName}`) continue;
    const n = item.content.number;
    if (Number.isSafeInteger(n) && wanted.has(n)) {
      if (selected.has(n)) throw new GitHubTransportError("YKP-SNAPSHOT-001");
      selected.set(n, item);
    }
  }
  if (selected.size !== numbers.length) throw new GitHubTransportError("YKP-SNAPSHOT-001");
  const relationshipIds = numbers.flatMap((n) => {
    const content = selected.get(n).content, summary = relationshipSummary(content);
    return summary.blockedBy + summary.blocking > 0 ? [text(content.node_id)] : [];
  });
  const relationships = await client.relationships(relationshipIds), issues = /* @__PURE__ */ new Map();
  for (const n of numbers) {
    const item = selected.get(n), content = item.content, relation = relationships.get(text(content.node_id));
    const parent = relation?.parent ?? issueNumberFromUrl(content.parent_issue_url), labels = Array.isArray(content.labels) ? content.labels.map((label) => {
      if (!rec(label)) throw new GitHubTransportError("YKP-REST-001");
      return text(label.name, 128);
    }).sort() : [], milestone = rec(content.milestone) && typeof content.milestone.title === "string" ? text(content.milestone.title, 128) : void 0, issueType = rec(content.type) && typeof content.type.name === "string" ? text(content.type.name, 128) : void 0, summary = relationshipSummary(content), relationshipsComplete = Boolean(relation) || summary.blockedBy === 0 && summary.blocking === 0;
    issues.set(n, { issueRef: text(content.node_id), issueDatabaseId: integer(content.id), body: typeof content.body === "string" ? content.body : "", itemRef: text(item.node_id), fingerprint: text(item.node_id), values: itemValues(item), ...issueType ? { issueType } : {}, labels, ...milestone ? { milestone } : {}, issueFields: nativeIssueFields(content), ...parent ? { parent } : {}, blockedBy: relation?.blockedBy ?? [], blocking: relation?.blocking ?? [], relationshipsComplete });
  }
  return { subjectRef: subject(options.token), ownerLogin: input3.ownerLogin, repositoryName: input3.repositoryName, projectNumber: input3.projectNumber, repositoryRef: text(repo.node_id), projectRef, fields: fields.sort((a, b) => a.id.localeCompare(b.id)), issues, evidence: { ...client.evidence } };
}
function createRestProjectSnapshotReader(options) {
  const client = new RestSnapshotClient(options);
  return { read: (input3) => readWithClient(input3, options, client), invalidate: (input3, effect) => client.invalidate(input3, effect) };
}

// src/github-mutation-transport.ts
var ENDPOINT = "https://api.github.com/graphql";
var GITHUB_MUTATION_DOCUMENTS = Object.freeze({
  create_project_field: `mutation YukhCreateProjectField($input:CreateProjectV2FieldInput!){createProjectV2Field(input:$input){clientMutationId projectV2Field{id}}}`,
  update_project_field_options: `mutation YukhUpdateProjectFieldOptions($input:UpdateProjectV2FieldInput!){updateProjectV2Field(input:$input){clientMutationId projectV2Field{id}}}`,
  update_project_item_field_value: `mutation YukhUpdateProjectItemFieldValue($input:UpdateProjectV2ItemFieldValueInput!){updateProjectV2ItemFieldValue(input:$input){clientMutationId projectV2Item{id}}}`,
  add_sub_issue: `mutation YukhAddSubIssue($input:AddSubIssueInput!){addSubIssue(input:$input){clientMutationId issue{id} subIssue{id}}}`,
  add_blocked_by: `mutation YukhAddBlockedBy($input:AddBlockedByInput!){addBlockedBy(input:$input){clientMutationId issue{id} blockingIssue{id}}}`
});
var GITHUB_MUTATION_ESTIMATED_COSTS = Object.freeze({ create_project_field: 100, update_project_field_options: 100, update_project_item_field_value: 100, add_sub_issue: 100, add_blocked_by: 100 });
var GitHubMutationTransportError = class extends Error {
  constructor(code) {
    super("GitHub mutation transport failed");
    this.code = code;
    this.name = "GitHubMutationTransportError";
  }
  code;
};
function rec2(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function text2(v, max = 256) {
  return typeof v === "string" && [...v].length > 0 && [...v].length <= max && !/[\u0000-\u001f\u007f]/u.test(v);
}
function keys(v, expected) {
  return Object.keys(v).sort().join("\0") === [...expected].sort().join("\0");
}
function id(v) {
  return text2(v, 256);
}
function option(v, withId) {
  if (!rec2(v)) return false;
  const expected = withId ? ["id", "name", "color", "description"] : ["name", "color", "description"];
  return keys(v, expected) && (!withId || id(v.id)) && text2(v.name, 128) && ["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"].includes(String(v.color)) && typeof v.description === "string" && [...v.description].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(v.description);
}
function permissionsExact(kind2, p, approvedKinds) {
  const allowed = /* @__PURE__ */ new Set(["create_project_field", "update_project_field_options", "update_project_item_field_value", "add_sub_issue", "add_blocked_by"]), kinds = new Set(approvedKinds);
  if (kinds.size !== approvedKinds.length || kinds.size < 1 || [...kinds].some((value2) => !allowed.has(value2)) || !kinds.has(kind2)) return false;
  const needsProjects = [...kinds].some((value2) => value2 === "create_project_field" || value2 === "update_project_field_options" || value2 === "update_project_item_field_value"), needsIssues = [...kinds].some((value2) => value2 === "add_sub_issue" || value2 === "add_blocked_by"), approved = new Set(p.approvedExtraPermissions ?? []);
  return p.projects === (needsProjects ? "write" : "none") && p.issues === (needsIssues ? "write" : "none") && p.extraPermissions.length === approved.size && p.extraPermissions.every((value2) => approved.has(value2));
}
function input2(kind2, v, clientMutationId) {
  if (!rec2(v) || v.kind !== kind2 || !/^[a-f0-9]{64}$/u.test(clientMutationId)) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
  if (kind2 === "create_project_field" && v.kind === kind2) {
    if (!keys(v, ["kind", "projectId", "dataType", "name", ...v.options === void 0 ? [] : ["options"]]) || !id(v.projectId) || !text2(v.name, 128) || !["TEXT", "SINGLE_SELECT", "NUMBER", "DATE"].includes(v.dataType) || v.dataType === "SINGLE_SELECT" !== Array.isArray(v.options) || v.options?.length === 0 || v.options && (!v.options.every((x) => option(x, false)) || v.options.length > 256)) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { projectId: v.projectId, dataType: v.dataType, name: v.name, ...v.options ? { singleSelectOptions: v.options } : {}, clientMutationId }, expected: {} };
  }
  if (kind2 === "update_project_field_options" && v.kind === kind2) {
    if (!keys(v, ["kind", "fieldId", "observedOptions", "newOption"]) || !id(v.fieldId) || !Array.isArray(v.observedOptions) || v.observedOptions.length >= 256 || !v.observedOptions.every((x) => option(x, true)) || new Set(v.observedOptions.map((x) => x.id)).size !== v.observedOptions.length || !option(v.newOption, false) || v.newOption.color !== "GRAY" || v.newOption.description !== "" || v.observedOptions.some((x) => x.name === v.newOption.name)) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { fieldId: v.fieldId, singleSelectOptions: [...v.observedOptions, v.newOption], clientMutationId }, expected: { projectV2Field: v.fieldId } };
  }
  if (kind2 === "update_project_item_field_value" && v.kind === kind2) {
    if (!keys(v, ["kind", "projectId", "itemId", "fieldId", "value"]) || !id(v.projectId) || !id(v.itemId) || !id(v.fieldId) || !rec2(v.value) || Object.keys(v.value).length !== 1) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    const valueRecord = v.value, [k] = Object.keys(valueRecord), x = valueRecord[k];
    if (!(["text", "date", "singleSelectOptionId", "iterationId"].includes(k) && text2(x, 512) || k === "number" && typeof x === "number" && Number.isFinite(x))) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { projectId: v.projectId, itemId: v.itemId, fieldId: v.fieldId, value: v.value, clientMutationId }, expected: { projectV2Item: v.itemId } };
  }
  if (kind2 === "add_sub_issue" && v.kind === kind2) {
    if (!keys(v, ["kind", "parentIssueId", "subIssueId"]) || !id(v.parentIssueId) || !id(v.subIssueId) || v.parentIssueId === v.subIssueId) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { issueId: v.parentIssueId, subIssueId: v.subIssueId, replaceParent: false, clientMutationId }, expected: { issue: v.parentIssueId, subIssue: v.subIssueId } };
  }
  if (kind2 === "add_blocked_by" && v.kind === kind2) {
    if (!keys(v, ["kind", "blockedIssueId", "blockingIssueId"]) || !id(v.blockedIssueId) || !id(v.blockingIssueId) || v.blockedIssueId === v.blockingIssueId) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { issueId: v.blockedIssueId, blockingIssueId: v.blockingIssueId, clientMutationId }, expected: { issue: v.blockedIssueId, blockingIssue: v.blockingIssueId } };
  }
  throw new GitHubMutationTransportError("YKP-GH-WRITE-002");
}
function createGitHubMutationTransport(options) {
  if (!text2(options?.token, 4096) || !Array.isArray(options.approvedKinds)) throw new TypeError("invalid credential");
  const fetcher = options.fetch ?? globalThis.fetch;
  return { execute: async (kind2, variables, clientMutationId) => {
    if (!permissionsExact(kind2, options.permissions, options.approvedKinds)) throw new GitHubMutationTransportError("YKP-GH-WRITE-003");
    const mapped = input2(kind2, variables, clientMutationId), query = GITHUB_MUTATION_DOCUMENTS[kind2];
    if (options.rateLedger && !options.rateLedger.reserve("graphql", GITHUB_MUTATION_ESTIMATED_COSTS[kind2])) throw new GitHubMutationTransportError("YKP-GH-WRITE-008");
    let response;
    try {
      response = await fetcher(ENDPOINT, { method: "POST", redirect: "manual", headers: { accept: "application/vnd.github+json", "content-type": "application/json", authorization: `Bearer ${options.token}`, "x-github-api-version": "2022-11-28" }, body: JSON.stringify({ query, variables: { input: mapped.input } }) });
    } catch {
      throw new GitHubMutationTransportError("YKP-GH-WRITE-004");
    }
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (options.rateLedger && remaining !== null && /^\d+$/u.test(remaining)) options.rateLedger.observe("graphql", Number(remaining));
    if (response.status >= 300 && response.status < 400) throw new GitHubMutationTransportError("YKP-GH-WRITE-005");
    if (response.status === 401) throw new GitHubMutationTransportError("YKP-GH-WRITE-006");
    if (response.status === 403) throw new GitHubMutationTransportError(response.headers.get("x-ratelimit-remaining") === "0" ? "YKP-GH-WRITE-008" : "YKP-GH-WRITE-007");
    if (response.status === 429) throw new GitHubMutationTransportError("YKP-GH-WRITE-008");
    if ([502, 503, 504].includes(response.status)) throw new GitHubMutationTransportError("YKP-GH-WRITE-004");
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new GitHubMutationTransportError("YKP-GH-WRITE-009");
    const raw = new Uint8Array(await response.arrayBuffer());
    if (raw.length > 2 * 1024 * 1024) throw new GitHubMutationTransportError("YKP-GH-WRITE-010");
    let body;
    try {
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
    } catch {
      throw new GitHubMutationTransportError("YKP-GH-WRITE-009");
    }
    if (!rec2(body) || Array.isArray(body.errors) || !rec2(body.data)) throw new GitHubMutationTransportError("YKP-GH-WRITE-011");
    const field = { create_project_field: "createProjectV2Field", update_project_field_options: "updateProjectV2Field", update_project_item_field_value: "updateProjectV2ItemFieldValue", add_sub_issue: "addSubIssue", add_blocked_by: "addBlockedBy" }[kind2], payload = body.data[field];
    if (!rec2(payload) || payload.clientMutationId !== clientMutationId) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
    for (const [name, expected] of Object.entries(mapped.expected)) {
      const node = payload[name];
      if (!rec2(node) || node.id !== expected) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
    }
    if (kind2 === "create_project_field" && (!rec2(payload.projectV2Field) || !id(payload.projectV2Field.id))) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
    return { kind: kind2, clientMutationId, providerAccepted: true };
  } };
}

// src/github-apply-failure.ts
function normalizeGitHubApplyFailure(error) {
  if (error instanceof ApplyPortError) return error;
  if (error instanceof GitHubMutationTransportError) {
    if (error.code === "YKP-GH-WRITE-006") return new ApplyPortError("authentication");
    if (error.code === "YKP-GH-WRITE-007" || error.code === "YKP-GH-WRITE-003") return new ApplyPortError("authorization");
    if (error.code === "YKP-GH-WRITE-008") return new ApplyPortError("deferred_rate_budget");
    if (error.code === "YKP-GH-WRITE-004") return new ApplyPortError("provider");
    return new ApplyPortError("invariant");
  }
  if (error instanceof GitHubTransportError) {
    if (error.code === "YKP-GH-READ-002") return new ApplyPortError("authentication");
    if (error.code === "YKP-GH-READ-003" || error.code === "YKP-CAPABILITY-001") return new ApplyPortError("authorization");
    if (error.code === "YKP-RATE-001" || error.code === "YKP-GH-READ-009") return new ApplyPortError("deferred_rate_budget");
    if (error.code === "YKP-GH-READ-004") return new ApplyPortError("provider");
    return new ApplyPortError("invariant");
  }
  return new ApplyPortError("invariant");
}
export {
  applyActionMain,
  applyCliMain,
  bindApplyCoordination,
  createApplyCoordinationHttpStore,
  createGitHubMutationTransport,
  createGitHubRateLedger,
  createRestProjectSnapshotReader,
  executeControlledPlan,
  normalizeGitHubApplyFailure,
  renderPublicApplyReport,
  runApplyEntrypoint,
  snapshotInvalidationForMutation,
  verifySignedApproval
};
