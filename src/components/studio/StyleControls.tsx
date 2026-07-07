"use client";

import { Type } from "lucide-react";
import { useStudioStore } from "@/lib/store/studioStore";

const SWATCHES = [
  { name: "TIL Coral", hex: "#f55d4e" },
  { name: "Gold", hex: "#e8a020" },
  { name: "White", hex: "#ffffff" },
  { name: "Sky Blue", hex: "#4fa3e0" },
  { name: "Emerald", hex: "#5cc97a" },
  { name: "TIL Red", hex: "#E8382E" },
];

const FONTS = [
  { name: "Playfair Display — Editorial", val: "Playfair Display" },
  { name: "Instrument Serif — Elegant", val: "Instrument Serif" },
  { name: "Libre Baskerville — Classic", val: "Libre Baskerville" },
  { name: "Bebas Neue — Condensed", val: "Bebas Neue" },
  { name: "Oswald — Impact", val: "Oswald" },
  { name: "Instrument Sans — Clean", val: "Instrument Sans" },
  { name: "Cormorant Garamond — Refined", val: "Cormorant Garamond" },
  { name: "DM Serif Display — Modern Serif", val: "DM Serif Display" },
  { name: "Lora — Literary", val: "Lora" },
  { name: "Anton — Poster", val: "Anton" },
  { name: "Archivo Black — Heavy", val: "Archivo Black" },
  { name: "Space Grotesk — Modern Sans", val: "Space Grotesk" },
];

export function StyleControls() {
  const { project, updateStyle } = useStudioStore();
  const style = project.style;

  return (
    <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-4">
      <div className="mb-4 flex items-center gap-2">
        <Type className="h-3.5 w-3.5 text-white/50" />
        <h2 className="text-[10px] font-bold tracking-[0.18em] text-[#86868b] uppercase">
          Style & Typography
        </h2>
      </div>

      <div className="space-y-4">
        {/* Accent Color Selection */}
        <div>
          <span className="text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase block mb-2">
            Accent Color
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((swatch) => {
              const isActive = style?.accentColor.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => updateStyle({ accentColor: swatch.hex })}
                  className="relative h-6 w-6 rounded-full cursor-pointer border border-[#2c2c2e] transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                >
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black drop-shadow" style={{ color: swatch.hex === "#ffffff" ? "#000" : "#fff" }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom Hex Input */}
            <div className="relative flex items-center gap-1.5 ml-1">
              <span className="text-neutral-500 text-xs font-mono">#</span>
              <input
                type="text"
                placeholder="Hex"
                maxLength={6}
                value={style?.accentColor.replace("#", "") ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9a-fA-F]{0,6}$/.test(val)) {
                    updateStyle({ accentColor: `#${val.padEnd(6, "f")}` });
                  }
                }}
                className="w-16 rounded border border-[#2c2c2e] bg-black/35 px-1.5 py-0.5 text-center font-mono text-[10px] text-white outline-none focus:border-neutral-500"
              />
            </div>
          </div>
        </div>

        {/* Font Family Selection */}
        <div>
          <span className="text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase block mb-1.5">
            Headline Font
          </span>
          <select
            value={style?.fontFamily ?? "Playfair Display"}
            onChange={(e) => updateStyle({ fontFamily: e.target.value })}
            className="w-full rounded-xl border border-[#2c2c2e] bg-black/25 p-2 text-xs text-white outline-none focus:border-neutral-500 cursor-pointer"
          >
            {FONTS.map((font) => (
              <option key={font.val} value={font.val} className="bg-[#1c1c1e] text-white">
                {font.name}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size Slider */}
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
            <span>Headline Size</span>
            <span className="font-mono text-white font-semibold">
              {style?.fontSize ?? 78}px
            </span>
          </div>
          <input
            className="w-full accent-white cursor-pointer"
            type="range"
            min={44}
            max={108}
            step={2}
            value={style?.fontSize ?? 78}
            onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
          />
        </label>

        {/* Text Lift Y Slider */}
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
            <span>Text Lift · Y</span>
            <span className="font-mono text-white font-semibold">
              +{style?.textLift ?? 0}px
            </span>
          </div>
          <input
            className="w-full accent-white cursor-pointer"
            type="range"
            min={0}
            max={400}
            step={10}
            value={style?.textLift ?? 0}
            onChange={(e) => updateStyle({ textLift: Number(e.target.value) })}
          />
        </label>

        {/* Gradient Height Slider */}
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
            <span>Gradient Height</span>
            <span className="font-mono text-white font-semibold">
              {style?.gradLen ?? 50}%
            </span>
          </div>
          <input
            className="w-full accent-white cursor-pointer"
            type="range"
            min={0}
            max={100}
            step={1}
            value={style?.gradLen ?? 50}
            onChange={(e) => updateStyle({ gradLen: Number(e.target.value) })}
          />
        </label>

        {/* Gradient Strength Slider */}
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase">
            <span>Gradient Strength</span>
            <span className="font-mono text-white font-semibold">
              {style?.gradDark ?? 97}%
            </span>
          </div>
          <input
            className="w-full accent-white cursor-pointer"
            type="range"
            min={40}
            max={100}
            step={1}
            value={style?.gradDark ?? 97}
            onChange={(e) => updateStyle({ gradDark: Number(e.target.value) })}
          />
        </label>

        {/* Logo Watermark Show/Hide Toggle */}
        <div>
          <span className="text-[9px] font-bold tracking-[0.12em] text-[#86868b] uppercase block mb-1.5">
            Logo Watermark
          </span>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-black/25 p-1 border border-[#2c2c2e]">
            <button
              type="button"
              onClick={() => updateStyle({ logoOn: true })}
              className={`rounded py-1 text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                style?.logoOn ? "bg-white text-black shadow-sm" : "text-neutral-400 hover:text-white"
              }`}
            >
              Show
            </button>
            <button
              type="button"
              onClick={() => updateStyle({ logoOn: false })}
              className={`rounded py-1 text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                !style?.logoOn ? "bg-white text-black shadow-sm" : "text-neutral-400 hover:text-white"
              }`}
            >
              Hide
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
