import crypto from "crypto";

/**
 * Generate a valid 32-byte encryption key:
 * node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
const ENCRYPTION_KEY_BASE64 = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_BASE64) {
  throw new Error("Missing env var: ENCRYPTION_KEY");
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY_BASE64, "base64");

if (keyBuffer.length !== 32) {
  throw new Error(
    `ENCRYPTION_KEY must be a 32-byte key when base64-decoded. Got ${keyBuffer.length} bytes.`
  );
}

const KEY = keyBuffer;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits is standard for GCM

/**
 * Encrypts plaintext using AES-256-GCM.
 * Generates a random 12-byte IV per call.
 * 
 * @param plainText - The string to encrypt
 * @returns Format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let ciphertext = cipher.update(plainText, "utf8", "base64");
  ciphertext += cipher.final("base64");
  
  const authTag = cipher.getAuthTag().toString("base64");
  const ivBase64 = iv.toString("base64");
  
  return `${ivBase64}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts a payload encrypted by the encrypt function.
 * Verifies the auth tag automatically (throws if tampered).
 * 
 * @param payload - Format: base64(iv):base64(authTag):base64(ciphertext)
 * @returns The original plaintext
 */
export function decrypt(payload: string): string {
  const parts = payload.split(":");
  
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }
  
  const [ivBase64, authTagBase64, ciphertextBase64] = parts;
  
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(ciphertext.toString("base64"), "base64", "utf8");
  plaintext += decipher.final("utf8");
  
  return plaintext;
}
