import { parseStyledText } from "../../lib/render/parseStyledText";
import type { VideoStyle } from "../../lib/render/types";

type Props = {
  headlineRaw: string;
  category: string;
  date: string;
  footer: string;
  website: string;
  style: VideoStyle;
};

export function isHeadlineTooLong(headline: string) {
  return headline.replace(/[*_]/g, "").length > 170;
}

export function OverlayText({ headlineRaw, category, date, footer, website, style }: Props) {
  const runs = parseStyledText(headlineRaw);
  
  const fontSize = style?.fontSize ?? 78;
  const lift = style?.textLift ?? 0;
  
  const fontFamily = style?.fontFamily ? `"${style.fontFamily}", Georgia, serif` : "Georgia, serif";
  const accent = style?.accentColor ?? "#ff4b3e";

  const HL_WEIGHTS: Record<string, string> = {
    "Playfair Display": "800",
    "Instrument Serif": "400",
    "DM Serif Display": "400",
    "Anton": "400",
    "Archivo Black": "400",
  };
  const fontWeight = HL_WEIGHTS[style?.fontFamily] ?? "700";
  
  // Apply tight editorial spacing and line-heights for serifs
  const isSans = style?.fontFamily === "Instrument Sans" || style?.fontFamily === "Space Grotesk";
  const letterSpacing = isSans ? -1.2 : -2.4;
  const lineHeight = isSans ? 1.05 : 0.94;

  const shadowColor = accent === "#ffffff" ? "rgba(0,0,0,0.3)" : `${accent}55`;

  return (
    <div style={{ position: "absolute", left: 64, right: 64, bottom: 110 + lift, color: "white", textShadow: "0 3px 20px rgba(0,0,0,0.65)", transition: "bottom 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
        <div
          style={{
            background: accent,
            color: accent === "#ffffff" ? "#1a1714" : "white",
            borderRadius: 12,
            padding: "10px 18px",
            fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 0.5,
            boxShadow: `0 6px 26px ${shadowColor}`,
            transition: "background-color 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {category.toUpperCase()}
        </div>
        <div style={{ fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif", fontSize: 22, color: "rgba(255,255,255,0.78)" }}>
          {date}
        </div>
      </div>
      
      <div
        style={{
          fontFamily,
          fontWeight,
          fontSize,
          lineHeight,
          letterSpacing: `${letterSpacing}px`,
          maxHeight: 330,
          overflow: "hidden",
          transition: "font-size 0.2s ease, font-family 0.2s ease",
        }}
      >
        {runs.map((run, index) => (
          <span
            key={`${run.text}-${index}`}
            style={{
              color: run.accent ? accent : "white",
              fontStyle: run.italic || run.accent ? "italic" : "normal",
              transition: "color 0.2s ease",
            }}
          >
            {run.text}
          </span>
        ))}
      </div>
      
      <div style={{ height: 1, background: "rgba(255,255,255,0.24)", marginTop: 34, marginBottom: 24 }} />
      
      <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.86)", fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif", fontSize: 18, fontWeight: 700 }}>
        <span>{footer}</span>
        <span style={{ opacity: 0.78 }}>{website}</span>
      </div>
    </div>
  );
}
