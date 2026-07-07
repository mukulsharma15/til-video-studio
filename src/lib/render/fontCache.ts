import fs from "node:fs";
import path from "node:path";
import https from "node:https";

export type FontConfig = {
  family: string;
  query: string;
  files: Array<{ style: string; weight: string; file: string }>;
};

const FONTS_TO_LOAD: FontConfig[] = [
  { family: "Playfair Display", query: ":ital,wght@0,400;0,800;1,400;1,800", files: [
      { style: "normal", weight: "400", file: "PlayfairDisplay-Regular.ttf" },
      { style: "normal", weight: "800", file: "PlayfairDisplay-Bold.ttf" },
      { style: "italic", weight: "400", file: "PlayfairDisplay-Italic.ttf" },
    ]
  },
  { family: "Instrument Serif", query: ":ital,wght@0,400;1,400", files: [
      { style: "normal", weight: "400", file: "InstrumentSerif-Regular.ttf" },
      { style: "italic", weight: "400", file: "InstrumentSerif-Italic.ttf" },
    ]
  },
  { family: "Libre Baskerville", query: ":ital,wght@0,400;0,700;1,400", files: [
      { style: "normal", weight: "400", file: "LibreBaskerville-Regular.ttf" },
      { style: "normal", weight: "700", file: "LibreBaskerville-Bold.ttf" },
      { style: "italic", weight: "400", file: "LibreBaskerville-Italic.ttf" },
    ]
  },
  { family: "Bebas Neue", query: "", files: [
      { style: "normal", weight: "400", file: "BebasNeue-Regular.ttf" },
    ]
  },
  { family: "Oswald", query: ":wght@400;700", files: [
      { style: "normal", weight: "400", file: "Oswald-Regular.ttf" },
      { style: "normal", weight: "700", file: "Oswald-Bold.ttf" },
    ]
  },
  { family: "Instrument Sans", query: ":ital,wght@0,400;0,700", files: [
      { style: "normal", weight: "400", file: "InstrumentSans-Regular.ttf" },
      { style: "normal", weight: "700", file: "InstrumentSans-Bold.ttf" },
    ]
  },
  { family: "Cormorant Garamond", query: ":ital,wght@0,400;0,700;1,400", files: [
      { style: "normal", weight: "400", file: "CormorantGaramond-Regular.ttf" },
      { style: "normal", weight: "700", file: "CormorantGaramond-Bold.ttf" },
      { style: "italic", weight: "400", file: "CormorantGaramond-Italic.ttf" },
    ]
  },
  { family: "DM Serif Display", query: ":ital,wght@0,400;1,400", files: [
      { style: "normal", weight: "400", file: "DMSerifDisplay-Regular.ttf" },
      { style: "italic", weight: "400", file: "DMSerifDisplay-Italic.ttf" },
    ]
  },
  { family: "Lora", query: ":ital,wght@0,400;0,700;1,400", files: [
      { style: "normal", weight: "400", file: "Lora-Regular.ttf" },
      { style: "normal", weight: "700", file: "Lora-Bold.ttf" },
      { style: "italic", weight: "400", file: "Lora-Italic.ttf" },
    ]
  },
  { family: "Anton", query: "", files: [
      { style: "normal", weight: "400", file: "Anton-Regular.ttf" },
    ]
  },
  { family: "Archivo Black", query: "", files: [
      { style: "normal", weight: "400", file: "ArchivoBlack-Regular.ttf" },
    ]
  },
  { family: "Space Grotesk", query: ":wght@400;700", files: [
      { style: "normal", weight: "400", file: "SpaceGrotesk-Regular.ttf" },
      { style: "normal", weight: "700", file: "SpaceGrotesk-Bold.ttf" },
    ]
  },
  { family: "Inter", query: ":wght@400;700", files: [
      { style: "normal", weight: "400", file: "Inter-Regular.ttf" },
      { style: "normal", weight: "700", file: "Inter-Bold.ttf" },
    ]
  },
];

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

function getFontCss(family: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}${query}`;
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

let fontsReady = false;
let fontsLoading: Promise<void> | null = null;

export async function ensureFonts(): Promise<void> {
  if (fontsReady) return;
  if (fontsLoading) return fontsLoading;

  fontsLoading = (async () => {
    fs.mkdirSync(FONTS_DIR, { recursive: true });

    // 1. Clean up any invalid/corrupted files (e.g. 404 HTML pages downloaded previously)
    if (fs.existsSync(FONTS_DIR)) {
      const files = fs.readdirSync(FONTS_DIR);
      for (const file of files) {
        const filePath = path.join(FONTS_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && stats.size < 5000) {
          console.log(`[FontCache] Removing corrupted or invalid font file: ${file}`);
          fs.unlinkSync(filePath);
        }
      }
    }

    // 2. Scan and download missing fonts dynamically
    for (const font of FONTS_TO_LOAD) {
      const missingFiles = font.files.filter((f) => !fs.existsSync(path.join(FONTS_DIR, f.file)));
      if (missingFiles.length === 0) continue;

      try {
        console.log(`[FontCache] Resolving URLs for "${font.family}"...`);
        const css = await getFontCss(font.family, font.query);
        const fontFaces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];

        const faceMap = new Map<string, string>(); // key: "style-weight", val: url
        for (const face of fontFaces) {
          const content = face[1];
          const style = content.match(/font-style:\s*([^;]+)/)?.[1].trim() ?? "normal";
          const weight = content.match(/font-weight:\s*([^;]+)/)?.[1].trim() ?? "400";
          const url = content.match(/url\((https:[^)]+\.(?:ttf|woff2))\)/)?.[1];
          if (url) {
            faceMap.set(`${style}-${weight}`, url);
          }
        }

        // Download missing files
        await Promise.all(
          missingFiles.map(async (f) => {
            const url = faceMap.get(`${f.style}-${f.weight}`) || faceMap.get(`normal-${f.weight}`) || faceMap.values().next().value;
            if (url) {
              const ext = url.endsWith(".woff2") ? ".woff2" : ".ttf";
              const actualFile = f.file.replace(/\.(ttf|woff2)$/, ext);
              const dest = path.join(FONTS_DIR, actualFile);
              console.log(`[FontCache] Downloading ${actualFile} from Google Fonts...`);
              await downloadFile(url, dest);
            } else {
              console.warn(`[FontCache] Could not resolve URL for ${f.file}`);
            }
          })
        );
      } catch (err) {
        console.error(`[FontCache] Failed to load family "${font.family}":`, err);
      }
    }

    fontsReady = true;
  })();

  return fontsLoading;
}

export function getFontPath(file: string): string {
  return path.join(FONTS_DIR, file);
}

export const FONT_DOWNLOADS = FONTS_TO_LOAD.flatMap((font) =>
  font.files.map((file) => ({
    family: font.family,
    file: file.file,
  }))
);
