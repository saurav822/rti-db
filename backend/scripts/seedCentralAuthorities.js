import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JSON_PATH = path.join(
  __dirname,
  "../python/autofill/portal_authorities.json"
);

async function seed() {
  const raw = JSON.parse(readFileSync(JSON_PATH, "utf-8"));

  const seen = new Set();
  const rows = [];
  for (const ministry of raw.ministries) {
    for (const auth of ministry.authorities) {
      if (seen.has(auth.id)) continue;
      seen.add(auth.id);
      rows.push({
        authority_id: auth.id,
        authority_label: auth.label.trim(),
        ministry_id: ministry.ministry_id,
        ministry_label: ministry.ministry_label.trim(),
      });
    }
  }
  console.log(`(${raw.ministries.length * 1} ministries, ${rows.length} unique authorities after dedup)`);

  console.log(`Seeding ${rows.length} authorities across ${raw.ministries.length} ministries…`);

  // Upsert in batches of 500
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("rti_central_authorities")
      .upsert(batch, { onConflict: "authority_id" });
    if (error) { console.error("Batch error:", error); process.exit(1); }
    console.log(`  inserted rows ${i + 1}–${Math.min(i + BATCH, rows.length)}`);
  }

  console.log("Done.");
}

seed().catch((e) => { console.error(e); process.exit(1); });
