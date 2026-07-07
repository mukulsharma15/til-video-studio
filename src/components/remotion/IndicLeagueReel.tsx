import { AbsoluteFill, OffthreadVideo } from "remotion";
import type { RenderableVideoProject } from "../../lib/render/types";
import { BottomGradient } from "./BottomGradient";
import { LogoBug } from "./LogoBug";
import { OverlayText } from "./OverlayText";

export function IndicLeagueReel({ project }: { project: RenderableVideoProject }) {
  const { video } = project;
  const transform = video.transform;
  return (
    <AbsoluteFill style={{ backgroundColor: "#11100d", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(135deg,#191612,#070706)" }} />
      <div style={{ position: "absolute", top: 78, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.34)", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 20, letterSpacing: 12 }}>VIDEO · 9:16</div>
      <div style={{ position: "absolute", left: 84, top: 124, width: 912, height: 1648, borderRadius: 42, overflow: "hidden", boxShadow: "0 28px 80px rgba(0,0,0,0.5)", background: "#070707" }}>
        <OffthreadVideo src={video.src} muted startFrom={video.trimStart ? Math.round(video.trimStart * 30) : undefined} endAt={video.trimEnd ? Math.round(video.trimEnd * 30) : undefined} style={{ position: "absolute", left: 456 - video.width / 2, top: 824 - video.height / 2, width: video.width, height: video.height, transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`, transformOrigin: "center center" }} />
        <BottomGradient gradLen={project.style.gradLen} gradDark={project.style.gradDark} />
        <LogoBug logoOn={project.style.logoOn} accentColor={project.style.accentColor} />
        <OverlayText {...project.content} style={project.style} />
      </div>
    </AbsoluteFill>
  );
}
