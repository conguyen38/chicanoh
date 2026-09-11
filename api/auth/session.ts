import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAdminSession } from "../_lib/auth.js";
import { resolveSessionUser } from "../_lib/users.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = readAdminSession(req);
  if (!session) {
    res.status(200).json({ authenticated: false, account: null, name: null, role: null, id: null });
    return;
  }

  try {
    const user = await resolveSessionUser(req);
    if (!user) {
      res.status(200).json({ authenticated: false, account: null, name: null, role: null, id: null });
      return;
    }
    res.status(200).json({
      authenticated: true,
      account: user.account,
      name: user.name,
      role: user.role,
      id: user.id
    });
  } catch {
    // Without a database the signed cookie is still enough to stay signed in.
    res.status(200).json({
      authenticated: true,
      account: session.account,
      name: null,
      role: session.role || null,
      id: session.id || null
    });
  }
}
