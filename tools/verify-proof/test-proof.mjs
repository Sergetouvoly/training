#!/usr/bin/env node
/**
 * Test script — generates a proof and verifies it with verify.mjs.
 * This validates C-1.4: preuve vérifiable hors plateforme.
 */
import { createHash, createHmac } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const secret = "test-secret-for-verification";

// Replicate the proof creation logic (standalone, no imports from packages)
function sha256(data) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}
function canonicalize(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
function signHmac(data, sec) {
  return createHmac("sha256", sec).update(data, "utf8").digest("hex");
}

const payload = { competence_id: "c1", learner_id: "l1", score: 95, stamp_id: "s1" };
const payloadHash = sha256(canonicalize(payload));
const signedAt = new Date().toISOString();
const contentVersionHash = "module-hash-v1";
const signableData = `${payloadHash}:${contentVersionHash}:${signedAt}`;

const bundle = {
  payload,
  payload_hash: payloadHash,
  content_version_hash: contentVersionHash,
  signature: signHmac(signableData, secret),
  signed_at: signedAt,
  signed_by: "test",
};

const proofFile = join(__dirname, "_test_proof.json");
writeFileSync(proofFile, JSON.stringify(bundle, null, 2));

let passed = 0;
let failed = 0;

// Test 1: Valid proof
try {
  execSync(`node ${join(__dirname, "verify.mjs")} ${proofFile} ${secret}`, { stdio: "pipe" });
  console.log("✓ Test 1: Valid proof accepted");
  passed++;
} catch {
  console.log("✗ Test 1: Valid proof rejected (should have been accepted)");
  failed++;
}

// Test 2: Wrong secret should fail
try {
  execSync(`node ${join(__dirname, "verify.mjs")} ${proofFile} wrong-secret`, { stdio: "pipe" });
  console.log("✗ Test 2: Wrong secret accepted (should have been rejected)");
  failed++;
} catch {
  console.log("✓ Test 2: Wrong secret rejected");
  passed++;
}

// Test 3: Tampered payload should fail
const tampered = { ...bundle, payload: { ...payload, score: 999 } };
const tamperedFile = join(__dirname, "_test_tampered.json");
writeFileSync(tamperedFile, JSON.stringify(tampered, null, 2));
try {
  execSync(`node ${join(__dirname, "verify.mjs")} ${tamperedFile} ${secret}`, { stdio: "pipe" });
  console.log("✗ Test 3: Tampered payload accepted (should have been rejected)");
  failed++;
} catch {
  console.log("✓ Test 3: Tampered payload rejected");
  passed++;
}

// Cleanup
unlinkSync(proofFile);
unlinkSync(tamperedFile);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
