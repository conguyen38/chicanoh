import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hashPassword, requireAdmin } from "../_lib/auth.js";
import { getAdminConfig, getSql, saveAdminConfig } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const sql = getSql();
    const current = await getAdminConfig(sql);

    if (req.method === "GET") {
      res.status(200).json({ account: current.account });
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const account = String(body.account || "").trim();
    const password = String(body.password || "");
    if (!account) {
      res.status(400).json({ error: "Account is required" });
      return;
    }
    if (password && password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }

    const nextConfig = {
      account,
      passwordHash: password ? hashPassword(password) : current.passwordHash
    };
    await saveAdminConfig(nextConfig, sql);
    res.status(200).json({ ok: true, account: nextConfig.account });
  } catch (error) {
    console.error("Could not save admin settings", error);
    res.status(500).json({
      error: "Could not save admin settings"
    });
  }
}
