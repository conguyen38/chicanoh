import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAdminSession } from "../_lib/auth.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = readAdminSession(req);
  res.status(200).json({
    authenticated: Boolean(session),
    account: session?.account || null
  });
}
