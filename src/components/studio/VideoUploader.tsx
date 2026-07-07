"use client";

import { UploadCloud } from "lucide-react";
import { useRef } from "react";
import { useStudioStore } from "@/lib/store/studioStore";

type Metadata = { width: number; height: number; durationInSeconds: number };

export function VideoUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { setVideo, setUploadState, isUploading, uploadError } = useStudioStore();
  async function onFile(file: File) {
    try {
      setUploadState(true, null);
      if (!file.type.startsWith("video/")) throw new Error("Upload a video file: MP4, MOV, or WebM.");
      
      // Load local blob URL
      const localUrl = URL.createObjectURL(file);
      const metadata = await readVideoMetadata(localUrl);

      setVideo({
        src: localUrl,
        fileName: file.name,
        width: metadata.width,
        height: metadata.height,
        durationInSeconds: metadata.durationInSeconds
      });
      
      setUploadState(false, null);
    } catch (error) { 
      setUploadState(false, error instanceof Error ? error.message : "Failed to load local video."); 
    }
  }
  return (
    <section className="rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] p-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-[10px] font-bold tracking-[0.18em] text-[#86868b] uppercase">
          Video Source
        </h2>
      </div>
      
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#2c2c2e] bg-black/25 px-4 text-center cursor-pointer transition-all duration-200 hover:border-neutral-500 hover:bg-white/[0.02] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <UploadCloud className="mb-2.5 h-6 w-6 text-white/50" />
        <span className="text-xs font-semibold text-white">
          {isUploading ? "Uploading..." : "Upload MP4 / MOV / WebM"}
        </span>
        <span className="mt-1 text-[10px] text-neutral-500">
          Max 250MB local files
        </span>
      </button>
      
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      {uploadError ? (
        <p className="mt-3 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs text-red-200">
          {uploadError}
        </p>
      ) : null}
    </section>
  );
}

function readVideoMetadata(url: string): Promise<Metadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      // Force Chrome to seek to the end of the Blob stream to parse the correct duration
      video.currentTime = 1e101;
    };
    video.onseeked = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationInSeconds: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10
      });
    };
    video.onerror = () => {
      reject(new Error("Could not read video metadata."));
    };
    video.src = url;
  });
}
