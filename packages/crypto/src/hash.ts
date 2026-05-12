import { createHash } from "node:crypto";

/**
 * SHA-256 hash of a canonical JSON payload.
 * Refs: SPEC.md R-1.5, R-4.3
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Canonical JSON: sorted keys, no whitespace.
 * Ensures deterministic hashing regardless of property order.
 */
export function canonicalize(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

/**
 * Hash any object: canonicalize then SHA-256.
 */
export function hashPayload(obj: unknown): string {
  return sha256(canonicalize(obj));
}
