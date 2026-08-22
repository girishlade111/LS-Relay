import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Generate a valid key:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const KEY_BYTES = 32;
const IV_BYTES = 12;
const PAYLOAD_PARTS = 3; // iv:authTag:ciphertext

let cachedKey: Buffer | undefined;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const encoded = process.env.ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("Missing env var: ENCRYPTION_KEY");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `Invalid ENCRYPTION_KEY: base64-decoded value must be exactly ${KEY_BYTES} bytes, got ${key.length}`
    );
  }

  cachedKey = key;
  return key;
}

export function encrypt(plainText: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", loadKey(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== PAYLOAD_PARTS) {
    throw new Error(
      `Invalid encrypted payload format: expected ${PAYLOAD_PARTS} colon-separated parts, got ${parts.length}`
    );
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    loadKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
