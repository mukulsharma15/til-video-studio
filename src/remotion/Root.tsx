import { Composition } from "remotion";
import { IndicLeagueReel } from "../components/remotion/IndicLeagueReel";
import type { RenderableVideoProject } from "../lib/render/types";

const sampleProject: RenderableVideoProject = {
  video: { src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", fileName: "sample.mp4", width: 1280, height: 720, durationInSeconds: 8, transform: { x: 0, y: 0, scale: 2.667, rotation: 0 } },
  content: { headlineRaw: "UP Police *Daroga* Caught _Stealing_ 20K! Driver Beats Him on Road 😡", category: "NEWS", date: "Jul 2026", footer: "Watch & share", website: "theindicleague.in" },
  style: {
    accentColor: "#ff4b3e",
    fontFamily: "Playfair Display",
    fontSize: 60,
    textLift: 0,
    gradLen: 50,
    gradDark: 97,
    logoOn: true,
  },
  render: { width: 1080, height: 1920, fps: 24, durationInSeconds: 8 },
};

type RemotionRootProps = {
  assetBaseUrl?: string;
};

export function RemotionRoot({ assetBaseUrl }: RemotionRootProps) {
  return (
    <Composition
      id="IndicLeagueReel"
      component={IndicLeagueReel}
      durationInFrames={240}
      fps={24}
      width={1080}
      height={1920}
      defaultProps={{ project: sampleProject }}
      calculateMetadata={({ props }) => {
        const project = props.project as RenderableVideoProject;
        return { durationInFrames: Math.max(30, Math.ceil(project.render.durationInSeconds * project.render.fps)), fps: project.render.fps, width: project.render.width, height: project.render.height };
      }}
    />
  );
}
