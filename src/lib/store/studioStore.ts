"use client";

import { create } from "zustand";
import { getCoverTransform, rotateTransform, clampTransform } from "@/lib/render/videoFit";
import type { UploadedVideo, VideoProject, VideoTransform, VideoStyle } from "@/lib/render/types";

const FRAME = { width: 1080, height: 1920 } as const;

const defaultProject: VideoProject = {
  video: null,
  content: {
    headlineRaw: "UP Police *Daroga* Caught _Stealing_ 20K! Driver Beats Him on Road 😡",
    category: "NEWS",
    date: "Jul 2026",
    footer: "Watch & share",
    website: "theindicleague.in",
  },
  style: {
    accentColor: "#ff4b3e",
    fontFamily: "Playfair Display",
    fontSize: 60,
    textLift: 0,
    gradLen: 50,
    gradDark: 97,
    logoOn: true,
  },
  render: { width: 1080, height: 1920, fps: 30, durationInSeconds: 8 },
};

type StudioStore = {
  project: VideoProject;
  isUploading: boolean;
  uploadError: string | null;
  setUploadState: (isUploading: boolean, uploadError?: string | null) => void;
  setVideo: (video: Omit<UploadedVideo, "transform">) => void;
  updateContent: (content: Partial<VideoProject["content"]>) => void;
  updateTransform: (transform: Partial<VideoTransform>) => void;
  updateTrim: (trimStart: number, trimEnd: number) => void;
  updateStyle: (style: Partial<VideoStyle>) => void;
  resetCrop: () => void;
  rotateVideo: () => void;
};

export const useStudioStore = create<StudioStore>((set) => ({
  project: defaultProject,
  isUploading: false,
  uploadError: null,
  setUploadState: (isUploading, uploadError = null) => set({ isUploading, uploadError }),
  setVideo: (video) => {
    const transform = getCoverTransform(video, FRAME);
    set((state) => ({ project: { ...state.project, video: { ...video, transform, trimStart: 0, trimEnd: video.durationInSeconds }, render: { ...state.project.render, durationInSeconds: Math.min(video.durationInSeconds, 60) } } }));
  },
  updateContent: (content) => set((state) => ({ project: { ...state.project, content: { ...state.project.content, ...content } } })),
  updateTransform: (transform) => set((state) => {
    if (!state.project.video) return state;
    const next = clampTransform({ ...state.project.video.transform, ...transform }, state.project.video, FRAME);
    return { project: { ...state.project, video: { ...state.project.video, transform: next } } };
  }),
  updateTrim: (trimStart, trimEnd) => set((state) => {
    if (!state.project.video) return state;
    const durationInSeconds = Math.min(trimEnd - trimStart, 60);
    return {
      project: {
        ...state.project,
        video: { ...state.project.video, trimStart, trimEnd },
        render: { ...state.project.render, durationInSeconds: Number(durationInSeconds.toFixed(2)) }
      }
    };
  }),
  resetCrop: () => set((state) => {
    if (!state.project.video) return state;
    return { project: { ...state.project, video: { ...state.project.video, transform: getCoverTransform(state.project.video, FRAME, state.project.video.transform.rotation) } } };
  }),
  rotateVideo: () => set((state) => {
    if (!state.project.video) return state;
    return { project: { ...state.project, video: { ...state.project.video, transform: rotateTransform(state.project.video.transform, state.project.video, FRAME) } } };
  }),
  updateStyle: (style) => set((state) => ({ project: { ...state.project, style: { ...state.project.style, ...style } } })),
}));
