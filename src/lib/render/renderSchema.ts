import { z } from "zod";

export const renderProjectSchema = z.object({
  video: z.object({
    src: z.string().min(1),
    fileName: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    durationInSeconds: z.number().positive().max(180),
    transform: z.object({ x: z.number(), y: z.number(), scale: z.number().positive(), rotation: z.number() }),
    trimStart: z.number().nonnegative().optional(),
    trimEnd: z.number().positive().optional(),
  }),
  content: z.object({
    headlineRaw: z.string().min(1).max(220),
    category: z.string().min(1).max(30),
    date: z.string().min(1).max(30),
    footer: z.string().max(60),
    website: z.string().max(60),
  }),
  style: z.object({
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    fontFamily: z.string().min(1),
    fontSize: z.number().min(40).max(120),
    textLift: z.number().nonnegative().max(500),
    gradLen: z.number().nonnegative().max(100),
    gradDark: z.number().min(40).max(100),
    logoOn: z.boolean(),
  }),
  render: z.object({
    width: z.literal(1080),
    height: z.literal(1920),
    fps: z.union([z.literal(24), z.literal(30)]),
    durationInSeconds: z.number().positive().max(180),
  }),
});
