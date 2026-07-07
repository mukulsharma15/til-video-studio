export type VideoTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type StyledTextRun = {
  text: string;
  accent?: boolean;
  italic?: boolean;
};

export type UploadedVideo = {
  src: string;
  fileName: string;
  width: number;
  height: number;
  durationInSeconds: number;
  transform: VideoTransform;
  trimStart?: number;
  trimEnd?: number;
};

export type VideoStyle = {
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  textLift: number;
  gradLen: number;
  gradDark: number;
  logoOn: boolean;
};

export type VideoProject = {
  video: UploadedVideo | null;
  content: {
    headlineRaw: string;
    category: string;
    date: string;
    footer: string;
    website: string;
  };
  style: VideoStyle;
  render: {
    width: 1080;
    height: 1920;
    fps: 24 | 30;
    durationInSeconds: number;
  };
};

export type RenderableVideoProject = VideoProject & { video: UploadedVideo };
