"use client";

import { Player } from "@remotion/player";
import { IndicLeagueReel } from "@/components/remotion/IndicLeagueReel";
import { useStudioStore } from "@/lib/store/studioStore";
import type { RenderableVideoProject } from "@/lib/render/types";

export function VideoPreviewPanel() {
  const { project } = useStudioStore();
  
  if (!project.video) {
    return (
      <div className="flex h-full min-h-[640px] items-center justify-center rounded-3xl border border-[#2c2c2e] bg-black/20 p-8 text-center">
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] text-[#86868b] uppercase">
            The Indic League
          </p>
          <h1 className="mt-3 text-2xl font-bold text-white tracking-tight">
            Upload a video to start
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-xs text-neutral-500 leading-5">
            The preview and final MP4 render from the same Remotion code, ensuring pixel-perfect results.
          </p>
        </div>
      </div>
    );
  }

  const renderableProject = project as RenderableVideoProject;
  const durationInFrames = Math.max(30, Math.ceil(project.render.durationInSeconds * project.render.fps));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl border border-[#2c2c2e] bg-black/40 p-3.5 shadow-2xl shadow-black/80">
        <Player
          component={IndicLeagueReel}
          inputProps={{ project: renderableProject }}
          durationInFrames={durationInFrames}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          controls
          loop
          style={{ width: 340, height: 604, borderRadius: 12, overflow: "hidden" }}
        />
      </div>
      <div className="text-center text-[10px] font-bold tracking-[0.22em] text-[#86868b] uppercase">
        Live Preview · 1080×1920 · 30fps
      </div>
    </div>
  );
}
