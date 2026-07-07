import { Img, staticFile } from "remotion";

export function LogoBug({ logoOn }: { logoOn: boolean; accentColor: string }) {
  if (!logoOn) return null;
  
  return (
    <div style={{ position: "absolute", top: 64, right: 64 }}>
      <Img
        src={staticFile("logo.png")}
        style={{
          height: 100,
          width: "auto",
          filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.65))",
        }}
        alt="The Indic League Logo Watermark"
      />
    </div>
  );
}
