import { createCanvas, loadImage } from "@napi-rs/canvas";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.join(__dirname, "../assets/social_media_template.png");

// Dotted content box coordinates (measured from template 1254×1254)
const BOX = { x: 106, y: 415, w: 1041, h: 520 };
const PAD = 80;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateShareCard(subject) {
  const img = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const maxW = BOX.w - PAD * 2;
  const textAreaH = BOX.h - PAD * 2;
  const textX = BOX.x + BOX.w / 2;
  const textAreaTop = BOX.y + PAD;

  ctx.fillStyle = "#2E2E2E";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let fontSize = 60;
  let lines;
  do {
    fontSize -= 4;
    ctx.font = `500 ${fontSize}px sans-serif`;
    lines = wrapText(ctx, subject.trim(), maxW);
  } while (lines.length * fontSize * 1.3 > textAreaH && fontSize > 22);

  const lineH = fontSize * 1.3;
  const totalH = lines.length * lineH;
  const startY = textAreaTop + (textAreaH - totalH) / 2 + lineH / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineH);
  });

  return canvas.toBuffer("image/png");
}
