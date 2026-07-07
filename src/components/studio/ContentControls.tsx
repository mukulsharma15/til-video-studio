"use client";

import type { ReactNode } from "react";
import { isHeadlineTooLong } from "@/components/remotion/OverlayText";
import { useStudioStore } from "@/lib/store/studioStore";

const categories = ["NEWS", "BREAKING", "POLITICS", "DEFENCE", "WORLD", "ANALYSIS", "SPORTS"];

export function ContentControls() {
  const { project, updateContent } = useStudioStore();
  const tooLong = isHeadlineTooLong(project.content.headlineRaw);
  return (
    <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-[10px] font-bold tracking-[0.18em] text-[#86868b] uppercase">
          Text Overlay
        </h2>
      </div>
      
      <label className="block text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
        Headline
      </label>
      <textarea
        value={project.content.headlineRaw}
        onChange={(event) => updateContent({ headlineRaw: event.target.value })}
        rows={4}
        className="mt-2 w-full rounded-xl border border-[#2c2c2e] bg-black/25 p-3.5 text-xs leading-5 text-white outline-none transition focus:border-neutral-500"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-neutral-500">
        <span>
          <b className="text-white/80 font-bold">*word*</b> accent · _word_ italic · *_word_* both
        </span>
        <span className="font-mono">
          {project.content.headlineRaw.replace(/[*_]/g, "").length}/170
        </span>
      </div>
      
      {tooLong ? (
        <p className="mt-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-[11px] text-yellow-100/90 leading-4">
          Headline is too long and may be clipped. Shorten it for a clean layout.
        </p>
      ) : null}
      
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            value={project.content.category}
            onChange={(event) => updateContent({ category: event.target.value })}
            className="field"
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input
            value={project.content.date}
            onChange={(event) => updateContent({ date: event.target.value })}
            className="field"
          />
        </Field>
        <Field label="Footer">
          <input
            value={project.content.footer}
            onChange={(event) => updateContent({ footer: event.target.value })}
            className="field"
          />
        </Field>
        <Field label="Website">
          <input
            value={project.content.website}
            onChange={(event) => updateContent({ website: event.target.value })}
            className="field"
          />
        </Field>
      </div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
