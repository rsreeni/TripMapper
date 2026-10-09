import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { cookies } from "next/headers";
import { teslaConfig } from "./config";
import type { TeslaTokens } from "./types";

const COOKIE_NAME = "tripmapper_session";

function keyFromSecret(secret: string) {
  return scryptSync(secret, "tripmapper-tesla-session", 32);
}

function encrypt(payload: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(token: string, secret: string) {
  const buf = Buffer.from(token, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export async function saveTeslaSession(tokens: TeslaTokens) {
  const { sessionSecret } = teslaConfig();
  const store = await cookies();
  store.set(COOKIE_NAME, encrypt(JSON.stringify(tokens), sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearTeslaSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readTeslaSession(): Promise<TeslaTokens | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const { sessionSecret } = teslaConfig();
    return JSON.parse(decrypt(raw, sessionSecret)) as TeslaTokens;
  } catch {
    return null;
  }
}
