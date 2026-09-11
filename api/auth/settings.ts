import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hashPassword } from "../_lib/auth.js";
import {
  findAdminUserById,
  getAdminConfig,
  getSql,
  publicAdminUser,
  saveAdminConfig,
  updateAdminUserName,
  updateAdminUserPassword
} from "../_lib/db.js";
import { MIN_PASSWORD_LENGTH, requireAdminUser } from "../_lib/users.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    const current = await requireAdminUser(req, res, sql);
    if (!current) return;

    if (req.method === "GET") {
      res.status(200).json(publicAdminUser(current));
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const password = String(body.password || "").trim();
    const name = typeof body.name === "string" ? body.name.trim() : null;

    if (!password && name === null) {
      res.status(400).json({ error: "Không có thay đổi nào để lưu" });
      return;
    }

    if (name !== null) {
      if (current.role === "super_admin") {
        res.status(400).json({ error: "Tên của Super Admin được cố định" });
        return;
      }
      if (!name) {
        res.status(400).json({ error: "Tên không được để trống" });
        return;
      }
      await updateAdminUserName(current.id, name, sql);
    }

    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        res
          .status(400)
          .json({ error: `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự` });
        return;
      }
      const passwordHash = hashPassword(password);
      await updateAdminUserPassword(current.id, passwordHash, sql);
      if (current.role === "super_admin") {
        const legacy = await getAdminConfig(sql);
        await saveAdminConfig({ account: legacy.account, passwordHash }, sql);
      }
    }

    const updated = (await findAdminUserById(current.id, sql)) || current;
    res.status(200).json({ ok: true, ...publicAdminUser(updated) });
  } catch (error) {
    console.error("Could not save admin settings", error);
    res.status(500).json({
      error: "Could not save admin settings"
    });
  }
}
