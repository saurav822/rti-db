import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.join(__dirname, "../assets/social_media_template.png");

export function generateShareCard() {
  return readFileSync(TEMPLATE_PATH);
}
