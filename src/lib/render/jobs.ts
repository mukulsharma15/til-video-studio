export type RenderJob = {
  progress: number;
  status: "rendering" | "done" | "error";
  url?: string;
  error?: string;
};

const globalForJobs = global as unknown as {
  renderJobs?: Map<string, RenderJob>;
};

export const renderJobs = globalForJobs.renderJobs ?? new Map<string, RenderJob>();

if (process.env.NODE_ENV !== "production") {
  globalForJobs.renderJobs = renderJobs;
}
