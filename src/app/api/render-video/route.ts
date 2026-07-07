import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { renderProjectSchema } from "@/lib/render/renderSchema";
import { renderJobs } from "@/lib/render/jobs";
import { renderOverlayPng } from "@/lib/render/canvasOverlay";
import { renderWithFfmpeg, getHwEncoder } from "@/lib/render/ffmpegPipeline";
import { ensureFonts } from "@/lib/render/fontCache";
import type { RenderableVideoProject } from "@/lib/render/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Pre-detect the hardware encoder on first request
getHwEncoder().catch(() => {});
// Pre-warm fonts on first request
ensureFonts().catch(() => {});

// ─── Background render job ────────────────────────────────────────────────────
async function runRenderJob(renderId: string, project: RenderableVideoProject) {
  const tmpDir = path.join(process.cwd(), "public", "renders");
  mkdirSync(tmpDir, { recursive: true });

  const overlayPath = path.join(tmpDir, `${renderId}_overlay.png`);
  const outputPath  = path.join(tmpDir, `${renderId}.mp4`);

  try {
    // ── Step 1: Render static overlay as PNG (~0.1–0.3s) ──────────────────
    renderJobs.set(renderId, { progress: 0.02, status: "rendering" });
    console.log(`[RenderJob:${renderId}] Rendering overlay PNG...`);

    const overlayBuffer = await renderOverlayPng(project);
    writeFileSync(overlayPath, overlayBuffer);
    renderJobs.set(renderId, { progress: 0.08, status: "rendering" });

    // ── Step 2: FFmpeg encode (~3–10s with AMD GPU) ───────────────────────
    console.log(`[RenderJob:${renderId}] Starting FFmpeg pipeline...`);

    const videoSrc = project.video.src;
    // Resolve local file path from URL path (e.g. /uploads/xyz.mp4 → public/uploads/xyz.mp4)
    const inputPath = videoSrc.startsWith("/")
      ? path.join(process.cwd(), "public", videoSrc)
      : videoSrc;

    await renderWithFfmpeg({
      inputPath,
      overlayPngPath: overlayPath,
      outputPath,
      trimStart: project.video.trimStart ?? 0,
      trimEnd:   project.video.trimEnd   ?? project.video.durationInSeconds,
      transform:  project.video.transform,
      videoWidth:  project.video.width,
      videoHeight: project.video.height,
      fps: project.render.fps,
      onProgress: (p) => {
        // FFmpeg progress occupies 0.08 → 1.0
        const mapped = 0.08 + p * 0.92;
        renderJobs.set(renderId, { progress: Number(mapped.toFixed(4)), status: "rendering" });
      },
    });

    renderJobs.set(renderId, { progress: 1, status: "done", url: `/renders/${renderId}.mp4` });
    console.log(`[RenderJob:${renderId}] Done.`);
  } catch (error) {
    console.error(`[RenderJob:${renderId}] Error:`, error);
    renderJobs.set(renderId, {
      progress: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Video render failed.",
    });
  } finally {
    // Clean up temp overlay PNG
    try { if (existsSync(overlayPath)) unlinkSync(overlayPath); } catch {}
  }
}

// ─── POST /api/render-video ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const renderId = randomUUID();
  try {
    const body = await request.json();
    const project = renderProjectSchema.parse(body.project) as RenderableVideoProject;

    if (!project.video) {
      return NextResponse.json({ error: "No video uploaded." }, { status: 400 });
    }

    renderJobs.set(renderId, { progress: 0, status: "rendering" });

    // Non-blocking background render
    void runRenderJob(renderId, project);

    return NextResponse.json({ id: renderId });
  } catch (error) {
    console.error(error);
    renderJobs.set(renderId, {
      progress: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Video render initialization failed.",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video render failed." },
      { status: 500 }
    );
  }
}
