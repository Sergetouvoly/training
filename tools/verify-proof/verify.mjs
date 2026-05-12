#!/usr/bin/env node
/**
 * Standalone proof verification script — verifiable OFF-PLATFORM.
 * Refs: SPEC.md R-1.5, R-4.3, C-1.4, WORKFLOW.md §6 BLOC 6
 *
 * Usage: node verify.mjs <proof.json> <secret>
 * Exit code 0 = valid, 1 = invalid, 2 = usage error
 *
 * No external dependencies — only Node.js built-in crypto.
 * <= 100 lines as required by WORKFLOW.md §5.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

function sha256(data) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function canonicalize(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function hashPayload(obj) {
  return sha256(canonicalize(obj));
}

function verifyHmac(data, signature, secret) {
  const expected = createHmac("sha256", secret).update(data, "utf8").digest("hex");
  if (expected.length !== signature.length) return false;
  let r = 0;
  for (let i = 0; i < expected.length; i++) r |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return r === 0;
}

// --- Main ---
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node verify.mjs <proof.json> <secret>");
  console.error("  proof.json: AuditProofBundle exported from the platform");
  console.error("  secret:     HMAC signing secret");
  process.exit(2);
}

const [file, secret] = args;
let bundle;
try {
  bundle = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`Error reading ${file}: ${e.message}`);
  process.exit(2);
}

const errors = [];

// 1. Verify payload hash
const expectedHash = hashPayload(bundle.payload);
if (expectedHash !== bundle.payload_hash) {
  errors.push(`FAIL: Payload hash mismatch\n  Expected: ${expectedHash}\n  Got:      ${bundle.payload_hash}`);
}

// 2. Verify signature
const signableData = `${bundle.payload_hash}:${bundle.content_version_hash}:${bundle.signed_at}`;
if (!verifyHmac(signableData, bundle.signature, secret)) {
  errors.push("FAIL: Signature verification failed");
}

// 3. Report
console.log(`Proof verification for: ${file}`);
console.log(`  Payload hash:    ${bundle.payload_hash}`);
console.log(`  Content version: ${bundle.content_version_hash}`);
console.log(`  Signed at:       ${bundle.signed_at}`);
console.log(`  Signed by:       ${bundle.signed_by}`);
console.log("");

if (errors.length === 0) {
  console.log("RESULT: VALID ✓");
  console.log("  - Payload integrity verified (SHA-256)");
  console.log("  - Signature verified (HMAC-SHA256)");
  process.exit(0);
} else {
  console.log("RESULT: INVALID ✗");
  errors.forEach((e) => console.log(`  ${e}`));
  process.exit(1);
}
