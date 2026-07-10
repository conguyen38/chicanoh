import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "./_lib/auth.js";
import { ensureTables, getSql } from "./_lib/db.js";

const STATE_ID = "default";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method === "HEAD") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, HEAD, POST, PUT");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.method !== "GET") {
    const session = requireAdmin(req, res);
    if (!session) return;
  }

  try {
    const sql = getSql();
    await ensureTables(sql);

    if (req.method === "GET") {
      const rows = (await sql`
        SELECT data, updated_at
        FROM onehousing_app_state
        WHERE id = ${STATE_ID}
        LIMIT 1
      `) as Array<{ data?: unknown; updated_at?: string }>;
      res.status(200).json({
        state: rows[0]?.data || null,
        updatedAt: rows[0]?.updated_at || null
      });
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!body.state || typeof body.state !== "object") {
      res.status(400).json({ error: "state object is required" });
      return;
    }

    await sql`
      INSERT INTO onehousing_app_state (id, data, updated_at)
      VALUES (${STATE_ID}, ${JSON.stringify(body.state)}::jsonb, now())
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
    res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("State API failed", error);
    res.status(500).json({
      error: "State API failed"
    });
  }
}
