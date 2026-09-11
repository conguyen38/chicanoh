import { createHash } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth.js";
import { resolveSessionUser } from "../_lib/users.js";

type CloudinaryResourceType = "image" | "raw" | "auto";

function signCloudinaryParams(params: Record<string, string>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    // Deleted accounts keep a valid cookie until it expires, so confirm the
    // account still exists before handing out upload credentials.
    if (!(await resolveSessionUser(req))) {
      res.status(401).json({ error: "Admin session required" });
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary environment variables");
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const resourceType = ["image", "raw", "auto"].includes(body.resourceType)
      ? (body.resourceType as CloudinaryResourceType)
      : "auto";
    const folder = process.env.CLOUDINARY_FOLDER || "onehousing-property-maker";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params = { folder, timestamp };
    const signature = signCloudinaryParams(params, apiSecret);

    res.status(200).json({
      cloudName,
      apiKey,
      folder,
      timestamp,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
    });
  } catch (error) {
    console.error("Cloudinary signing failed", error);
    res.status(500).json({ error: "Cloudinary signing failed" });
  }
}
