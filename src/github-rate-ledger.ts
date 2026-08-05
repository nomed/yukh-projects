export type GitHubRateResource="rest"|"graphql";
export interface GitHubRateRequest{resource:GitHubRateResource;cost:number}
export interface GitHubRateLedgerSnapshot{restRequests:number;graphqlRequests:number;graphqlPoints:number;restRemaining:number;graphqlRemaining:number;deferredResource:GitHubRateResource|null}
export interface GitHubRateLedger{admit(requests:readonly GitHubRateRequest[]):boolean;reserve(resource:GitHubRateResource,cost?:number):boolean;observe(resource:GitHubRateResource,remaining:number):void;snapshot():GitHubRateLedgerSnapshot}
export interface GitHubRateLedgerOptions{restRemaining?:number;graphqlRemaining?:number;restReserve?:number;graphqlReserve?:number;maxRestRequests?:number;maxGraphqlRequests?:number;maxGraphqlPoints?:number}

function finiteNonnegative(value:number):boolean{return Number.isFinite(value)&&Number.isSafeInteger(value)&&value>=0;}
export function createGitHubRateLedger(options:GitHubRateLedgerOptions={}):GitHubRateLedger{
 const restReserve=options.restReserve??500,graphqlReserve=options.graphqlReserve??500,maxRestRequests=options.maxRestRequests??32,maxGraphqlRequests=options.maxGraphqlRequests??1,maxGraphqlPoints=options.maxGraphqlPoints??100;
 if(![restReserve,graphqlReserve,maxRestRequests,maxGraphqlRequests,maxGraphqlPoints].every(finiteNonnegative)||restReserve<500||graphqlReserve<500||maxRestRequests>64||maxGraphqlRequests>4||maxGraphqlPoints>500)throw new TypeError("invalid rate ledger options");
 let restRemaining=options.restRemaining??Number.POSITIVE_INFINITY,graphqlRemaining=options.graphqlRemaining??Number.POSITIVE_INFINITY,restRequests=0,graphqlRequests=0,graphqlPoints=0,deferredResource:GitHubRateResource|null=null;
 if(!(finiteNonnegative(restRemaining)||restRemaining===Number.POSITIVE_INFINITY)||!(finiteNonnegative(graphqlRemaining)||graphqlRemaining===Number.POSITIVE_INFINITY))throw new TypeError("invalid provider rate state");
 return{
  admit:(requests)=>{let restDemand=0,graphqlDemand=0,graphqlPointDemand=0;for(const request of requests){if(!request||!finiteNonnegative(request.cost)||request.cost<1)return false;if(request.resource==="rest")restDemand+=request.cost;else if(request.resource==="graphql"){graphqlDemand++;graphqlPointDemand+=request.cost;}else return false;}if(restRequests+requests.filter(request=>request.resource==="rest").length>maxRestRequests||restRemaining-restDemand<restReserve){deferredResource="rest";return false;}if(graphqlRequests+graphqlDemand>maxGraphqlRequests||graphqlPoints+graphqlPointDemand>maxGraphqlPoints||graphqlRemaining-graphqlPointDemand<graphqlReserve){deferredResource="graphql";return false;}return true;},
  reserve:(resource,cost=1)=>{if(!finiteNonnegative(cost)||cost<1)return false;if(resource==="rest"){if(restRequests>=maxRestRequests||restRemaining-cost<restReserve){deferredResource="rest";return false;}restRequests++;if(Number.isFinite(restRemaining))restRemaining-=cost;return true;}if(resource!=="graphql")return false;if(graphqlRequests>=maxGraphqlRequests||graphqlPoints+cost>maxGraphqlPoints||graphqlRemaining-cost<graphqlReserve){deferredResource="graphql";return false;}graphqlRequests++;graphqlPoints+=cost;if(Number.isFinite(graphqlRemaining))graphqlRemaining-=cost;return true;},
  observe:(resource,remaining)=>{if(!finiteNonnegative(remaining))return;if(resource==="rest")restRemaining=Math.min(restRemaining,remaining);else if(resource==="graphql")graphqlRemaining=Math.min(graphqlRemaining,remaining);},
  snapshot:()=>({restRequests,graphqlRequests,graphqlPoints,restRemaining,graphqlRemaining,deferredResource})
 };
}
