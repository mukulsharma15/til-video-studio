import { AbsoluteFill } from "remotion";

export function BottomGradient({ gradLen, gradDark }: { gradLen: number; gradDark: number }) {
  const k = gradDark / 100;
  
  // Replicate reference app gradient colorStop logic:
  // baseBleed is calculated from gradLen where 50 maps to 0.40.
  // We clamp bleed boundaries between 0.10 and 0.72.
  const bleed = Math.max(0.10, Math.min(0.72, 0.40 - (gradLen - 50) / 100 * 0.5));
  const bg = `linear-gradient(180deg, rgba(8,7,5,0.20) 0%, rgba(8,7,5, ${(0.50 * k).toFixed(3)}) ${Math.round(bleed * 100)}%, rgba(8,7,5, ${(0.82 * k).toFixed(3)}) ${Math.round((bleed + 0.13) * 100)}%, rgba(8,7,5, ${(0.97 * k).toFixed(3)}) 100%)`;
  
  return <AbsoluteFill style={{ background: bg, transition: "background 0.2s ease" }} />;
}
