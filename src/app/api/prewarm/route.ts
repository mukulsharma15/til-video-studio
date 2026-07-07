import { NextResponse } from "next/server";
import { ensureFonts } from "@/lib/render/fontCache";
import { getHwEncoder } from "@/lib/render/ffmpegPipeline";

export const runtime = "nodejs";

/**
 * GET /api/prewarm
 * Called by the studio on load. Downloads fonts + detects AMD GPU encoder
 * in the background so the first render is instant.
 */
export async function GET() {
  // Non-blocking — fire and forget
  Promise.all([ensureFonts(), getHwEncoder()]).catch(() => {});
  return NextResponse.json({ status: "warming" });
}
