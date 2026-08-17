import crypto from "crypto";

/**
 * Verifies a GitHub webhook signature using HMAC-SHA256.
 * 
 * This function computes the HMAC-SHA256 of the raw request body using the secret,
 * and compares it against the provided signature header using constant-time comparison
 * to prevent timing attacks.
 * 
 * @param rawBody - The raw request body as a string (must be the exact bytes received)
 * @param signatureHeader - The value of the X-Hub-Signature-256 header (e.g., "sha256=abc123...")
 * @param secret - The webhook secret configured in GitHub
 * @returns true if the signature is valid, false otherwise
 */
export function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  // If no signature header is provided, reject immediately
  if (!signatureHeader) {
    return false;
  }

  // Expected format: "sha256=<hex>"
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const providedSignature = signatureHeader.slice(prefix.length);

  // Compute our expected signature
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody, "utf8");
  const expectedSignatureBuffer = hmac.digest();
  const expectedSignatureHex = expectedSignatureBuffer.toString("hex");

  // Convert provided signature to buffer for comparison
  const providedSignatureBuffer = Buffer.from(providedSignature, "hex");

  // Length mismatch - still compute in constant time where possible by comparing
  // but we know it will fail. We use a dummy buffer of the same length to avoid
  // leaking information through timing.
  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
    // Create a dummy buffer of the same length for constant-time comparison
    const dummyBuffer = Buffer.alloc(expectedSignatureBuffer.length, 0);
    // Perform comparison but result will be discarded since lengths don't match
    crypto.timingSafeEqual(dummyBuffer, expectedSignatureBuffer);
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  // Never use === for signature comparison
  return crypto.timingSafeEqual(expectedSignatureBuffer, providedSignatureBuffer);
}
