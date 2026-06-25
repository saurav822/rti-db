import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.join(__dirname, "../assets/social_media_template.png");

const BOX = { x: 106, y: 415, w: 1041, h: 520 };
const PAD = 80;

// Approximate character width for sans-serif at a given font size
function estimateWidth(text, fontSize) {
  return text.length * fontSize * 0.55;
}

function wrapText(text, maxWidth, fontSize) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (estimateWidth(test, fontSize) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function generateShareCard(subject) {
  const maxW = BOX.w - PAD * 2;
  const textAreaH = BOX.h - PAD * 2;

  let fontSize = 60;
  let lines;
  do {
    fontSize -= 4;
    lines = wrapText(subject.trim(), maxW, fontSize);
  } while (lines.length * fontSize * 1.3 > textAreaH && fontSize > 22);

  const lineH = fontSize * 1.3;
  const totalH = lines.length * lineH;
  const textX = BOX.w / 2;
  const startY = PAD + (textAreaH - totalH) / 2 + lineH / 2;

  const tspans = lines
    .map((line, i) => `<tspan x="${textX}" dy="${i === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `<svg width="${BOX.w}" height="${BOX.h}" xmlns="http://www.w3.org/2000/svg">
  <text x="${textX}" y="${startY}" font-family="sans-serif" font-size="${fontSize}" font-weight="500" fill="#2E2E2E" text-anchor="middle">${tspans}</text>
</svg>`;

  return sharp(TEMPLATE_PATH)
    .composite([{ input: Buffer.from(svg), top: BOX.y, left: BOX.x }])
    .png()
    .toBuffer();
}
