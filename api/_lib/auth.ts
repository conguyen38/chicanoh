import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE_NAME = "oh_admin_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

type SessionPayload = {
  account: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "local-development-session-secret"
  );
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseCookies(header: string | undefined) {
  return Object.fromEntries(
    (header || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function secureCookieFlag(req: VercelRequest) {
  return Boolean(process.env.VERCEL || req.headers["x-forwarded-proto"] === "https");
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyHash(value: string, expectedHash: string) {
  const actualHash = hashPassword(value);
  return safeEqual(actualHash, expectedHash);
}

export function createSessionCookie(req: VercelRequest, account: string) {
  const payload: SessionPayload = {
    account,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(`${encodedPayload}.${signature}`)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`
  ];
  if (secureCookieFlag(req)) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(req: VercelRequest) {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (secureCookieFlag(req)) parts.push("Secure");
  return parts.join("; ");
}

export function readAdminSession(req: VercelRequest): SessionPayload | null {
  const cookieValue = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<SessionPayload>;
    if (!parsed.account || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      account: parsed.account,
      exp: parsed.exp
    };
  } catch {
    return null;
  }
}

export function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const session = readAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Admin session required" });
    return null;
  }
  return session;
}
