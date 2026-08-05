export type WorkTypeProviderKind="native_issue_type"|"project_work_type";
export type WorkTypeCode=`YKP-WORKTYPE-${"001"|"002"|"003"|"004"|"005"|"006"|"007"|"008"}`;
export class WorkTypeProviderError extends Error{constructor(readonly code:WorkTypeCode){super("work type provider failed");this.name="WorkTypeProviderError";}}

export interface WorkTypeFieldSnapshot{id:string;name:string;kind:string;options:readonly {id:string;name:string}[]}
export interface WorkTypeSelectionInput{
 projectOwnerKind:"users"|"orgs";
 repositoryOwnerKind:"users"|"orgs";
 desired:string;
 nativeValue?:string;
 projectValue?:string|number|null;
 issueTypes?:readonly {id:string;name:string}[];
 fields:readonly WorkTypeFieldSnapshot[];
 fieldName:string;
}
export type WorkTypeSelection=
 |{provider:"native_issue_type";desired:string;issueTypeId:string;converged:boolean}
 |{provider:"project_work_type";desired:string;field?:WorkTypeFieldSnapshot;optionId?:string;converged:boolean};

function safe(value:unknown,max=128):value is string{return typeof value==="string"&&value.length>0&&[...value].length<=max&&!/[\u0000-\u001f\u007f]/u.test(value);}
export function selectWorkTypeProvider(input:WorkTypeSelectionInput):WorkTypeSelection{
 if(!input||!["users","orgs"].includes(input.projectOwnerKind)||!["users","orgs"].includes(input.repositoryOwnerKind)||!safe(input.desired)||!safe(input.fieldName)||!Array.isArray(input.fields))throw new WorkTypeProviderError("YKP-WORKTYPE-001");
 const projectValue=typeof input.projectValue==="string"?input.projectValue:undefined;
 if(input.nativeValue!==undefined&&projectValue!==undefined&&input.nativeValue!==projectValue)throw new WorkTypeProviderError("YKP-WORKTYPE-003");
 if(input.repositoryOwnerKind==="orgs"){
  const matches=(input.issueTypes??[]).filter(value=>value.name===input.desired);
  if(matches.length!==1||!safe(matches[0]?.id,256))throw new WorkTypeProviderError("YKP-WORKTYPE-002");
  return{provider:"native_issue_type",desired:input.desired,issueTypeId:matches[0]!.id,converged:input.nativeValue===input.desired};
 }
 const fields=input.fields.filter(value=>value.name===input.fieldName);
 if(fields.length>1||fields[0]&&fields[0].kind!=="single_select")throw new WorkTypeProviderError("YKP-WORKTYPE-002");
 const field=fields[0],options=field?.options.filter((value:{id:string;name:string})=>value.name===input.desired)??[];
 if(field&&options.length!==1)throw new WorkTypeProviderError("YKP-WORKTYPE-002");
 return{provider:"project_work_type",desired:input.desired,...(field?{field,optionId:options[0]!.id}:{}),converged:projectValue===input.desired};
}

export function normalizeWorkTypeProviderFailure(error:unknown):WorkTypeProviderError{
 if(error instanceof WorkTypeProviderError)return error;
 const code=typeof error==="object"&&error!==null&&"code" in error?String((error as {code:unknown}).code):"";
 if(code==="YKP-GH-READ-002"||code==="YKP-GH-WRITE-006")return new WorkTypeProviderError("YKP-WORKTYPE-004");
 if(code==="YKP-GH-READ-003"||code==="YKP-CAPABILITY-001"||code==="YKP-GH-WRITE-003"||code==="YKP-GH-WRITE-007")return new WorkTypeProviderError("YKP-WORKTYPE-005");
 if(code==="YKP-RATE-001"||code==="YKP-GH-READ-009"||code==="YKP-GH-WRITE-008")return new WorkTypeProviderError("YKP-WORKTYPE-008");
 if(["YKP-GH-READ-004","YKP-GH-WRITE-004","YKP-GH-WRITE-005","YKP-GH-WRITE-009","YKP-GH-WRITE-010","YKP-GH-WRITE-011"].includes(code))return new WorkTypeProviderError("YKP-WORKTYPE-006");
 return new WorkTypeProviderError("YKP-WORKTYPE-007");
}
