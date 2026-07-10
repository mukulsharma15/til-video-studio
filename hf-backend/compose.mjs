#!/usr/bin/env node
/**
 * Generates a HyperFrames composition matching studio.html's video-card look,
 * then renders it via `npx hyperframes render` on the device GPU.
 *
 * Reads one JSON blob on stdin (or --params-file), matching studio.html's S
 * state 1:1 — see the field list below. Writes the composition into
 * <project>/index.html and copies the uploaded video into <project>/media/.
 *
 *   node compose.mjs --project ./project --video in.mp4 --params-file p.json --out out.mp4 --quality high
 */
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";

function die(m) { console.error("✗ " + m); process.exit(1); }
function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const FMT = { square: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 } };

// studio.html's parse(): "*word*" -> accent span. Mirrors studio.html's `parse()`.
function renderHeadline(raw, accent) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(raw || "").replace(/\*([^*]+)\*/g, `<span style="color:${accent}">$1</span>`);
}

function videoLayers({ fit, dur, mediaStart, muted }) {
  // Mirrors studio.html's drawSourceBg(): cover / contain / blur (blurred cover-fill + contained fg).
  const common = `data-start="0" data-duration="${dur}" data-media-start="${mediaStart}" muted playsinline`;
  if (fit === "blur") {
    return `
      <video id="bgblur" class="clip" src="media/input.mp4" data-track-index="0" ${common}
        style="position:absolute;inset:-6%;width:112%;height:112%;object-fit:cover;filter:blur(38px) brightness(0.72);"></video>
      <video id="bgfg" class="clip" src="media/input.mp4" data-track-index="1" ${common}
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;"></video>`;
  }
  if (fit === "contain") {
    return `
      <div id="bgblack" class="clip" data-start="0" data-duration="${dur}" data-track-index="0" style="position:absolute;inset:0;background:#000;"></div>
      <video id="bgfg" class="clip" src="media/input.mp4" data-track-index="1" ${common}
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;"></video>`;
  }
  // cover (default)
  return `
      <video id="bgfg" class="clip" src="media/input.mp4" data-track-index="0" ${common}
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>`;
}

function composition(p) {
  const { w, h } = FMT[p.fmt === "square" ? "square" : "story"];
  const hlSize = p.hlSize || 78;
  const dur = Math.max(0.2, (p.t1 > p.t0 ? p.t1 - p.t0 : p.durHint || 5)).toFixed(3);
  const mediaStart = Math.max(0, p.t0 || 0).toFixed(3);
  const accent = p.accent || "#f55d4e";
  const audio = p.muted ? "" : `
      <audio id="bgaud" src="media/input.mp4" data-start="0" data-duration="${dur}" data-media-start="${mediaStart}" data-track-index="10" data-volume="1"></audio>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${w}, height=${h}" />
    <title>The Indic League</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=Bebas+Neue&family=Oswald:wght@600;700&family=Libre+Baskerville:ital,wght@0,700;1,700&family=Cormorant+Garamond:ital,wght@0,700;1,700&family=DM+Serif+Display:ital@0;1&family=Lora:ital,wght@0,700;1,700&family=Anton&family=Archivo+Black&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: #0a0806; }
      #root { position: relative; width: ${w}px; height: ${h}px; overflow: hidden; }
      #scrim { position: absolute; inset: 0; background: linear-gradient(to top,
        rgba(10,8,6,0.94) 0%, rgba(10,8,6,0.72) 16%, rgba(10,8,6,0.30) 32%, rgba(10,8,6,0.0) 52%, rgba(10,8,6,0.28) 100%); }
      #logo { position: absolute; top: 44px; right: 44px; width: 120px; height: 120px; }
      #logo img { width: 100%; height: 100%; object-fit: contain; }
      #caption { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 64px ${h === 1920 ? 90 : 56}px;
        display: flex; flex-direction: column; align-items: flex-start; }
      .kicker { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
      .pill { font-family: "Instrument Sans", sans-serif; font-weight: 700; font-size: 26px;
        letter-spacing: 1.5px; text-transform: uppercase; color: #fff; background: ${accent};
        padding: 9px 20px 8px; border-radius: 999px; }
      .date { font-family: "IBM Plex Mono", monospace; font-size: 24px; color: rgba(255,255,255,0.62); }
      .headline { font-family: "${p.hlFont || "Playfair Display"}", serif; font-weight: 800; font-size: ${hlSize}px;
        line-height: 1.08; letter-spacing: -0.5px; color: #fff; max-width: ${w - 128}px; text-wrap: balance; }
      .footer { width: ${w - 128}px; margin-top: 30px; padding-top: 26px;
        border-top: 1.5px solid rgba(255,255,255,0.18); display: flex; align-items: center;
        justify-content: space-between; font-family: "Instrument Sans", sans-serif; }
      .footer .lead { font-weight: 600; font-size: 27px; color: #fff; }
      .footer .site { font-weight: 400; font-size: 23px; color: rgba(255,255,255,0.55); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="${w}" data-height="${h}">
      ${videoLayers({ fit: p.fit || "blur", dur, mediaStart, muted: p.muted })}
      <div id="scrim" class="clip" data-start="0" data-duration="${dur}" data-track-index="2"></div>
      <div id="logo" class="clip" data-start="0" data-duration="${dur}" data-track-index="4"><img src="logo.png" alt="" /></div>
      <div id="caption" class="clip" data-start="0" data-duration="${dur}" data-track-index="3">
        <div class="kicker"><span class="pill">${p.category || "News"}</span><span class="date">— ${p.date || ""}</span></div>
        <h1 class="headline">${renderHeadline(p.headline, accent)}</h1>
        <div class="footer"><span class="lead">${p.footer || "Watch &amp; share"}</span><span class="site">${p.site || "theindicleague.in"}</span></div>
      </div>${audio}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.from(".kicker",   { y: 24, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.08);
      tl.from(".headline", { y: 34, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.18);
      tl.from(".footer",   { y: 16, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.42);
      tl.from("#logo",     { y: -12, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.12);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>`;
}

async function main() {
  const projectDir = resolve(arg("project"));
  const videoIn = arg("video");
  const paramsFile = arg("params-file");
  const out = resolve(arg("out", "out.mp4"));
  const quality = arg("quality", "standard"); // hyperframes' own recommended default — "high" roughly doubles render time
  if (!projectDir || !videoIn || !paramsFile) die("--project, --video, --params-file are required");
  if (!existsSync(videoIn)) die("video not found: " + videoIn);

  const params = JSON.parse(await readFile(paramsFile, "utf8"));
  await mkdir(join(projectDir, "media"), { recursive: true });
  await copyFile(resolve(videoIn), join(projectDir, "media", "input.mp4"));
  await writeFile(join(projectDir, "index.html"), composition(params));

  const t0 = Date.now();
  const r = spawnSync("npx", ["--yes", "hyperframes@0.7.45", "render", "--quality", quality, "--output", out], {
    cwd: projectDir, stdio: "inherit",
    env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" },
  });
  if (r.status !== 0 || !existsSync(out)) die("hyperframes render failed");
  console.error(`✓ rendered in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
}

main().catch((e) => die(e.stack || String(e)));
