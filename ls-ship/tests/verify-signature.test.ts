import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGithubSignature } from "@/lib/github/verify-signature";

const SECRET = "whsec_test_123";
const BODY = JSON.stringify({ ref: "refs/heads/main", zen: "keep it simple" });

function sign(payload: string, secret = SECRET): string {
  return (
    "sha256=" + createHmac("sha256", secret).update(payload, "utf8").digest("hex")
  );
}

describe("verifyGithubSignature", () => {
  it("accepts a correctly signed payload", () => {
    expect(verifyGithubSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    expect(
      verifyGithubSignature(BODY, sign(BODY, "wrong-secret"), SECRET)
    ).toBe(false);
  });

  it("rejects when the body was tampered with", () => {
    const tampered = BODY.replace("main", "evil");
    expect(verifyGithubSignature(tampered, sign(BODY), SECRET)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyGithubSignature(BODY, null, SECRET)).toBe(false);
  });

  it("rejects headers without the sha256= prefix", () => {
    expect(verifyGithubSignature(BODY, "sha1=deadbeef", SECRET)).toBe(false);
  });

  it("rejects truncated signatures without throwing", () => {
    expect(verifyGithubSignature(BODY, "sha256=abc", SECRET)).toBe(false);
  });
});
