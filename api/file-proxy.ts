import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_BUCKETS = new Set(["job-documents", "sitecam", "user-documents"]);

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  avif: "image/avif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

function mimeForPath(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  const ext = filePath.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bucket = req.query.bucket as string | undefined;
  const path = req.query.path as string | undefined;

  if (!bucket || !path) {
    res.status(400).json({ error: "Missing bucket or path query parameter" });
    return;
  }
  if (!ALLOWED_BUCKETS.has(bucket)) {
    res.status(400).json({ error: "Invalid bucket" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    const missing = [
      !supabaseUrl && "SUPABASE_URL",
      !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
      !anonKey && "SUPABASE_ANON_KEY",
    ].filter(Boolean);
    console.error("file-proxy: missing env vars:", missing.join(", "));
    res.status(500).json({ error: "Server misconfiguration", missing });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { error: authError } = await userClient.auth.getUser();
  if (authError) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await adminClient.storage
    .from(bucket)
    .download(path);

  if (error || !data) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const contentType = mimeForPath(path);
  const buf = Buffer.from(await data.arrayBuffer());

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.status(200).send(buf);
}
