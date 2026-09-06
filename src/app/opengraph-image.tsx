import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

export const runtime = "nodejs";
export const alt = "smile compass ― 住まい探しに、笑顔のコンパスを。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1A2420";
const ACCENT = "#E8654A";
const CREAM = "#FBF6EC";
const BACKGROUND = "#F7F6F2";

const CHARACTER_FACES = [
  { file: "realtor-dog-face.png", alt: "不動産屋" },
  { file: "legal-owl-face.png", alt: "宅建士" },
  { file: "inspector-mole-face.png", alt: "住宅診断士" },
  { file: "fp-squirrel-face.png", alt: "FP" },
];

/** キャラクターの顔アイコンをOGP画像に埋め込めるサイズまで縮小し、data URLにする */
async function loadCharacterFaceDataUrl(fileName: string): Promise<string> {
  const filePath = join(process.cwd(), "public", "characters", "tab-icons", fileName);
  const buffer = readFileSync(filePath);
  const resized = await sharp(buffer).resize(192, 192).png().toBuffer();
  return `data:image/png;base64,${resized.toString("base64")}`;
}

function loadFont(fileName: string): Buffer {
  return readFileSync(join(process.cwd(), "src", "app", "opengraph-fonts", fileName));
}

export default async function OpengraphImage() {
  const [characterFaces, shipporiMincho, notoSansJp] = await Promise.all([
    Promise.all(CHARACTER_FACES.map(async (c) => ({ ...c, dataUrl: await loadCharacterFaceDataUrl(c.file) }))),
    loadFont("ShipporiMincho-800-subset.woff"),
    loadFont("NotoSansJP-700-subset.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BACKGROUND,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <svg width="200" height="200" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill={CREAM} stroke={INK} strokeWidth="4" />
            <line x1="50" y1="9" x2="50" y2="17" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <line x1="91" y1="50" x2="83" y2="50" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="91" x2="50" y2="83" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <line x1="9" y1="50" x2="17" y2="50" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <polygon points="50,28 64,56 36,56" fill={ACCENT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <circle cx="40" cy="64" r="3.6" fill={INK} />
            <circle cx="60" cy="64" r="3.6" fill={INK} />
            <path d="M38 74 Q50 83 62 74" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
          </svg>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Shippori Mincho", fontSize: 86, color: INK }}>
              smile compass
            </div>
            <div style={{ display: "flex", fontFamily: "Noto Sans JP", fontSize: 32, color: INK, marginTop: 16 }}>
              住まい探しに、笑顔のコンパスを。
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, marginTop: 64 }}>
          {characterFaces.map((face) => (
            <div
              key={face.file}
              style={{
                display: "flex",
                width: 96,
                height: 96,
                borderRadius: 48,
                overflow: "hidden",
                border: `3px solid ${INK}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) requires a plain <img>, not next/image */}
              <img src={face.dataUrl} width={96} height={96} alt={face.alt} style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Shippori Mincho", data: shipporiMincho, weight: 800, style: "normal" },
        { name: "Noto Sans JP", data: notoSansJp, weight: 700, style: "normal" },
      ],
    },
  );
}
