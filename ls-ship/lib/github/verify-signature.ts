import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_PREFIX = "sha256=";

// GitHub sends `X-Hub-Signature-256: sha256=<hex hmac>`, computed over the
// exact raw request bytes. Callers must pass the untouched body — read with
// `await request.text()` before any JSON parsing, never a re-serialized
// object, or the digest won't match.
export function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const expected =
    SIGNATURE_PREFIX +
    createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");

  // timingSafeEqual throws on unequal lengths, so lengths are checked first.
  // That check leaks nothing useful to an attacker: GitHub signatures have a
  // fixed format (71 chars), so the length is public knowledge. The actual
  // secret-dependent comparison below runs in constant time.
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, receivedBuf);
}
