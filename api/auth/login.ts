import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionCookie, verifyHash } from "../_lib/auth.js";
import { getAdminConfig, getSql } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    const admin = await getAdminConfig(sql);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const account = String(body.account || "").trim();
    const password = String(body.password || "");

    if (account !== admin.account || !verifyHash(password, admin.passwordHash)) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    res.setHeader("Set-Cookie", createSessionCookie(req, admin.account));
    res.status(200).json({ ok: true, account: admin.account });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Login failed"
    });
  }
}
