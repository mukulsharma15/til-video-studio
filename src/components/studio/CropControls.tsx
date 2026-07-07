"use client";

import { RotateCcw, RotateCw } from "lucide-react";
import { useStudioStore } from "@/lib/store/studioStore";

export function CropControls() {
  const { project, updateTransform, resetCrop, rotateVideo } = useStudioStore();
  const video = project.video;
  return (
    <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-[10px] font-bold tracking-[0.18em] text-[#86868b] uppercase">
          Crop & Transform
        </h2>
      </div>
      {!video ? (
        <p className="text-xs text-neutral-500">Upload a video to enable crop controls.</p>
      ) : (
        <div className="space-y-4">
          <Slider
            label="X Position"
            min={-500}
            max={500}
            value={video.transform.x}
            onChange={(x) => updateTransform({ x })}
          />
          <Slider
            label="Y Position"
            min={-800}
            max={800}
            value={video.transform.y}
            onChange={(y) => updateTransform({ y })}
          />
          <Slider
            label="Zoom"
            min={video.transform.scale < 1 ? 0.2 : 1}
            max={5}
            step={0.01}
            value={video.transform.scale}
            onChange={(scale) => updateTransform({ scale })}
          />
          <div className="flex gap-3">
            <button className="btn-secondary" type="button" onClick={resetCrop}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button className="btn-secondary" type="button" onClick={rotateVideo}>
              <RotateCw className="h-3.5 w-3.5" /> Rotate 90°
            </button>
          </div>
          <p className="text-[10px] text-neutral-500">
            Blank edges are automatically prevented by crop clamping.
          </p>
        </div>
      )}
    </section>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
        <span>{label}</span>
        <span className="font-mono text-white font-semibold">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        className="w-full accent-white cursor-pointer"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
