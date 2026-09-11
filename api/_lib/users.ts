import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAdminSession } from "./auth.js";
import {
  findAdminUserByAccount,
  findAdminUserById,
  getSql,
  type AdminUserRecord
} from "./db.js";

export const ACCOUNT_PATTERN = /^[a-zA-Z0-9._@-]{3,40}$/;
export const MIN_PASSWORD_LENGTH = 4;

/**
 * Sessions issued before account management shipped only carry the account name,
 * so fall back to an account lookup when the cookie has no user id.
 */
export async function resolveSessionUser(
  req: VercelRequest,
  sql = getSql()
): Promise<AdminUserRecord | null> {
  const session = readAdminSession(req);
  if (!session) return null;
  if (session.id) {
    const byId = await findAdminUserById(session.id, sql);
    if (byId) return byId;
  }
  return findAdminUserByAccount(session.account, sql);
}

export async function requireAdminUser(
  req: VercelRequest,
  res: VercelResponse,
  sql = getSql()
) {
  const user = await resolveSessionUser(req, sql);
  if (!user) {
    res.status(401).json({ error: "Admin session required" });
    return null;
  }
  return user;
}
