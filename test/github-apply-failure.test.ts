import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGitHubApplyFailure } from "../src/github-apply-failure.js";
import { GitHubMutationTransportError } from "../src/github-mutation-transport.js";
import { GitHubTransportError } from "../src/github-transport.js";

test("normalizes GitHub failures without provider content",()=>{const cases=[[new GitHubMutationTransportError("YKP-GH-WRITE-006"),"authentication"],[new GitHubMutationTransportError("YKP-GH-WRITE-007"),"authorization"],[new GitHubMutationTransportError("YKP-GH-WRITE-008"),"deferred_rate_budget"],[new GitHubMutationTransportError("YKP-GH-WRITE-004"),"provider"],[new GitHubTransportError("YKP-REST-001"),"invariant"],[new Error("private token provider body"),"invariant"]] as const;for(const [input,expected] of cases){const output=normalizeGitHubApplyFailure(input);assert.equal(output.failureClass,expected);assert.doesNotMatch(String(output),/private|token|provider body/u);}});
