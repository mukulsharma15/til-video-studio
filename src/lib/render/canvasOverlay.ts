import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { parseStyledText } from "./parseStyledText";
import { ensureFonts, FONT_DOWNLOADS, getFontPath } from "./fontCache";
import type { RenderableVideoProject } from "./types";

// Canvas dimensions match the inner video card in IndicLeagueReel.tsx
const W = 912;
const H = 1648;

const registeredPaths = new Set<string>();

function registerFonts() {
  for (const font of FONT_DOWNLOADS) {
    const baseFile = font.file.replace(/\.(ttf|woff2)$/, "");
    const ttfPath = getFontPath(`${baseFile}.ttf`);
    const woffPath = getFontPath(`${baseFile}.woff2`);
    
    if (fs.existsSync(woffPath) && !registeredPaths.has(woffPath)) {
      try {
        GlobalFonts.registerFromPath(woffPath, font.family);
        registeredPaths.add(woffPath);
        console.log(`[CanvasOverlay] Registered font family "${font.family}" from: ${path.basename(woffPath)}`);
      } catch (e) {
        console.error(`Failed to register ${woffPath}`, e);
      }
    } else if (fs.existsSync(ttfPath) && !registeredPaths.has(ttfPath)) {
      try {
        GlobalFonts.registerFromPath(ttfPath, font.family);
        registeredPaths.add(ttfPath);
        console.log(`[CanvasOverlay] Registered font family "${font.family}" from: ${path.basename(ttfPath)}`);
      } catch (e) {
        console.error(`Failed to register ${ttfPath}`, e);
      }
    }
  }
}

function hexToRgba(hex: string, alpha = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildGradient(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, gradLen: number, gradDark: number) {
  const k = gradDark / 100;
  const bleed = Math.max(0.10, Math.min(0.72, 0.40 - (gradLen - 50) / 100 * 0.5));
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,              `rgba(8,7,5,0.20)`);
  grad.addColorStop(bleed,          `rgba(8,7,5,${(0.50 * k).toFixed(3)})`);
  grad.addColorStop(bleed + 0.13,   `rgba(8,7,5,${(0.82 * k).toFixed(3)})`);
  grad.addColorStop(1,              `rgba(8,7,5,${(0.97 * k).toFixed(3)})`);
  return grad;
}

/**
 * Renders the entire static overlay (gradient + text + logo) as a PNG buffer.
 * This replaces all Chromium frame screenshots — called once per render.
 */
