import { describe, expect, it } from "vitest";
import { clampTransform, getCoverScale, getCoverTransform, rotateTransform } from "@/lib/render/videoFit";
const frame = { width: 1080, height: 1920 };
describe("videoFit", () => {
  it("covers a horizontal video in a vertical frame", () => { const media = { width: 1920, height: 1080 }; expect(getCoverScale(media, frame)).toBeCloseTo(1.7777, 3); expect(getCoverTransform(media, frame)).toMatchObject({ x: 0, y: 0, rotation: 0 }); });
  it("covers a vertical video without unnecessary zoom", () => { const media = { width: 1080, height: 1920 }; expect(getCoverScale(media, frame)).toBe(1); });
  it("clamps pan so blank edges cannot appear", () => { const media = { width: 1080, height: 1920 }; const clamped = clampTransform({ x: 999, y: -999, scale: 1, rotation: 0 }, media, frame); expect(clamped.x).toBe(0); expect(clamped.y).toBe(0); });
  it("rotates and recalculates cover scale", () => { const media = { width: 1920, height: 1080 }; const next = rotateTransform({ x: 0, y: 0, scale: 1, rotation: 0 }, media, frame); expect(next.rotation).toBe(90); expect(next.scale).toBeCloseTo(1, 3); });
});
