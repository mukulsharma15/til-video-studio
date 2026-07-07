import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_BYTES = 250 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("video");
  if (!(file instanceof File)) return NextResponse.json({ error: "No video file uploaded." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Upload an MP4, MOV, or WebM video." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Video is too large. Keep MVP uploads under 250MB." }, { status: 400 });
  const ext = extensionFor(file.name, file.type);
  const id = randomUUID();
  const fileName = `${id}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, fileName), bytes);
  return NextResponse.json({ url: `/uploads/${fileName}`, fileName: file.name, size: file.size });
}

function extensionFor(name: string, type: string) {
  const ext = path.extname(name).toLowerCase();
  if ([".mp4", ".mov", ".webm", ".m4v"].includes(ext)) return ext;
  if (type === "video/webm") return ".webm";
  if (type === "video/quicktime") return ".mov";
  return ".mp4";
}