export async function renderOverlayPng(project: RenderableVideoProject): Promise<Buffer> {
  await ensureFonts();
  registerFonts();

  const { content, style } = project;
  const accent = style.accentColor;
  const fontSize = style.fontSize;
  const lift = style.textLift ?? 0;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── 1. Bottom gradient ─────────────────────────────────────────────────────
  ctx.fillStyle = buildGradient(ctx, style.gradLen, style.gradDark);
  ctx.fillRect(0, 0, W, H);

  // ── 2. Logo watermark (top-right) ─────────────────────────────────────────
  if (style.logoOn) {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      const logoH = 100;
      const logoW = Math.round((logo.width / logo.height) * logoH);
      const margin = 60;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logo, W - margin - logoW, margin, logoW, logoH);
      ctx.globalAlpha = 1;
    }
  }

  // ── 3. Text overlay (bottom area) ─────────────────────────────────────────
  const LEFT = 64;
  const RIGHT_MARGIN = 64;
  const MAX_W = W - LEFT - RIGHT_MARGIN;
  const BOTTOM_BASE = H - 110 - lift;

  // Measure and lay out text from bottom up
  // First draw divider + footer, then headline, then badge row

  // UI font for badge / footer
  const uiFont = "Inter";
  const isSerif = !["Instrument Sans", "Space Grotesk", "Bebas Neue", "Oswald", "Anton", "Archivo Black"].includes(style.fontFamily);
  const letterSpacing = isSerif ? -2 : -1;

  // ── Footer line ─────────────────────────────────────────────────────────
  const FOOTER_Y = BOTTOM_BASE;
  ctx.font = `bold 18px ${uiFont}`;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText(content.footer, LEFT, FOOTER_Y);

  const websiteW = ctx.measureText(content.website).width;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(content.website, W - RIGHT_MARGIN - websiteW, FOOTER_Y);

  // ── Divider ──────────────────────────────────────────────────────────────
  const DIVIDER_Y = FOOTER_Y - 24;
  ctx.beginPath();
  ctx.moveTo(LEFT, DIVIDER_Y);
  ctx.lineTo(W - RIGHT_MARGIN, DIVIDER_Y);
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Headline text ────────────────────────────────────────────────────────
  // Determine font weight for the chosen family
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

  // Word-wrap aware headline rendering
  // Build words with their style attributes
  type Word = { text: string; accent: boolean; italic: boolean };
  const words: Word[] = [];
  for (const run of runs) {
    const parts = run.text.split(/(\s+)/);
    for (const part of parts) {
      words.push({ text: part, accent: !!run.accent, italic: !!run.italic });
    }
  }

  // Measure and wrap into lines
  const lines: Word[][] = [];
  let currentLine: Word[] = [];
  let currentLineW = 0;

  for (const word of words) {
    if (!word.text) continue;
    const isItalic = word.italic || word.accent;
    ctx.font = `${isItalic ? "italic " : ""}${fontWeight} ${fontSize}px ${style.fontFamily}`;
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

  // Draw lines bottom-up, above divider
  const HEADLINE_BOTTOM = DIVIDER_Y - 34;
  let lineY = HEADLINE_BOTTOM - (lines.length - 1) * lineHeight;

  for (const line of lines) {
    let x = LEFT;
    for (const word of line) {
      if (!word.text) continue;
      const isItalic = word.italic || word.accent;
      ctx.font = `${isItalic ? "italic " : ""}${fontWeight} ${fontSize}px ${style.fontFamily}`;
      ctx.fillStyle = word.accent ? accent : "white";
      ctx.fillText(word.text, x, lineY);
      x += ctx.measureText(word.text).width + letterSpacing;
    }
    lineY += lineHeight;
  }

  // ── Badge row (category + date) ─────────────────────────────────────────
  const BADGE_BOTTOM = HEADLINE_BOTTOM - (lines.length) * lineHeight - 30;
  const BADGE_Y = BADGE_BOTTOM;

  ctx.font = `900 22px "${uiFont}"`;
  const badgeText = content.category.toUpperCase();
  const badgeTextW = ctx.measureText(badgeText).width;
  const BADGE_PAD_X = 18;
  const BADGE_PAD_Y = 10;
  const BADGE_W = badgeTextW + BADGE_PAD_X * 2;
  const BADGE_H = 22 + BADGE_PAD_Y * 2;
  const BADGE_R = 12;

  // Badge shadow glow
  const accentRgba = hexToRgba(accent, 0.35);
  ctx.shadowColor = accentRgba;
  ctx.shadowBlur = 26;

  // Badge background
  ctx.beginPath();
  ctx.roundRect(LEFT, BADGE_Y - BADGE_H + BADGE_PAD_Y, BADGE_W, BADGE_H, BADGE_R);
  const isWhiteAccent = accent.toLowerCase() === "#ffffff";
  ctx.fillStyle = isWhiteAccent ? "#ffffff" : accent;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  // Badge text
  ctx.fillStyle = isWhiteAccent ? "#1a1714" : "white";
  ctx.fillText(badgeText, LEFT + BADGE_PAD_X, BADGE_Y);

  // Date text
  ctx.font = `400 22px "${uiFont}"`;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText(content.date, LEFT + BADGE_W + 20, BADGE_Y);

  return canvas.toBuffer("image/png");
}
