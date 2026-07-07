import path from "node:path";
import { bundle } from "@remotion/bundler";

/**
 * Module-level bundle cache shared across all API routes in the same
 * Node.js process. Building the Webpack bundle once saves 30–60s per render.
 */
let cachedServeUrl: string | null = null;
let isBundling = false;
const bundleWaiters: Array<(url: string) => void> = [];

export async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;

  if (isBundling) {
    return new Promise((resolve) => bundleWaiters.push(resolve));
  }

  isBundling = true;
  console.log("[BundleCache] Building Remotion bundle...");

  try {
    const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
    const serveUrl = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
    });

    cachedServeUrl = serveUrl;
    console.log("[BundleCache] Bundle ready.");

    for (const resolve of bundleWaiters) resolve(serveUrl);
    bundleWaiters.length = 0;

    return serveUrl;
  } catch (err) {
    // Reset so the next call retries
    isBundling = false;
    cachedServeUrl = null;
    throw err;
  } finally {
    isBundling = false;
  }
}

/** Call this to kick off bundling in the background (non-blocking). */
export function prewarmBundle(): void {
  if (cachedServeUrl || isBundling) return;
  getServeUrl().catch((e) => console.warn("[BundleCache] Prewarm failed:", e.message));
}

export function invalidateBundleCache(): void {
  cachedServeUrl = null;
}
