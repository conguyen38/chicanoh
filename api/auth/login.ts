import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionCookie, verifyHash } from "../_lib/auth.js";
import { findAdminUserByAccount, getSql } from "../_lib/db.js";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;

type LoginAttempt = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

function getClientIp(req: VercelRequest) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function rateLimitKey(req: VercelRequest, account: string) {
  return `${getClientIp(req)}:${account.toLowerCase() || "unknown"}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (attempt.resetAt <= now) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= RATE_LIMIT_MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  loginAttempts.set(key, { ...attempt, count: attempt.count + 1 });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const account = String(body.account || "").trim();
    const password = String(body.password || "");
    const limitKey = rateLimitKey(req, account);

    if (isRateLimited(limitKey)) {
      res.status(429).json({ error: "Too many login attempts. Please try again later." });
      return;
    }

    const user = account ? await findAdminUserByAccount(account, sql) : null;
    if (!user || !verifyHash(password, user.passwordHash)) {
      recordFailedAttempt(limitKey);
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    loginAttempts.delete(limitKey);
    res.setHeader(
      "Set-Cookie",
      createSessionCookie(req, { account: user.account, id: user.id, role: user.role })
    );
    res.status(200).json({
      ok: true,
      account: user.account,
      name: user.name,
      role: user.role,
      id: user.id
    });
  } catch (error) {
    console.error("Login failed", error);
    res.status(500).json({
      error: "Login failed"
    });
  }
}
