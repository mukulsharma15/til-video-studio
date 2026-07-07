"use client";

import { Download, Film, Loader2 } from "lucide-react";
import { useState } from "react";
import { useStudioStore } from "@/lib/store/studioStore";
import { renderVideoClientSide } from "@/lib/render/clientRenderer";
import type { RenderableVideoProject } from "@/lib/render/types";

type RenderState = "idle" | "rendering" | "done" | "error";

export function RenderPanel() {
  const { project } = useStudioStore();
  const [state, setState] = useState<RenderState>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function renderVideo() {
    if (!project.video) return;
    setState("rendering");
    setProgress(0);
    setError(null);
    setUrl(null);

    try {
      // Cast project as RenderableVideoProject since we verified project.video exists
      const renderableProject = project as RenderableVideoProject;

      const outputUrl = await renderVideoClientSide({
        project: renderableProject,
        onProgress: (p) => setProgress(p),
        onLog: (msg) => {
          // You can log compiling details here if desired
          console.log("[Client FFmpeg]", msg);
        }
      });

      setUrl(outputUrl);
      setState("done");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Client-side video render failed.");
      setState("error");
    }
  }

  const percent = Math.round(progress * 100);

  return (
    <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-3.5 w-3.5 text-white/50" />
          <h2 className="text-[10px] font-bold tracking-[0.18em] text-[#86868b] uppercase">
            Export Video
          </h2>
        </div>
      </div>

      {state === "rendering" ? (
        <div className="space-y-3 rounded-xl border border-[#2c2c2e] bg-black/25 p-3.5">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-neutral-300">
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-white" />
              {percent < 10 ? "PREPARING WASM..." : "RENDERING VIDEO..."}
            </span>
            <span className="font-mono text-white">{percent}%</span>
          </div>

          <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="text-[9px] text-neutral-500 text-center font-semibold uppercase tracking-wider">
            Rendering on client (your GPU/CPU). Do not close this tab.
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled={!project.video}
          onClick={() => void renderVideo()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0071e3] px-5 py-3.5 font-bold text-xs text-white shadow-md transition-all duration-200 hover:bg-[#147ce5] active:scale-[0.98] active:bg-[#005bb5] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 cursor-pointer"
        >
          <Film className="h-4 w-4" />
          Render Client-Side MP4
        </button>
      )}

      <p className="mt-3 text-[10px] leading-4 text-neutral-500">
        Renders fully on your client device. No server-side limits, max 30s clips.
      </p>

      {url ? (
        <a
          href={url}
          download={`${project.content.category.toLowerCase()}_reel.mp4`}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#2c2c2e] bg-black/25 px-5 py-3 text-xs font-semibold text-white transition-all duration-200 hover:bg-white/[0.04]"
        >
          <Download className="h-3.5 w-3.5 text-neutral-400" />
          Download Rendered MP4
        </a>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs text-red-200 leading-4">
          {error}
        </p>
      ) : null}
    </section>
  );
}
