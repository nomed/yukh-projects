export type GitHubRateResource="rest"|"graphql";
export interface GitHubRateLedgerSnapshot{restRequests:number;graphqlRequests:number;graphqlPoints:number;restRemaining:number;graphqlRemaining:number;deferredResource:GitHubRateResource|null}
export interface GitHubRateLedger{reserve(resource:GitHubRateResource,cost?:number):boolean;observe(resource:GitHubRateResource,remaining:number):void;snapshot():GitHubRateLedgerSnapshot}
export interface GitHubRateLedgerOptions{restRemaining?:number;graphqlRemaining?:number;restReserve?:number;graphqlReserve?:number;maxRestRequests?:number;maxGraphqlRequests?:number;maxGraphqlPoints?:number}

function finiteNonnegative(value:number):boolean{return Number.isFinite(value)&&Number.isSafeInteger(value)&&value>=0;}
export function createGitHubRateLedger(options:GitHubRateLedgerOptions={}):GitHubRateLedger{
 const restReserve=options.restReserve??500,graphqlReserve=options.graphqlReserve??500,maxRestRequests=options.maxRestRequests??32,maxGraphqlRequests=options.maxGraphqlRequests??1,maxGraphqlPoints=options.maxGraphqlPoints??100;
 if(![restReserve,graphqlReserve,maxRestRequests,maxGraphqlRequests,maxGraphqlPoints].every(finiteNonnegative)||restReserve<500||graphqlReserve<500||maxRestRequests>64||maxGraphqlRequests>2||maxGraphqlPoints>500)throw new TypeError("invalid rate ledger options");
 let restRemaining=options.restRemaining??Number.POSITIVE_INFINITY,graphqlRemaining=options.graphqlRemaining??Number.POSITIVE_INFINITY,restRequests=0,graphqlRequests=0,graphqlPoints=0,deferredResource:GitHubRateResource|null=null;
 if(!(finiteNonnegative(restRemaining)||restRemaining===Number.POSITIVE_INFINITY)||!(finiteNonnegative(graphqlRemaining)||graphqlRemaining===Number.POSITIVE_INFINITY))throw new TypeError("invalid provider rate state");
 return{
  reserve:(resource,cost=1)=>{if(!finiteNonnegative(cost)||cost<1)return false;if(resource==="rest"){if(restRequests>=maxRestRequests||restRemaining-cost<restReserve){deferredResource="rest";return false;}restRequests++;if(Number.isFinite(restRemaining))restRemaining-=cost;return true;}if(resource!=="graphql")return false;if(graphqlRequests>=maxGraphqlRequests||graphqlPoints+cost>maxGraphqlPoints||graphqlRemaining-cost<graphqlReserve){deferredResource="graphql";return false;}graphqlRequests++;graphqlPoints+=cost;if(Number.isFinite(graphqlRemaining))graphqlRemaining-=cost;return true;},
  observe:(resource,remaining)=>{if(!finiteNonnegative(remaining))return;if(resource==="rest")restRemaining=Math.min(restRemaining,remaining);else if(resource==="graphql")graphqlRemaining=Math.min(graphqlRemaining,remaining);},
  snapshot:()=>({restRequests,graphqlRequests,graphqlPoints,restRemaining,graphqlRemaining,deferredResource})
 };
}
