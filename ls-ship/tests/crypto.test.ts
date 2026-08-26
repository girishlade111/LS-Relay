import { beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto";

beforeAll(() => {
  // 32 random bytes, base64 — exactly what the setup instructions generate.
  process.env.ENCRYPTION_KEY =
    "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY";
});

describe("encrypt / decrypt", () => {
  it("round-trips a plaintext value", () => {
    const secret = "xoxb-1234-abcdef";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("round-trips empty strings and unicode", () => {
    expect(decrypt(encrypt(""))).toBe("");
    const unicode = "tökén ✓ 暗号化";
    expect(decrypt(encrypt(unicode))).toBe(unicode);
  });

  it("produces a unique ciphertext per call (random IV)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("emits the documented iv:authTag:ciphertext format", () => {
    const parts = encrypt("payload").split(":");
    expect(parts).toHaveLength(3);
    expect(Buffer.from(parts[0]!, "base64")).toHaveLength(12); // IV_BYTES
    expect(Buffer.from(parts[1]!, "base64")).toHaveLength(16); // GCM tag
  });

  it("throws on tampered ciphertext (GCM auth failure)", () => {
    const payload = encrypt("sensitive");
    const [iv, tag, ciphertext] = payload.split(":");
    const flipped = Buffer.from(ciphertext!, "base64");
    flipped[0] = flipped[0]! ^ 0xff;
    expect(() =>
      decrypt([iv, tag, flipped.toString("base64")].join(":"))
    ).toThrow();
  });

  it("throws on tampered auth tag", () => {
    const payload = encrypt("sensitive");
    const [iv, tag, ciphertext] = payload.split(":");
    const forgedTag = Buffer.from(tag!, "base64");
    forgedTag[0] = forgedTag[0]! ^ 0x01;
    expect(() =>
      decrypt([iv, forgedTag.toString("base64"), ciphertext].join(":"))
    ).toThrow();
  });

  it("rejects payloads with the wrong part count", () => {
    expect(() => decrypt("only-one-part")).toThrow(/colon-separated parts/i);
  });

  it("rejects payloads with a malformed IV length", () => {
    const badIv = Buffer.alloc(8).toString("base64");
    const filler = Buffer.from("x").toString("base64");
    expect(() => decrypt(`${badIv}:${filler}:${filler}`)).toThrow(
      /IV must be 12 bytes/
    );
  });
});
