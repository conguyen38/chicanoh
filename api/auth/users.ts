import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hashPassword } from "../_lib/auth.js";
import {
  createAdminUser,
  deleteAdminUser,
  ensureAdminUsers,
  findAdminUserByAccount,
  findAdminUserById,
  getAdminConfig,
  getSql,
  listAdminUsers,
  publicAdminUser,
  saveAdminConfig,
  updateAdminUserName,
  updateAdminUserPassword
} from "../_lib/db.js";
import {
  ACCOUNT_PATTERN,
  MIN_PASSWORD_LENGTH,
  requireAdminUser
} from "../_lib/users.js";

function parseBody(req: VercelRequest) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (req.body || {}) as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowed = ["GET", "POST", "PATCH", "DELETE"];
  if (!req.method || !allowed.includes(req.method)) {
    res.setHeader("Allow", allowed.join(", "));
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    await ensureAdminUsers(sql);
    const current = await requireAdminUser(req, res, sql);
    if (!current) return;

    if (req.method === "GET") {
      res.status(200).json({
        users: await listAdminUsers(sql),
        me: publicAdminUser(current)
      });
      return;
    }

    const body = parseBody(req);

    if (req.method === "POST") {
      const account = readString(body.account);
      const name = readString(body.name);
      const password = readString(body.password);
      const role = readString(body.role);

      if (role === "super_admin") {
        res.status(403).json({ error: "Không thể tạo tài khoản Super Admin" });
        return;
      }
      if (!ACCOUNT_PATTERN.test(account)) {
        res.status(400).json({
          error: "Tài khoản cần 3-40 ký tự, chỉ gồm chữ, số và . _ - @"
        });
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        res
          .status(400)
          .json({ error: `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự` });
        return;
      }
      if (await findAdminUserByAccount(account, sql)) {
        res.status(409).json({ error: "Tài khoản này đã tồn tại" });
        return;
      }

      const created = await createAdminUser(
        { account, name: name || account, passwordHash: hashPassword(password) },
        sql
      );
      res.status(201).json({ ok: true, user: publicAdminUser(created) });
      return;
    }

    const targetId = readString(body.id) || readString(req.query.id);
    if (!targetId) {
      res.status(400).json({ error: "Thiếu id tài khoản" });
      return;
    }
    const target = await findAdminUserById(targetId, sql);
    if (!target) {
      res.status(404).json({ error: "Không tìm thấy tài khoản" });
      return;
    }
    const isSelf = target.id === current.id;

    if (req.method === "DELETE") {
      if (target.role === "super_admin") {
        res.status(403).json({ error: "Không thể xóa tài khoản Super Admin" });
        return;
      }
      if (isSelf) {
        res.status(400).json({ error: "Không thể xóa tài khoản đang đăng nhập" });
        return;
      }
      await deleteAdminUser(target.id, sql);
      res.status(200).json({ ok: true, users: await listAdminUsers(sql) });
      return;
    }

    // PATCH: rename and/or reset a password.
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const password = typeof body.password === "string" ? body.password.trim() : null;
    if (name === null && password === null) {
      res.status(400).json({ error: "Không có thay đổi nào để lưu" });
      return;
    }

    if (name !== null) {
      if (target.role === "super_admin") {
        res.status(400).json({ error: "Tên của Super Admin được cố định" });
        return;
      }
      if (!isSelf && current.role !== "super_admin") {
        res.status(403).json({ error: "Chỉ đổi được tên của chính mình" });
        return;
      }
      if (!name) {
        res.status(400).json({ error: "Tên không được để trống" });
        return;
      }
      await updateAdminUserName(target.id, name, sql);
    }

    if (password !== null) {
      if (target.role === "super_admin" && !isSelf) {
        res
          .status(403)
          .json({ error: "Chỉ Super Admin tự đổi được mật khẩu của mình" });
        return;
      }
      if (!isSelf && current.role !== "super_admin") {
        res.status(403).json({ error: "Chỉ đổi được mật khẩu của chính mình" });
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        res
          .status(400)
          .json({ error: `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự` });
        return;
      }
      const passwordHash = hashPassword(password);
      await updateAdminUserPassword(target.id, passwordHash, sql);
      if (target.role === "super_admin") {
        // Keep the legacy single-admin record in step so the login fallback and
        // a future re-seed cannot resurrect the old password.
        const legacy = await getAdminConfig(sql);
        await saveAdminConfig({ account: legacy.account, passwordHash }, sql);
      }
    }

    res.status(200).json({
      ok: true,
      users: await listAdminUsers(sql),
      me: publicAdminUser((await findAdminUserById(current.id, sql)) || current)
    });
  } catch (error) {
    console.error("Could not manage admin accounts", error);
    res.status(500).json({ error: "Không thao tác được với tài khoản" });
  }
}
