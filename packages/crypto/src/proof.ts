import { hashPayload, canonicalize } from "./hash.js";
import { signHmac, verifyHmac } from "./sign.js";

/**
 * AuditProofBundle — immutable proof for certification.
 * Refs: SPEC.md R-1.5, R-4.3, WORKFLOW.md §6 BLOC 6
 *
 * Each bundle contains:
 * 1. The original payload (certification data)
 * 2. SHA-256 hash of the payload
 * 3. Content version hash (module version at time of certification)
 * 4. HMAC signature of (payload_hash + content_version_hash + timestamp)
 * 5. Timestamp of creation
 */
export interface AuditProofBundle {
  readonly payload: unknown;
  readonly payload_hash: string;
  readonly content_version_hash: string;
  readonly signature: string;
  readonly signed_at: string;
  readonly signed_by: string;
}

export interface CreateProofInput {
  readonly payload: unknown;
  readonly content_version_hash: string;
  readonly signed_by: string;
}

/**
 * Creates an AuditProofBundle with hash + signature.
 */
export function createProofBundle(input: CreateProofInput, secret: string): AuditProofBundle {
  const payloadHash = hashPayload(input.payload);
  const signedAt = new Date().toISOString();

  const signableData = `${payloadHash}:${input.content_version_hash}:${signedAt}`;
  const signature = signHmac(signableData, secret);

  return {
    payload: input.payload,
    payload_hash: payloadHash,
    content_version_hash: input.content_version_hash,
    signature,
    signed_at: signedAt,
    signed_by: input.signed_by,
  };
}

/**
 * Verifies an AuditProofBundle:
 * 1. Payload hash matches the payload
 * 2. Signature matches (payload_hash + content_version_hash + timestamp)
 */
export function verifyProofBundle(bundle: AuditProofBundle, secret: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Verify payload hash
  const expectedHash = hashPayload(bundle.payload);
  if (expectedHash !== bundle.payload_hash) {
    errors.push(`Payload hash mismatch: expected ${expectedHash}, got ${bundle.payload_hash}`);
  }

  // 2. Verify signature
  const signableData = `${bundle.payload_hash}:${bundle.content_version_hash}:${bundle.signed_at}`;
  if (!verifyHmac(signableData, bundle.signature, secret)) {
    errors.push("Signature verification failed");
  }

  return { valid: errors.length === 0, errors };
}
