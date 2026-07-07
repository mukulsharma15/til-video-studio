"use client";

import { useEffect } from "react";
import { ContentControls } from "./ContentControls";
import { CropControls } from "./CropControls";
import { TrimControls } from "./TrimControls";
import { StyleControls } from "./StyleControls";
import { RenderPanel } from "./RenderPanel";
import { VideoPreviewPanel } from "./VideoPreviewPanel";
import { VideoUploader } from "./VideoUploader";

export function StudioShell() {
  return (
    <main className="min-h-screen bg-black text-[#f5f5f7]">
      <div className="relative mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-5 lg:h-screen lg:flex-row lg:overflow-hidden">
        {/* Left Sidebar */}
        <aside className="space-y-4 lg:w-[380px] lg:overflow-y-auto lg:pr-1">
          <header className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="The Indic League Logo"
                className="h-8 w-auto object-contain"
              />
              <div>
                <p className="text-sm font-black tracking-tight text-white leading-tight">
                  The Indic <span className="font-serif italic text-neutral-300">League</span>
                </p>
                <p className="mt-0.5 text-[8px] font-bold tracking-[0.3em] text-[#86868b] uppercase leading-none">
                  Video Studio
                </p>
              </div>
            </div>
          </header>
          <VideoUploader />
          <ContentControls />
          <StyleControls />
          <TrimControls />
          <CropControls />
        </aside>

        {/* Center Preview */}
        <section className="flex flex-1 items-center justify-center rounded-3xl border border-[#2c2c2e] bg-[#1c1c1e]/20 p-5 lg:overflow-auto">
          <VideoPreviewPanel />
        </section>

        {/* Right Sidebar */}
        <aside className="space-y-4 lg:w-[320px] lg:overflow-y-auto">
          <RenderPanel />
          
          <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-5 text-xs text-[#86868b]">
            <h2 className="mb-3 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
              QA CHECKLIST
            </h2>
            <ul className="space-y-2 font-medium">
              <li className="flex items-center gap-2">
                <span className="text-[#0071e3]">✓</span> 9:16 Remotion preview
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#0071e3]">✓</span> Crop, zoom, rotate, reset
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#0071e3]">✓</span> TIL logo + headline overlay
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#0071e3]">✓</span> Styled headline syntax
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#0071e3]">✓</span> MP4 render endpoint
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
