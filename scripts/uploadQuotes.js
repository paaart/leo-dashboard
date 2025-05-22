import "dotenv/config";
import * as fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const distanceMap = JSON.parse(
  fs.readFileSync("scripts/transport_distances.json", "utf-8")
);

const rows = [];

for (const source in distanceMap) {
  for (const destination in distanceMap[source]) {
    const distance = distanceMap[source][destination];
    rows.push({
      source: source.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      distance: Number(distance),
    });
  }
}

async function uploadDistances() {
  console.log(`🚀 Uploading ${rows.length} distances to Supabase...`);

  const { error } = await supabase
    .from("transport_distances")
    .upsert(rows, { onConflict: ["source", "destination"] });

  if (error) {
    console.error("❌ Upload failed:", error.message);
  } else {
    console.log("✅ Upload successful. Distances inserted or updated.");
  }
}

uploadDistances();
