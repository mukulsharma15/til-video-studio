import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type FfmpegRenderOptions = {
  /** Absolute path to the source video file */
  inputPath: string;
  /** Absolute path to the overlay PNG (static, covers the video area) */
  overlayPngPath: string;
  /** Absolute path for the output MP4 */
  outputPath: string;
  /** Trim start time in seconds */
  trimStart: number;
  /** Trim end time in seconds */
  trimEnd: number;
  /** Video transform — translation (px in the 912×1648 canvas space) and scale */
  transform: { x: number; y: number; scale: number; rotation: number };
  /** Source video natural dimensions */
  videoWidth: number;
  videoHeight: number;
  /** Output dimensions for the inner card */
  outWidth?: number;
  outHeight?: number;
  /** Frames per second */
  fps: number;
  /** Progress callback (0–1) */
  onProgress?: (progress: number) => void;
};

export type HwCodec = "h264_nvenc" | "h264_videotoolbox" | "h264_amf" | "h264_qsv";

/** Detect the best available hardware encoder on the host system */
async function detectHwEncoder(): Promise<HwCodec | null> {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-encoders"]);
    let stdout = "";
    ffmpeg.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    ffmpeg.stderr?.on("data", (d: Buffer) => { stdout += d.toString(); });
    ffmpeg.on("close", () => {
      // Prioritized list of hardware H264 encoders
      const encoders: HwCodec[] = ["h264_nvenc", "h264_videotoolbox", "h264_amf", "h264_qsv"];
      for (const enc of encoders) {
        if (stdout.includes(enc)) {
          resolve(enc);
          return;
        }
      }
      resolve(null);
    });
    setTimeout(() => { ffmpeg.kill(); resolve(null); }, 5000);
  });
}

let cachedHwEncoder: HwCodec | null | undefined = undefined;

export async function getHwEncoder(): Promise<HwCodec | null> {
  if (cachedHwEncoder !== undefined) return cachedHwEncoder;
  cachedHwEncoder = await detectHwEncoder();
  console.log(`[FFmpegPipeline] Auto-detected hardware encoder: ${cachedHwEncoder ?? "none (using libx264 CPU fallback)"}`);
  return cachedHwEncoder;
}

function runFfmpeg(args: string[], duration: number, fps: number, onProgress?: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);
    let stderr = "";
    const totalFrames = Math.ceil(duration * fps);
    let lastProgress = 0;

    ffmpeg.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;

      const frameMatch = chunk.match(/frame=\s*(\d+)/);
      if (frameMatch) {
        const frame = parseInt(frameMatch[1], 10);
        const p = Math.min(frame / totalFrames, 0.99);
        if (p > lastProgress) {
          lastProgress = p;
          onProgress?.(p);
        }
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}.\n${stderr.slice(-1200)}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

// ─── Main render function ─────────────────────────────────────────────────────

/**
 * Renders the final MP4 using FFmpeg:
 * 1. Trim the source video
 * 2. Scale/crop to the card dimensions with the user's transform applied
 * 3. Overlay the static PNG (gradient + text + logo)
 * 4. Encode with AMD AMF (GPU) or libx264 ultrafast (CPU fallback)
 */
export async function renderWithFfmpeg(opts: FfmpegRenderOptions): Promise<void> {
  const {
    inputPath, overlayPngPath, outputPath,
    trimStart, trimEnd,
    transform, videoWidth, videoHeight,
    outWidth = 912, outHeight = 1648,
    fps,
    onProgress,
  } = opts;

  const duration = trimEnd - trimStart;
  const hwEncoder = await getHwEncoder();

  // Scaled video dimensions after applying scale transform
  const scaledW = Math.round(videoWidth * transform.scale);
  const scaledH = Math.round(videoHeight * transform.scale);

  // Center of card + user's x/y offset = top-left position of scaled video on card
  const centerX = outWidth / 2;
  const centerY = outHeight / 2;
  const vidLeft = Math.round(centerX - scaledW / 2 + transform.x);
  const vidTop  = Math.round(centerY - scaledH / 2 + transform.y);

  const filterComplex = [
    `color=black:size=${outWidth}x${outHeight}:rate=${fps}[base]`,
    `[0:v]trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS,scale=${scaledW}:${scaledH},fps=${fps}[scaled]`,
    `[base][scaled]overlay=${vidLeft}:${vidTop}:shortest=1[withvid]`,
    `[withvid][1:v]overlay=0:0:shortest=1[out]`,
  ].join(";");

  const buildArgs = (encoder: string, extraArgs: string[] = []) => [
    "-y",
    "-i", inputPath,
    "-loop", "1", "-i", overlayPngPath,
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-map", "0:a?",
    "-c:a", "aac", "-b:a", "128k",
    "-t", String(duration),
    "-c:v", encoder,
    ...extraArgs,
    "-movflags", "+faststart",
    outputPath,
  ];

  if (hwEncoder) {
    try {
      console.log(`[FFmpegPipeline] Attempting GPU render (${hwEncoder})...`);
      let codecArgs: string[] = ["-b:v", "6M"];
      if (hwEncoder === "h264_nvenc") {
        codecArgs.push("-preset", "p1", "-pix_fmt", "yuv420p");
      } else if (hwEncoder === "h264_amf") {
        codecArgs.push("-quality", "speed", "-pix_fmt", "nv12");
      } else if (hwEncoder === "h264_qsv") {
        codecArgs.push("-preset", "veryfast", "-pix_fmt", "nv12");
      } else if (hwEncoder === "h264_videotoolbox") {
        codecArgs.push("-realtime", "1", "-pix_fmt", "nv12");
      }
      const gpuArgs = buildArgs(hwEncoder, codecArgs);
      await runFfmpeg(gpuArgs, duration, fps, onProgress);
      return;
    } catch (err) {
      console.warn(`[FFmpegPipeline] GPU render (${hwEncoder}) failed or not supported in this context. Falling back to CPU...`, err);
    }
  }

  console.log("[FFmpegPipeline] Running CPU render (libx264 ultrafast)...");
  const cpuArgs = buildArgs("libx264", ["-preset", "ultrafast", "-b:v", "6M", "-pix_fmt", "yuv420p"]);
  await runFfmpeg(cpuArgs, duration, fps, onProgress);
}
