"use client";

import { Scissors } from "lucide-react";
import { useStudioStore } from "@/lib/store/studioStore";

export function TrimControls() {
  const { project, updateTrim } = useStudioStore();
  const video = project.video;

  if (!video) {
    return (
      <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-[10px] font-bold tracking-[0.18em] text-[#86868b] uppercase">
            Trim Clip
          </h2>
        </div>
        <p className="text-xs text-neutral-500">Upload a video to enable trim controls.</p>
      </section>
    );
  }

  const trimStart = video.trimStart ?? 0;
  const trimEnd = video.trimEnd ?? video.durationInSeconds;

  const handleStartChange = (val: number) => {
    let nextStart = val;
    let nextEnd = trimEnd;
    if (nextStart >= nextEnd) {
      nextEnd = Math.min(nextStart + 0.1, video.durationInSeconds);
      nextStart = Math.max(0, nextEnd - 0.1);
    }
    updateTrim(nextStart, nextEnd);
  };

  const handleEndChange = (val: number) => {
    let nextEnd = val;
    let nextStart = trimStart;
    if (nextEnd <= nextStart) {
      nextStart = Math.max(0, nextEnd - 0.1);
      nextEnd = Math.min(nextStart + 0.1, video.durationInSeconds);
    }
    updateTrim(nextStart, nextEnd);
  };

  const clipDuration = trimEnd - trimStart;

  return (
    <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-3.5 w-3.5 text-white/50" />
          <h2 className="text-[10px] font-bold tracking-[0.18em] text-[#86868b] uppercase">
            Trim Clip
          </h2>
        </div>
        <span className="rounded bg-neutral-800 px-2 py-0.5 text-[9px] font-bold tracking-wider text-neutral-300">
          {clipDuration.toFixed(1)}s Selected
        </span>
      </div>

      <div className="space-y-4">
        <Slider
          label="Start Time"
          min={0}
          max={video.durationInSeconds}
          step={0.1}
          value={trimStart}
          onChange={handleStartChange}
          formatValue={(v) => `${v.toFixed(1)}s`}
        />
        <Slider
          label="End Time"
          min={0}
          max={video.durationInSeconds}
          step={0.1}
          value={trimEnd}
          onChange={handleEndChange}
          formatValue={(v) => `${v.toFixed(1)}s`}
        />

        <div className="rounded-xl border border-[#2c2c2e] bg-black/25 p-3 text-[11px] text-neutral-400 space-y-1">
          <div className="flex justify-between">
            <span>Original duration:</span>
            <span className="font-mono text-neutral-300">{video.durationInSeconds.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Current range:</span>
            <span className="font-mono text-white font-semibold">
              {trimStart.toFixed(1)}s – {trimEnd.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
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
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
        <span>{label}</span>
        <span className="font-mono text-white font-semibold">{formatValue ? formatValue(value) : value.toFixed(0)}</span>
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
