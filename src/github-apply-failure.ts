import { ApplyPortError } from "./executor.js";
import { GitHubMutationTransportError } from "./github-mutation-transport.js";
import { GitHubTransportError } from "./github-transport.js";

export function normalizeGitHubApplyFailure(error:unknown):ApplyPortError{
 if(error instanceof ApplyPortError)return error;
 if(error instanceof GitHubMutationTransportError){if(error.code==="YKP-GH-WRITE-006")return new ApplyPortError("authentication");if(error.code==="YKP-GH-WRITE-007"||error.code==="YKP-GH-WRITE-003")return new ApplyPortError("authorization");if(error.code==="YKP-GH-WRITE-008")return new ApplyPortError("deferred_rate_budget");if(error.code==="YKP-GH-WRITE-004")return new ApplyPortError("provider");return new ApplyPortError("invariant");}
 if(error instanceof GitHubTransportError){if(error.code==="YKP-GH-READ-002")return new ApplyPortError("authentication");if(error.code==="YKP-GH-READ-003"||error.code==="YKP-CAPABILITY-001")return new ApplyPortError("authorization");if(error.code==="YKP-RATE-001"||error.code==="YKP-GH-READ-009")return new ApplyPortError("deferred_rate_budget");if(error.code==="YKP-GH-READ-004")return new ApplyPortError("provider");return new ApplyPortError("invariant");}
 return new ApplyPortError("invariant");
}
