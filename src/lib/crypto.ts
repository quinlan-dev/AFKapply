import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "crypto";

// AES-256-GCM encryption for secrets stored at rest (SMTP passwords).
// Key is derived from NEXTAUTH_SECRET (or APP_ENCRYPTION_KEY if set) with a
// per-value random salt. Format: salt.iv.authTag.ciphertext, all base64.

function deriveKey(salt: Buffer): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret || secret === "change-me") {
    throw new Error("Server is missing a real NEXTAUTH_SECRET / APP_ENCRYPTION_KEY");
  }
  return scryptSync(secret, salt, 32);
}

export function encryptSecret(plaintext: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [salt, iv, tag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(".");
  if (parts.length !== 4) throw new Error("Malformed encrypted value");
  const [salt, iv, tag, encrypted] = parts.map((p) => Buffer.from(p, "base64"));
  const key = deriveKey(salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
