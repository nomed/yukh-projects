import type { ApplyEntrypointHost } from "./apply-entrypoint.js";
import type { BoundScope } from "./planner.js";
import type { RequestedGitHubScope } from "./github-readonly.js";
import type { DeferredReceiptV1 } from "./deferred-receipt.js";

export interface ApplyHostFactoryInput{requestedScope:RequestedGitHubScope;policySource:string;readToken:string;writeToken:string}
export interface ApplyHostRuntime{scope:BoundScope;host:ApplyEntrypointHost;deferredReceipt?():DeferredReceiptV1}
export interface ApplyHostFactory{create(input:ApplyHostFactoryInput):Promise<ApplyHostRuntime>}
