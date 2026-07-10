import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "./_lib/auth.js";
import { ensureTables, getSql } from "./_lib/db.js";

const STATE_ID = "default";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function mergeArrayById(existing: unknown, incoming: unknown) {
  if (!Array.isArray(existing)) return Array.isArray(incoming) ? incoming : [];
  if (!Array.isArray(incoming)) return existing;
  const merged = new Map<string, unknown>();
  existing.forEach((item) => {
    if (isRecord(item) && typeof item.id === "string") {
      merged.set(item.id, item);
    }
  });
  incoming.forEach((item) => {
    if (isRecord(item) && typeof item.id === "string") {
      merged.set(item.id, item);
    }
  });
  return Array.from(merged.values());
}

function mergeStateForSave(existing: unknown, incoming: JsonRecord) {
  if (!isRecord(existing)) return incoming;
  const merged: JsonRecord = {
    ...existing,
    ...incoming
  };
  for (const key of [
    "templateFolders",
    "imageFolders",
    "templateImages",
    "templates",
    "datasets",
    "customFonts"
  ]) {
    merged[key] = mergeArrayById(existing[key], incoming[key]);
  }
  if (
    typeof incoming.activeTemplateId === "string" &&
    Array.isArray(merged.templates) &&
    merged.templates.some((item) => isRecord(item) && item.id === incoming.activeTemplateId)
  ) {
    merged.activeTemplateId = incoming.activeTemplateId;
  } else if (typeof existing.activeTemplateId === "string") {
    merged.activeTemplateId = existing.activeTemplateId;
  }
  return merged;
}

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
    if (!isRecord(body.state)) {
      res.status(400).json({ error: "state object is required" });
      return;
    }

    const existingRows = (await sql`
      SELECT data
      FROM onehousing_app_state
      WHERE id = ${STATE_ID}
      LIMIT 1
    `) as Array<{ data?: unknown }>;
    const existingState = existingRows[0]?.data || null;
    const stateForSave = mergeStateForSave(existingState, body.state);

    if (existingState) {
      await sql`
        INSERT INTO onehousing_app_state_history (state_id, data)
        VALUES (${STATE_ID}, ${JSON.stringify(existingState)}::jsonb)
      `;
    }

    await sql`
      INSERT INTO onehousing_app_state (id, data, updated_at)
      VALUES (${STATE_ID}, ${JSON.stringify(stateForSave)}::jsonb, now())
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
