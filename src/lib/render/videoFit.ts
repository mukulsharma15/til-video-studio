import type { VideoTransform } from "./types";

export type Size = { width: number; height: number };

export function getCoverScale(media: Size, frame: Size, rotation = 0): number {
  const rotated = normalizeRotatedSize(media, rotation);
  return Math.max(frame.width / rotated.width, frame.height / rotated.height);
}

export function getCoverTransform(media: Size, frame: Size, rotation = 0): VideoTransform {
  return { x: 0, y: 0, scale: Number(getCoverScale(media, frame, rotation).toFixed(4)), rotation };
}

export function normalizeRotatedSize(size: Size, rotation: number): Size {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalized === 90 || normalized === 270 ? { width: size.height, height: size.width } : size;
}

export function clampTransform(transform: VideoTransform, media: Size, frame: Size): VideoTransform {
  const minScale = getCoverScale(media, frame, transform.rotation);
  const scale = Math.max(transform.scale, minScale);
  const rotated = normalizeRotatedSize(media, transform.rotation);
  const renderedWidth = rotated.width * scale;
  const renderedHeight = rotated.height * scale;
  const maxX = Math.max(0, (renderedWidth - frame.width) / 2);
  const maxY = Math.max(0, (renderedHeight - frame.height) / 2);
  return { ...transform, scale: Number(scale.toFixed(4)), x: clamp(transform.x, -maxX, maxX), y: clamp(transform.y, -maxY, maxY) };
}

export function rotateTransform(transform: VideoTransform, media: Size, frame: Size): VideoTransform {
  const rotation = (transform.rotation + 90) % 360;
  return clampTransform({ x: 0, y: 0, scale: getCoverScale(media, frame, rotation), rotation }, media, frame);
}

function clamp(value: number, min: number, max: number): number {
  const result = Math.min(max, Math.max(min, value));
  return Object.is(result, -0) ? 0 : result;
}
