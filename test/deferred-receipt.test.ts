import assert from "node:assert/strict";
import test from "node:test";
import { parseDeferredReceiptV1 } from "../src/deferred-receipt.js";

const digest=(character:string)=>character.repeat(64);
const retained={schema:1,version:"deferred-receipt-v1",status:"deferred",reason:"graphql-reserve",issued_at_ms:1_800_000_000_000,resume_after_ms:1_800_000_600_000,resume_by_ms:1_800_003_600_000,bindings:{scope_digest:digest("a"),request_digest:digest("b"),plan_digest:digest("c")},ownership:{disposition:"retained",mode:"durable-host",wakeup_digest:digest("d"),cancellation_digest:digest("e")},fresh_approval_required:true} as const;

test("accepts a redacted durable-host receipt",()=>{assert.deepEqual(parseDeferredReceiptV1(retained),retained);});
test("accepts governed handoff without scheduler identifiers",()=>{const receipt={...retained,bindings:{...retained.bindings,plan_digest:null},ownership:{disposition:"handoff",mode:"governed-handoff",wakeup_digest:null,cancellation_digest:null}};assert.deepEqual(parseDeferredReceiptV1(receipt),receipt);});
test("rejects unknown fields, raw identifiers, and mixed ownership modes",()=>{assert.throws(()=>parseDeferredReceiptV1({...retained,token:"secret"}),/invalid deferred receipt/u);assert.throws(()=>parseDeferredReceiptV1({...retained,ownership:{...retained.ownership,wakeup_digest:"raw-job-id"}}),/invalid deferred receipt/u);assert.throws(()=>parseDeferredReceiptV1({...retained,ownership:{...retained.ownership,disposition:"handoff"}}),/invalid deferred receipt/u);});
test("rejects ambiguous or unbounded resume windows",()=>{assert.throws(()=>parseDeferredReceiptV1({...retained,resume_after_ms:retained.issued_at_ms-1}),/invalid deferred receipt/u);assert.throws(()=>parseDeferredReceiptV1({...retained,resume_by_ms:retained.issued_at_ms+24*60*60*1000+1}),/invalid deferred receipt/u);});
test("rejects malformed bindings and unsupported reasons",()=>{assert.throws(()=>parseDeferredReceiptV1({...retained,reason:"unknown"}),/invalid deferred receipt/u);assert.throws(()=>parseDeferredReceiptV1({...retained,bindings:{...retained.bindings,scope_digest:"owner/repository"}}),/invalid deferred receipt/u);});
