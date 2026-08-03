import { createHash, createPublicKey, verify, type KeyObject } from "node:crypto";
import { canonicalJson } from "./planner.js";
import type { ApprovalClaims } from "./executor.js";

export const APPLY_VERSIONS={contract:"controlled-apply-v1",planner:"reconciliation-plan-v1",snapshot:"rest-project-snapshot-v2",entrypoint:"apply-entrypoint-v1"} as const;
export interface SignedApprovalEnvelope{schema:1;algorithm:"Ed25519";keyFingerprint:string;claims:ApprovalClaims;signature:string}
export interface ApprovalTrust{publicKey:Buffer|string;allowedIssuerRefs:readonly string[]}

const DIGEST=/^[a-f0-9]{64}$/u,SIGNATURE=/^[A-Za-z0-9_-]{86}$/u;
const CLAIM_KEYS=["schema","issuerRef","subjectRef","repositoryRef","projectRef","issueRef","issueNumber","scopeDigest","planId","operationDigest","environment","issuedAtMs","expiresAtMs","nonce","keyFingerprint","contractVersion","plannerVersion","snapshotVersion","entrypointVersion"] as const;
const ENVELOPE_KEYS=["schema","algorithm","keyFingerprint","claims","signature"] as const;
function exactKeys(value:unknown,keys:readonly string[]):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));}
function bounded(value:unknown,max=256):value is string{return typeof value==="string"&&value.length>0&&value.length<=max&&!/[\u0000-\u001f\u007f]/u.test(value);}
function publicKey(value:Buffer|string):{key:KeyObject;fingerprint:string}|null{try{const key=createPublicKey(value);if(key.asymmetricKeyType!=="ed25519")return null;const der=key.export({type:"spki",format:"der"});return{key,fingerprint:createHash("sha256").update(der).digest("hex")};}catch{return null;}}
function claimsShape(value:unknown):value is ApprovalClaims{if(!exactKeys(value,CLAIM_KEYS))return false;const c=value as unknown as ApprovalClaims;return c.schema===1&&bounded(c.issuerRef)&&bounded(c.subjectRef)&&bounded(c.repositoryRef)&&bounded(c.projectRef)&&bounded(c.issueRef)&&Number.isSafeInteger(c.issueNumber)&&c.issueNumber>0&&DIGEST.test(c.scopeDigest)&&DIGEST.test(c.planId)&&DIGEST.test(c.operationDigest)&&c.environment==="apply"&&Number.isSafeInteger(c.issuedAtMs)&&Number.isSafeInteger(c.expiresAtMs)&&bounded(c.nonce)&&DIGEST.test(c.keyFingerprint)&&c.contractVersion===APPLY_VERSIONS.contract&&c.plannerVersion===APPLY_VERSIONS.planner&&c.snapshotVersion===APPLY_VERSIONS.snapshot&&c.entrypointVersion===APPLY_VERSIONS.entrypoint;}
function signatureInput(envelope:Omit<SignedApprovalEnvelope,"signature">):Buffer{return Buffer.from(`yukh-projects-approval-v1\0${canonicalJson(envelope)}`,"utf8");}

export function verifySignedApproval(artifact:unknown,trust:ApprovalTrust):ApprovalClaims|null{
 if(!exactKeys(artifact,ENVELOPE_KEYS))return null;const envelope=artifact as unknown as SignedApprovalEnvelope;if(envelope.schema!==1||envelope.algorithm!=="Ed25519"||!DIGEST.test(envelope.keyFingerprint)||!SIGNATURE.test(envelope.signature)||!claimsShape(envelope.claims))return null;
 const trusted=publicKey(trust.publicKey);if(!trusted||trusted.fingerprint!==envelope.keyFingerprint||envelope.claims.keyFingerprint!==trusted.fingerprint||!trust.allowedIssuerRefs.includes(envelope.claims.issuerRef))return null;
 try{const signature=Buffer.from(envelope.signature,"base64url");if(signature.length!==64||!verify(null,signatureInput({schema:1,algorithm:"Ed25519",keyFingerprint:envelope.keyFingerprint,claims:envelope.claims}),trusted.key,signature))return null;}catch{return null;}
 return{...envelope.claims};
}

export function approvalSigningInputForTest(envelope:Omit<SignedApprovalEnvelope,"signature">):Buffer{return signatureInput(envelope);}
