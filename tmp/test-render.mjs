import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const getChromePath = () => {
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
};

async function main() {
  let assetServer;
  try {
    const payloadPath = path.join(process.cwd(), "tmp", "render-payload.json");
    const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
    const project = payload.project;

    // Start a temporary HTTP server to serve the assets to Remotion
    assetServer = http.createServer((req, res) => {
      const decodedUrl = decodeURIComponent(req.url || "");
      const filePath = path.join(process.cwd(), "public", decodedUrl);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { "Content-Type": "video/mp4" });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    // Listen on a random free port
    await new Promise((resolve) => assetServer.listen(0, "127.0.0.1", resolve));
    const port = assetServer.address().port;
    const localAssetBaseUrl = `http://127.0.0.1:${port}`;
    console.log(`Temp asset server listening on ${localAssetBaseUrl}`);

    // Rewrite video.src to be served by our temp asset server
    if (project.video && project.video.src.startsWith("/")) {
      project.video.src = `${localAssetBaseUrl}${project.video.src}`;
      console.log("Rewrote video src to:", project.video.src);
    }

    const chromePath = getChromePath();
    console.log("Using Chrome path:", chromePath);

    const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
    console.log("Bundling... Entry:", entryPoint);
    const serveUrl = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
    });
    console.log("Serve URL:", serveUrl);

    console.log("Selecting composition...");
    const composition = await selectComposition({
      serveUrl,
      id: "IndicLeagueReel",
      inputProps: { project },
      browserExecutable: chromePath,
    });
    console.log("Composition selected:", composition.id);

    const renderDir = path.join(process.cwd(), "public", "renders");
    await mkdir(renderDir, { recursive: true });
    const renderId = randomUUID();
    const outputLocation = path.join(renderDir, `${renderId}.mp4`);

    console.log("Rendering media to:", outputLocation);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps: { project },
      imageFormat: "jpeg",
      chromiumOptions: { disableWebSecurity: true },
      browserExecutable: chromePath,
      verbose: true,
    });
    console.log("Success! Rendered at:", outputLocation);
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    if (assetServer) {
      assetServer.close();
      console.log("Temp asset server closed");
    }
  }
}

main();
