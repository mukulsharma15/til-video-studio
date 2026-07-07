import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { parseStyledText } from "./parseStyledText";
import type { RenderableVideoProject } from "./types";

// Canvas dimensions match our 912x1648 card aspect ratio inside the 1080x1920 frame
const W = 912;
const H = 1648;

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  
  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }

  // Load from unpkg CDN (multithreaded/coop headers required)
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function hexToRgba(hex: string, alpha = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawOverlayCanvas(project: RenderableVideoProject): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) return reject(new Error("Could not get 2D context"));
    const ctx = canvasContext;

    const { content, style } = project;
    const accent = style.accentColor;
    const fontSize = style.fontSize;
    const lift = style.textLift ?? 0;

    // 1. Draw Bottom Gradient
    const k = style.gradDark / 100;
    const bleed = Math.max(0.10, Math.min(0.72, 0.40 - (style.gradLen - 50) / 100 * 0.5));
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,              `rgba(8,7,5,0.20)`);
    grad.addColorStop(bleed,          `rgba(8,7,5,${(0.50 * k).toFixed(3)})`);
    grad.addColorStop(bleed + 0.13,   `rgba(8,7,5,${(0.82 * k).toFixed(3)})`);
    grad.addColorStop(1,              `rgba(8,7,5,${(0.97 * k).toFixed(3)})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Draw Logo Watermark
    if (style.logoOn) {
      const logo = new Image();
      logo.onload = () => {
        const logoH = 100;
        const logoW = Math.round((logo.width / logo.height) * logoH);
        const margin = 60;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logo, W - margin - logoW, margin, logoW, logoH);
        ctx.globalAlpha = 1;
        drawText();
      };
      logo.onerror = () => drawText();
      logo.src = "/logo.png";
    } else {
      drawText();
    }

    // 3. Draw Typography and Text Overlays
    function drawText() {
      const LEFT = 64;
      const RIGHT_MARGIN = 64;
      const MAX_W = W - LEFT - RIGHT_MARGIN;
      const BOTTOM_BASE = H - 110 - lift;

      const uiFont = "system-ui, -apple-system, sans-serif";
      const isSerif = !["Instrument Sans", "Space Grotesk", "Bebas Neue", "Oswald", "Anton", "Archivo Black"].includes(style.fontFamily);
      const letterSpacing = isSerif ? -2 : -1;

      // Footer Row
      const FOOTER_Y = BOTTOM_BASE;
      ctx.font = `bold 18px ${uiFont}`;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.fillText(content.footer, LEFT, FOOTER_Y);

      const websiteW = ctx.measureText(content.website).width;
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillText(content.website, W - RIGHT_MARGIN - websiteW, FOOTER_Y);

      // Divider Line
      const DIVIDER_Y = FOOTER_Y - 24;
      ctx.beginPath();
      ctx.moveTo(LEFT, DIVIDER_Y);
      ctx.lineTo(W - RIGHT_MARGIN, DIVIDER_Y);
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Headline Text wrapped with formatting runs
      const weightMap: Record<string, string> = {
        "Playfair Display": "800",
        "Instrument Serif": "400",
        "DM Serif Display": "400",
        "Anton": "400",
        "Archivo Black": "400",
        "Bebas Neue": "400",
        "Oswald": "600",
        "Cormorant Garamond": "700",
        "Libre Baskerville": "700",
        "Lora": "700",
        "Instrument Sans": "700",
        "Space Grotesk": "700",
      };
      const fontWeight = weightMap[style.fontFamily] ?? "700";
      const lineHeight = isSerif ? fontSize * 0.94 : fontSize * 1.05;

      const runs = parseStyledText(content.headlineRaw);

      type Word = { text: string; accent: boolean; italic: boolean };
      const words: Word[] = [];
      for (const run of runs) {
        const parts = run.text.split(/(\s+)/);
        for (const part of parts) {
          words.push({ text: part, accent: !!run.accent, italic: !!run.italic });
        }
      }

      const lines: Word[][] = [];
      let currentLine: Word[] = [];
      let currentLineW = 0;

      for (const word of words) {
        if (!word.text) continue;
        const isItalic = word.italic || word.accent;
        ctx.font = `${isItalic ? "italic " : ""}${fontWeight} ${fontSize}px "${style.fontFamily}"`;
        const wordW = ctx.measureText(word.text).width;

        if (currentLineW + wordW > MAX_W && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [word];
          currentLineW = wordW;
        } else {
          currentLine.push(word);
          currentLineW += wordW;
        }
      }
      if (currentLine.length > 0) lines.push(currentLine);

      const HEADLINE_BOTTOM = DIVIDER_Y - 34;
      let lineY = HEADLINE_BOTTOM - (lines.length - 1) * lineHeight;

      for (const line of lines) {
        let x = LEFT;
        for (const word of line) {
          if (!word.text) continue;
          const isItalic = word.italic || word.accent;
          ctx.font = `${isItalic ? "italic " : ""}${fontWeight} ${fontSize}px "${style.fontFamily}"`;
          ctx.fillStyle = word.accent ? accent : "white";
          ctx.fillText(word.text, x, lineY);
          x += ctx.measureText(word.text).width + letterSpacing;
        }
        lineY += lineHeight;
      }

      // Kicker Badge (Category + Date)
      const BADGE_BOTTOM = HEADLINE_BOTTOM - (lines.length) * lineHeight - 30;
      const BADGE_Y = BADGE_BOTTOM;

      ctx.font = `900 22px ${uiFont}`;
      const badgeText = content.category.toUpperCase();
      const badgeTextW = ctx.measureText(badgeText).width;
      const BADGE_PAD_X = 18;
      const BADGE_PAD_Y = 10;
      const BADGE_W = badgeTextW + BADGE_PAD_X * 2;
      const BADGE_H = 22 + BADGE_PAD_Y * 2;
      const BADGE_R = 12;

      const accentRgba = hexToRgba(accent, 0.35);
      ctx.shadowColor = accentRgba;
      ctx.shadowBlur = 26;

      ctx.beginPath();
      ctx.roundRect(LEFT, BADGE_Y - BADGE_H + BADGE_PAD_Y, BADGE_W, BADGE_H, BADGE_R);
      const isWhiteAccent = accent.toLowerCase() === "#ffffff";
      ctx.fillStyle = isWhiteAccent ? "#ffffff" : accent;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      ctx.fillStyle = isWhiteAccent ? "#1a1714" : "white";
      ctx.fillText(badgeText, LEFT + BADGE_PAD_X, BADGE_Y);

      ctx.font = `400 22px ${uiFont}`;
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillText(content.date, LEFT + BADGE_W + 20, BADGE_Y);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas blob generation failed"));
      }, "image/png");
    }
  });
}

export type ClientRenderOptions = {
  project: RenderableVideoProject;
  onProgress: (p: number) => void;
  onLog?: (msg: string) => void;
};

/**
 * Composites and renders the video client-side in the user's browser using WebAssembly FFmpeg.
 */
export async function renderVideoClientSide(opts: ClientRenderOptions): Promise<string> {
  const { project, onProgress, onLog } = opts;
  const video = project.video;
  const transform = video.transform;

  onProgress(0.01);
  const ffmpeg = await getFFmpeg(onLog);

  // 1. Generate Overlay static PNG client-side
  onProgress(0.05);
  const overlayBlob = await drawOverlayCanvas(project);
  
  // 2. Load assets into WASM file system
  onProgress(0.10);
  const videoData = await fetchFile(video.src);
  await ffmpeg.writeFile("input.mp4", videoData);
  
  const overlayData = new Uint8Array(await overlayBlob.arrayBuffer());
  await ffmpeg.writeFile("overlay.png", overlayData);

  // 3. Compute scale, pad, translate coordinates matching preview layout
  const outWidth = 912;
  const outHeight = 1648;
  const fps = project.render.fps;
  const trimStart = video.trimStart ?? 0;
  const trimEnd = video.trimEnd ?? video.durationInSeconds;
  const duration = trimEnd - trimStart;

  const scaledW = Math.round(video.width * transform.scale);
  const scaledH = Math.round(video.height * transform.scale);
  const centerX = outWidth / 2;
  const centerY = outHeight / 2;
  const vidLeft = Math.round(centerX - scaledW / 2 + transform.x);
  const vidTop  = Math.round(centerY - scaledH / 2 + transform.y);

  // 4. Construct FFmpeg filter graph
  const filterComplex = [
    `color=black:size=${outWidth}x${outHeight}:rate=${fps}[base]`,
    `[0:v]trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS,scale=${scaledW}:${scaledH},fps=${fps}[scaled]`,
    `[base][scaled]overlay=${vidLeft}:${vidTop}:shortest=1[withvid]`,
    `[withvid][1:v]overlay=0:0:shortest=1[out]`,
  ].join(";");

  // Track progress from logs
  let totalFrames = Math.ceil(duration * fps);
  ffmpeg.on("log", ({ message }) => {
    const frameMatch = message.match(/frame=\s*(\d+)/);
    if (frameMatch) {
      const frame = parseInt(frameMatch[1], 10);
      const progressPercent = 0.10 + (frame / totalFrames) * 0.88;
      onProgress(Math.min(progressPercent, 0.98));
    }
  });

  // 5. Run WebAssembly FFmpeg encoding (uses browser CPU/threads)
  await ffmpeg.exec([
    "-y",
    "-i", "input.mp4",
    "-loop", "1", "-i", "overlay.png",
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-map", "0:a?",
    "-c:a", "aac", "-b:a", "128k",
    "-t", String(duration),
    "-c:v", "libx264", "-preset", "ultrafast", "-b:v", "6M", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "output.mp4"
  ]);

  onProgress(0.99);
  
  // 6. Retrieve rendered MP4 file from WASM filesystem
  const fileData = await ffmpeg.readFile("output.mp4");
  const url = URL.createObjectURL(new Blob([(fileData as any).buffer], { type: "video/mp4" }));
  
  // Clean up
  await ffmpeg.deleteFile("input.mp4");
  await ffmpeg.deleteFile("overlay.png");
  await ffmpeg.deleteFile("output.mp4");

  onProgress(1.0);
  return url;
}
