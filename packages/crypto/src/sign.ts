import { createHmac } from "node:crypto";

/**
 * HMAC-SHA256 signature.
 * Phase 1: symmetric key (HMAC). Phase 4 can upgrade to asymmetric (RSA/ECDSA) via ADR.
 * Refs: SPEC.md R-1.5 (signature), R-4.3 (ancrage crypto)
 */
export function signHmac(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

/**
 * Verify HMAC-SHA256 signature.
 */
export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expected = signHmac(data, secret);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
